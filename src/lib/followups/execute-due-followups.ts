import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentConfig,
  Message,
  ScheduledEvent,
} from "@/lib/supabase/types";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { AnalyticsEvents } from "@/lib/analytics/events";
import type { FollowupTransport, SendFollowupResult } from "./transport";

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_TIMEOUT_MINUTES = 5;

const ACTIONABLE_STATUSES = [
  "new",
  "qualifying",
  "qualified",
  "booking_sent",
];

export interface ExecuteFollowupsOptions {
  batchSize?: number;
  maxAttempts?: number;
  lockTimeoutMinutes?: number;
}

export interface ExecuteFollowupsResult {
  found: number;
  claimed: number;
  executed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface FollowupContext {
  extractedInfo: Record<string, string>;
  conversationStatus: string;
}

export interface GenerateMessageFn {
  (
    history: Message[],
    config: AgentConfig,
    followupNumber: number,
    context?: FollowupContext,
  ): Promise<{ message: string }>;
}

export interface FollowupDeps {
  supabase: SupabaseClient;
  generateMessage: GenerateMessageFn;
  resolveTransport: (channelType: string) => FollowupTransport;
}

export async function executeDueFollowups(
  deps: FollowupDeps,
  options: ExecuteFollowupsOptions = {},
): Promise<ExecuteFollowupsResult> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    lockTimeoutMinutes = DEFAULT_LOCK_TIMEOUT_MINUTES,
  } = options;

  const { supabase } = deps;
  const now = new Date().toISOString();
  const lockExpiry = new Date(
    Date.now() - lockTimeoutMinutes * 60_000,
  ).toISOString();

  const result: ExecuteFollowupsResult = {
    found: 0,
    claimed: 0,
    executed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const { data: candidates } = await supabase
    .from("scheduled_events")
    .select("id")
    .eq("type", "followup")
    .lte("scheduled_at", now)
    .is("executed_at", null)
    .eq("cancelled", false)
    .lt("attempts_count", maxAttempts)
    .or(`processing_at.is.null,processing_at.lt.${lockExpiry}`)
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  if (!candidates || candidates.length === 0) return result;

  result.found = candidates.length;

  for (const candidate of candidates) {
    const claimed = await claimEvent(supabase, candidate.id, now, lockExpiry);
    if (!claimed) continue;

    result.claimed++;

    const outcome = await processEvent(deps, claimed);

    if (outcome === "executed") {
      result.executed++;
    } else if (outcome === "skipped") {
      result.skipped++;
    } else {
      result.failed++;
      result.errors.push(`event ${claimed.id}: ${outcome}`);
    }
  }

  return result;
}

async function claimEvent(
  supabase: SupabaseClient,
  eventId: string,
  now: string,
  lockExpiry: string,
): Promise<ScheduledEvent | null> {
  const { data } = await supabase
    .from("scheduled_events")
    .update({ processing_at: now })
    .eq("id", eventId)
    .is("executed_at", null)
    .eq("cancelled", false)
    .or(`processing_at.is.null,processing_at.lt.${lockExpiry}`)
    .select("*")
    .maybeSingle();

  return data as ScheduledEvent | null;
}

type ProcessOutcome = "executed" | "skipped" | string;

async function processEvent(
  deps: FollowupDeps,
  event: ScheduledEvent,
): Promise<ProcessOutcome> {
  const { supabase } = deps;

  try {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, user_id, contact_id, channel_id, status, ai_enabled, followup_count")
      .eq("id", event.conversation_id)
      .single();

    if (!conversation) {
      await cancelEvent(supabase, event.id, "conversation_not_found");
      return "skipped";
    }

    if (!conversation.ai_enabled) {
      await cancelEvent(supabase, event.id, "ai_disabled");
      return "skipped";
    }

    if (!ACTIONABLE_STATUSES.includes(conversation.status)) {
      await cancelEvent(supabase, event.id, `status_${conversation.status}`);
      return "skipped";
    }

    const { data: config } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("user_id", conversation.user_id)
      .single();

    if (!config) {
      await cancelEvent(supabase, event.id, "config_not_found");
      return "skipped";
    }

    const currentCount = conversation.followup_count ?? 0;
    if (currentCount >= (config as AgentConfig).max_followups) {
      await cancelEvent(supabase, event.id, "max_followups_reached");
      return "skipped";
    }

    const { data: channel } = await supabase
      .from("channels")
      .select("id, type, user_id")
      .eq("id", conversation.channel_id)
      .single();

    if (!channel) {
      await cancelEvent(supabase, event.id, "channel_not_found");
      return "skipped";
    }

    if (channel.user_id !== conversation.user_id) {
      await cancelEvent(supabase, event.id, "user_isolation_violated");
      return "skipped";
    }

    const transport = deps.resolveTransport(channel.type);

    const { data: contact } = await supabase
      .from("contacts")
      .select("id, display_name, external_id, user_id, extracted_info")
      .eq("id", conversation.contact_id)
      .single();

    if (!contact) {
      await cancelEvent(supabase, event.id, "contact_not_found");
      return "skipped";
    }

    if (contact.user_id !== conversation.user_id) {
      await cancelEvent(supabase, event.id, "user_isolation_violated");
      return "skipped";
    }

    const { data: inboundSince } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("role", "contact")
      .gte("created_at", event.created_at)
      .limit(1)
      .maybeSingle();

    if (inboundSince) {
      await cancelEvent(supabase, event.id, "contact_replied_since_scheduling");
      return "skipped";
    }

    const { data: history } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    const followupNumber = currentCount + 1;

    const followupContext: FollowupContext = {
      extractedInfo: (contact as Record<string, unknown>).extracted_info as Record<string, string> ?? {},
      conversationStatus: conversation.status as string,
    };

    let generated: { message: string };
    try {
      generated = await deps.generateMessage(
        (history ?? []) as Message[],
        config as AgentConfig,
        followupNumber,
        followupContext,
      );
    } catch (genErr) {
      const msg =
        genErr instanceof Error ? genErr.message : "generation_failed";
      await failEvent(supabase, event.id, msg);
      return `generation_failed: ${msg}`;
    }

    const sendResult: SendFollowupResult = await transport.send(
      {
        conversationId: conversation.id,
        content: generated.message,
        metadata: {
          action: "schedule_followup",
          reason_code: "followup_needed",
          confidence: 1.0,
          is_followup: true,
          followup_number: followupNumber,
        },
      },
      supabase,
    );

    if (!sendResult.delivered) {
      await failEvent(
        supabase,
        event.id,
        sendResult.error ?? "delivery_failed",
      );
      return sendResult.error ?? "delivery_failed";
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("scheduled_events")
      .update({ executed_at: nowIso, processing_at: null })
      .eq("id", event.id);

    trackServerEvent(conversation.user_id, AnalyticsEvents.FOLLOWUP_SENT, {
      conversation_id: conversation.id,
      followup_number: followupNumber,
    });

    // Schedule next followup in the chain if conditions are met
    let nextFollowupAt: string | null = null;

    if (
      followupNumber < (config as AgentConfig).max_followups &&
      conversation.ai_enabled &&
      ACTIONABLE_STATUSES.includes(conversation.status)
    ) {
      const { data: alreadyPending } = await supabase
        .from("scheduled_events")
        .select("id")
        .eq("conversation_id", conversation.id)
        .is("executed_at", null)
        .eq("cancelled", false)
        .limit(1)
        .maybeSingle();

      if (!alreadyPending) {
        const { data: replyAfterExec } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversation.id)
          .eq("role", "contact")
          .gte("created_at", nowIso)
          .limit(1)
          .maybeSingle();

        if (!replyAfterExec) {
          const nextDate = new Date(Date.now() + 72 * 3_600_000);
          nextFollowupAt = nextDate.toISOString();

          await supabase.from("scheduled_events").insert({
            conversation_id: conversation.id,
            type: "followup",
            scheduled_at: nextFollowupAt,
          });
        }
      }
    }

    await supabase
      .from("conversations")
      .update({
        followup_count: followupNumber,
        last_message_at: nowIso,
        next_followup_at: nextFollowupAt,
      })
      .eq("id", conversation.id);

    await supabase
      .from("prospects")
      .update({
        last_followup_at: nowIso,
        next_followup_at: nextFollowupAt
          ? nextFollowupAt.split("T")[0]
          : null,
        updated_at: nowIso,
      })
      .eq("contact_id", contact.id)
      .eq("user_id", conversation.user_id);

    return "executed";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unexpected_error";
    await failEvent(supabase, event.id, msg).catch(() => {});
    return msg;
  }
}

async function cancelEvent(
  supabase: SupabaseClient,
  eventId: string,
  reason: string,
): Promise<void> {
  await supabase
    .from("scheduled_events")
    .update({
      cancelled: true,
      processing_at: null,
      last_error: reason,
    })
    .eq("id", eventId);
}

async function failEvent(
  supabase: SupabaseClient,
  eventId: string,
  error: string,
): Promise<void> {
  await supabase
    .from("scheduled_events")
    .update({
      processing_at: null,
      attempts_count: (await getAttemptsCount(supabase, eventId)) + 1,
      last_error: error,
    })
    .eq("id", eventId);
}

async function getAttemptsCount(
  supabase: SupabaseClient,
  eventId: string,
): Promise<number> {
  const { data } = await supabase
    .from("scheduled_events")
    .select("attempts_count")
    .eq("id", eventId)
    .single();
  return data?.attempts_count ?? 0;
}
