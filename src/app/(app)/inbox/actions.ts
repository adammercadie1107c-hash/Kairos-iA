"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return { error: "Conversation introuvable" };

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "human",
    content: content.trim(),
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

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

  await supabase
    .from("conversations")
    .update({ status })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}
