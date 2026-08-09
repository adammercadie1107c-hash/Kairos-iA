"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canTransitionStatus } from "@/lib/conversations/status-machine";
import type { ConversationStatus } from "@/lib/supabase/types";

const COMMERCIAL_STATUSES: ConversationStatus[] = ["qualified", "booking_sent"];

export async function toggleAi(conversationId: string, enable: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const updates: Record<string, unknown> = { ai_enabled: enable };
  if (!enable) {
    updates.status = "handoff";
  } else {
    const { data: conv } = await supabase
      .from("conversations")
      .select("status")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();
    if (conv?.status === "handoff") {
      updates.status = "qualifying";
    }
  }

  await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId)
    .eq("user_id", user.id);

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function sendHumanMessage(
  conversationId: string,
  content: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!content.trim()) return { error: "Message vide" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, status, ai_enabled")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return { error: "Conversation introuvable" };

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "human",
    content: content.trim(),
    metadata: { handoff_reason: "Réponse manuelle du coach" },
  });

  // Cancel all pending followup events
  await supabase
    .from("scheduled_events")
    .update({ cancelled: true })
    .eq("conversation_id", conversationId)
    .is("executed_at", null)
    .eq("cancelled", false);

  const updates: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    ai_enabled: false,
    next_followup_at: null,
  };

  const currentStatus = conv.status as ConversationStatus;
  if (!COMMERCIAL_STATUSES.includes(currentStatus)) {
    updates.status = "handoff";
  }

  await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId)
    .eq("user_id", user.id);

  // Clean prospect next_followup_at (keep last_followup_at untouched)
  const { data: convData } = await supabase
    .from("conversations")
    .select("contact_id")
    .eq("id", conversationId)
    .single();

  if (convData?.contact_id) {
    await supabase
      .from("prospects")
      .update({ next_followup_at: null, updated_at: new Date().toISOString() })
      .eq("contact_id", convData.contact_id)
      .eq("user_id", user.id);
  }

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function updateConversationStatus(
  conversationId: string,
  status: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("status")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return { error: "Conversation introuvable" };

  const current = conv.status as ConversationStatus;
  const next = status as ConversationStatus;

  if (!canTransitionStatus(current, next, true)) {
    return { error: `Transition ${current} → ${next} non autorisée` };
  }

  await supabase
    .from("conversations")
    .update({ status })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return { error: "Conversation introuvable" };

  // FK-safe order: child tables first
  await supabase
    .from("agent_logs")
    .delete()
    .eq("conversation_id", conversationId);

  await supabase
    .from("scheduled_events")
    .delete()
    .eq("conversation_id", conversationId);

  await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (conv.contact_id) {
    await supabase
      .from("prospects")
      .delete()
      .eq("contact_id", conv.contact_id)
      .eq("user_id", user.id);
  }

  await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (conv.contact_id) {
    const { data: otherConvs } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", conv.contact_id)
      .eq("user_id", user.id)
      .limit(1);

    if (!otherConvs || otherConvs.length === 0) {
      await supabase
        .from("contacts")
        .delete()
        .eq("id", conv.contact_id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect("/inbox");
}
