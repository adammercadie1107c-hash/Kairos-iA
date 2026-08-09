import type { SupabaseClient } from "@supabase/supabase-js";

export interface EnsureFollowupOpts {
  conversationId: string;
  contactId: string;
  userId: string;
  maxFollowups: number;
  currentFollowupCount: number;
}

export interface EnsureFollowupResult {
  scheduled: boolean;
  reason?: string;
}

export async function ensureFollowupScheduled(
  supabase: SupabaseClient,
  opts: EnsureFollowupOpts,
): Promise<EnsureFollowupResult> {
  if (opts.currentFollowupCount >= opts.maxFollowups) {
    return { scheduled: false, reason: "max_followups_reached" };
  }

  const { data: existingPending } = await supabase
    .from("scheduled_events")
    .select("id")
    .eq("conversation_id", opts.conversationId)
    .is("executed_at", null)
    .eq("cancelled", false)
    .limit(1)
    .maybeSingle();

  if (existingPending) {
    return { scheduled: false, reason: "event_already_pending" };
  }

  const followupDate = new Date();
  followupDate.setHours(followupDate.getHours() + 24);
  const followupIso = followupDate.toISOString();

  await supabase.from("scheduled_events").insert({
    conversation_id: opts.conversationId,
    type: "followup",
    scheduled_at: followupIso,
  });

  await supabase
    .from("conversations")
    .update({ next_followup_at: followupIso })
    .eq("id", opts.conversationId);

  await supabase
    .from("prospects")
    .update({
      next_followup_at: followupDate.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", opts.contactId)
    .eq("user_id", opts.userId);

  return { scheduled: true };
}
