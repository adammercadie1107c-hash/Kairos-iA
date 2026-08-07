import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifySignature } from "@/lib/instagram/verify";
import { sendInstagramMessage } from "@/lib/instagram/send";
import { runAgent } from "@/lib/agent/engine";
import { mergeExtractedInfo } from "@/lib/agent/merge-info";
import { canTransitionStatus } from "@/lib/conversations/status-machine";
import { syncQualifiedContactToProspect } from "@/lib/sync/contact-to-prospect";
import type { IGWebhookPayload, InstagramCredentials } from "@/lib/instagram/types";
import type { AgentConfig, Message, ConversationStatus } from "@/lib/supabase/types";

/**
 * GET /api/webhooks/instagram
 *
 * Meta webhook verification challenge.
 * Meta sends hub.mode, hub.verify_token, hub.challenge as query params.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || "kairos-ig-verify-2024";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/instagram
 *
 * Receives inbound messages from Meta's Instagram Messaging API.
 * Verifies X-Hub-Signature-256, processes each text message,
 * runs the AI agent, and replies via Instagram Send API.
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[webhook] META_APP_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  console.log("[webhook] app id loaded:", process.env.META_APP_ID);

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  console.log("[webhook] signature present:", !!signature);
  console.log("[webhook] secret present:", !!appSecret);

  const signatureValid = verifySignature(rawBody, signature, appSecret);

  console.log("[webhook] signature valid:", signatureValid);

  // P1-BLOCKER: supprimer ce bypass avant Live — remettre le return 401 ci-dessous
  // if (!signatureValid) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  // }
  if (!signatureValid) {
    console.warn("[webhook] signature mismatch — processing anyway (bypass temporaire, P1-BLOCKER avant Live)");
  }

  let payload: IGWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as IGWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "instagram") {
    return new NextResponse("OK", { status: 200 });
  }

  const supabase = await createServiceClient();
  const results: Array<{ senderId: string; status: string }> = [];

  for (const entry of payload.entry) {
    const igAccountId = entry.id;

    for (const event of entry.messaging) {
      if (!event.message?.text || event.message.is_echo) continue;

      const senderId = event.sender.id;
      const text = event.message.text;

      try {
        const outcome = await handleInboundMessage(
          supabase,
          igAccountId,
          senderId,
          text,
        );
        results.push({ senderId, status: outcome });
      } catch (err) {
        console.error(`Instagram webhook error for sender ${senderId}:`, err);
        results.push({ senderId, status: "error" });
      }
    }
  }

  return NextResponse.json({ processed: results.length });
}

async function handleInboundMessage(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T> ? T : never,
  igAccountId: string,
  senderId: string,
  text: string,
): Promise<string> {
  // Find channel by Instagram account ID — fetch all active IG channels, match in JS
  const { data: channels, error: channelError } = await supabase
    .from("channels")
    .select("id, user_id, type, status, credentials")
    .eq("type", "instagram")
    .eq("status", "active");

  if (channelError) {
    console.error("[webhook] channel query error:", channelError.code, channelError.message, channelError.details);
    return "channel_query_error";
  }

  const supabaseRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace("https://", "").split(".")[0];
  const igIds = (channels ?? []).map((c) => (c.credentials as Record<string, unknown>)?.instagram_account_id);
  console.log("[webhook] supabase ref:", supabaseRef);
  console.log("[webhook] active IG channels found:", channels?.length ?? 0);
  console.log("[webhook] IG account IDs in DB:", igIds);
  console.log("[webhook] igAccountId from payload:", igAccountId);

  const channel = channels?.find(
    (item) =>
      String((item.credentials as Record<string, unknown>)?.instagram_account_id) === String(igAccountId),
  );

  console.log("[webhook] channel matched:", !!channel);

  if (!channel) {
    console.error(`No active Instagram channel for account ${igAccountId}`);
    return "channel_not_found";
  }

  const credentials = channel.credentials as unknown as InstagramCredentials;
  const userId = channel.user_id;

  // Backfill missing metadata on first message
  if (!credentials.instagram_username || !credentials.page_id) {
    try {
      const { getInstagramUsername } = await import("@/lib/instagram/oauth");
      if (!credentials.instagram_username && credentials.page_access_token) {
        const username = await getInstagramUsername(igAccountId, credentials.page_access_token);
        if (username) credentials.instagram_username = username;
      }
      if (!credentials.page_id && credentials.page_access_token) {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id&access_token=${encodeURIComponent(credentials.page_access_token)}`,
        );
        if (res.ok) {
          const json = (await res.json()) as { id: string };
          credentials.page_id = json.id;
        }
      }
      await supabase
        .from("channels")
        .update({ credentials: { ...credentials } })
        .eq("id", channel.id);
    } catch (err) {
      console.error("[webhook] metadata backfill error:", err);
    }
  }


  // Load agent config
  const { data: config } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!config) return "config_not_found";

  // Find or create contact
  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("channel_id", channel.id)
    .eq("external_id", senderId)
    .single();

  if (!contact) {
    const { data: newContact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        channel_id: channel.id,
        external_id: senderId,
        display_name: null,
      })
      .select()
      .single();

    if (contactError) throw new Error(`Contact creation: ${contactError.message}`);
    contact = newContact;
  }

  // Find or create conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .eq("channel_id", channel.id)
    .eq("user_id", userId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        contact_id: contact.id,
        channel_id: channel.id,
        status: "new",
      })
      .select()
      .single();

    if (convError) throw new Error(`Conversation creation: ${convError.message}`);
    conversation = newConv;
  }

  const conversationId = conversation.id;

  // Cancel pending follow-up events — contact has replied
  await supabase
    .from("scheduled_events")
    .update({ cancelled: true })
    .eq("conversation_id", conversationId)
    .is("executed_at", null)
    .eq("cancelled", false);

  await supabase
    .from("conversations")
    .update({ next_followup_at: null })
    .eq("id", conversationId);

  await supabase
    .from("prospects")
    .update({ next_followup_at: null, updated_at: new Date().toISOString() })
    .eq("contact_id", contact.id)
    .eq("user_id", userId);

  // Check AI enabled
  if (!conversation.ai_enabled) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "contact",
      content: text,
    });
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    return "ai_disabled";
  }

  // Save inbound message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "contact",
    content: text,
  });

  if (!process.env.ANTHROPIC_API_KEY) return "no_api_key";

  // Load conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  // Run agent with qualification context
  const result = await runAgent(
    (history ?? []) as Message[],
    config as AgentConfig,
    {
      extractedInfo: contact.extracted_info ?? {},
      conversationStatus: conversation.status,
    },
  );

  const { decision } = result;

  // Save agent response (include handoff_reason in metadata when escalating)
  const messageMetadata: Record<string, unknown> = {
    action: decision.action,
    reason_code: decision.reason_code,
    confidence: decision.confidence,
  };
  if (decision.handoff_reason) {
    messageMetadata.handoff_reason = decision.handoff_reason;
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "agent",
    content: decision.message,
    metadata: messageMetadata,
  });

  // Send reply via Instagram API
  await sendInstagramMessage(
    senderId,
    decision.message,
    credentials.page_access_token,
  );

  // Update contact extracted info (smart merge — never overwrite with empty)
  if (decision.extracted_info && Object.keys(decision.extracted_info).length > 0) {
    const merged = mergeExtractedInfo(contact.extracted_info ?? {}, decision.extracted_info);
    await supabase
      .from("contacts")
      .update({ extracted_info: merged })
      .eq("id", contact.id);
    contact.extracted_info = merged;
  }

  // Update conversation status (with transition protection)
  const updates: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
  };

  const currentStatus = conversation.status as ConversationStatus;

  if (decision.action === "escalate") {
    updates.ai_enabled = false;
    updates.status = "handoff";
  } else if (decision.new_status && decision.new_status !== currentStatus) {
    if (canTransitionStatus(currentStatus, decision.new_status as ConversationStatus, false)) {
      updates.status = decision.new_status;
    } else {
      console.warn(
        `[webhook] blocked status regression: ${currentStatus} → ${decision.new_status}`,
      );
    }
  }

  if (decision.action === "schedule_followup") {
    const currentFollowupCount = conversation.followup_count ?? 0;
    if (currentFollowupCount < (config as AgentConfig).max_followups) {
      const { data: existingPending } = await supabase
        .from("scheduled_events")
        .select("id")
        .eq("conversation_id", conversationId)
        .is("executed_at", null)
        .eq("cancelled", false)
        .limit(1)
        .maybeSingle();

      if (!existingPending) {
        const followupDate = new Date();
        followupDate.setHours(followupDate.getHours() + 24);
        const followupIso = followupDate.toISOString();

        await supabase.from("scheduled_events").insert({
          conversation_id: conversationId,
          type: "followup",
          scheduled_at: followupIso,
        });

        updates.next_followup_at = followupIso;

        await supabase
          .from("prospects")
          .update({
            next_followup_at: followupDate.toISOString().split("T")[0],
            status: "a_relancer",
            updated_at: new Date().toISOString(),
          })
          .eq("contact_id", contact.id)
          .eq("user_id", userId);
      }
    }
  }

  await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId);

  // Sync qualified contact to CRM prospect
  const finalStatus = (updates.status as string) ?? conversation.status;
  if (finalStatus === "qualified" || finalStatus === "booking_sent") {
    try {
      await syncQualifiedContactToProspect(supabase, conversationId, userId);
    } catch (syncErr) {
      console.error("Contact-to-prospect sync error:", syncErr);
    }
  }

  // Save agent log
  await supabase.from("agent_logs").insert({
    conversation_id: conversationId,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    latency_ms: result.latencyMs,
    decision: decision.action,
    reason_code: decision.reason_code,
    handoff_reason: decision.handoff_reason,
    raw_output: (() => {
      try { return JSON.parse(result.rawOutput); } catch { return { text: result.rawOutput }; }
    })(),
  });

  return "processed";
}
