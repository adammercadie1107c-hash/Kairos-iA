import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifySignature } from "@/lib/instagram/verify";
import { sendInstagramMessage } from "@/lib/instagram/send";
import { runAgent } from "@/lib/agent/engine";
import { mergeExtractedInfo } from "@/lib/agent/merge-info";
import { canTransitionStatus } from "@/lib/conversations/status-machine";
import { syncContactToProspect } from "@/lib/sync/contact-to-prospect";
import { detectCommercialIntent } from "@/lib/sync/commercial-intent";
import { checkProspectFit } from "@/lib/agent/fit-check";
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

  if (!signatureValid) {
    console.warn("[webhook] invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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

function extractRecentAgentQuestions(messages: Message[]): string[] {
  const recent = messages.slice(-10);
  const questions: string[] = [];
  for (const msg of recent) {
    if (msg.role !== "agent") continue;
    const sentences = msg.content.split(/[.?!]+/).filter((s) => s.trim());
    for (const s of sentences) {
      if (s.includes("?") || s.trim().endsWith("?")) {
        questions.push(s.trim());
      }
    }
    if (msg.content.includes("?")) {
      const qMatches = msg.content.match(/[^.!]*\?/g);
      if (qMatches) {
        for (const q of qMatches) {
          const trimmed = q.trim();
          if (trimmed.length > 10 && !questions.includes(trimmed)) {
            questions.push(trimmed);
          }
        }
      }
    }
  }
  return questions.slice(-5);
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

  const igIds = (channels ?? []).map((c) => (c.credentials as Record<string, unknown>)?.instagram_user_id);
  console.log("[webhook] active IG channels found:", channels?.length ?? 0);
  console.log("[webhook] IG user IDs in DB:", igIds);
  console.log("[webhook] igAccountId from payload:", igAccountId);

  const channel = channels?.find(
    (item) =>
      String((item.credentials as Record<string, unknown>)?.instagram_user_id) === String(igAccountId),
  );

  console.log("[webhook] channel matched:", !!channel);

  if (!channel) {
    console.error(`No active Instagram channel for account ${igAccountId}`);
    return "channel_not_found";
  }

  const credentials = channel.credentials as unknown as InstagramCredentials;
  const userId = channel.user_id;

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

  const historyMessages = (history ?? []) as Message[];

  // Extract recent agent questions for anti-repetition
  const recentAgentQuestions = extractRecentAgentQuestions(historyMessages);

  // Run agent with qualification context
  const result = await runAgent(
    historyMessages,
    config as AgentConfig,
    {
      extractedInfo: contact.extracted_info ?? {},
      conversationStatus: conversation.status,
      recentAgentQuestions,
    },
  );

  const { decision } = result;

  // Deterministic fit gate: merge extracted_info first to evaluate latest state
  const latestInfo = decision.extracted_info && Object.keys(decision.extracted_info).length > 0
    ? mergeExtractedInfo(contact.extracted_info ?? {}, decision.extracted_info)
    : contact.extracted_info ?? {};

  const prospectFit = checkProspectFit({
    extractedInfo: latestInfo,
    offer: (config as AgentConfig).offer,
    qualificationRules: (config as AgentConfig).qualification_rules,
  });

  if (decision.action === "send_booking" && prospectFit !== "FIT") {
    console.warn(`[webhook] booking gate: blocked send_booking (fit=${prospectFit})`);
    decision.action = "reply";
    decision.reason_code = "not_a_fit";
    decision.new_status = prospectFit === "NOT_A_FIT" ? "disqualified" : undefined;
  }

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
    credentials.instagram_user_id,
    senderId,
    decision.message,
    credentials.access_token,
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

  // Create coach alert for request_human_confirmation
  if (decision.action === "request_human_confirmation") {
    const alertType = decision.reason_code === "commercial_unknown"
      ? "commercial_question"
      : "human_confirmation";

    await supabase.from("coach_alerts").insert({
      user_id: userId,
      conversation_id: conversationId,
      contact_id: contact.id,
      type: alertType,
      reason: decision.alert_reason ?? decision.handoff_reason ?? "Question nécessitant confirmation du coach",
      prospect_question: text,
      metadata: {
        reason_code: decision.reason_code,
        source: "instagram",
      },
    });
  }

  // Create coach alert on escalate/handoff
  if (decision.action === "escalate") {
    await supabase.from("coach_alerts").insert({
      user_id: userId,
      conversation_id: conversationId,
      contact_id: contact.id,
      type: "handoff",
      reason: decision.handoff_reason ?? "Demande humaine",
      prospect_question: text,
      metadata: {
        reason_code: decision.reason_code,
        source: "instagram",
      },
    });
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

  // Sync contact to CRM prospect on commercial intent
  const finalStatus = (updates.status as string) ?? conversation.status;
  const intent = detectCommercialIntent(decision, latestInfo, finalStatus);

  if (intent.hasIntent) {
    try {
      await syncContactToProspect(supabase, conversationId, userId, {
        prospectStatus: intent.prospectStatus,
      });
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
