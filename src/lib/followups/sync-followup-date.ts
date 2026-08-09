import type { SupabaseClient } from "@supabase/supabase-js";

export interface SyncFollowupResult {
  synced: boolean;
  reason?: string;
}

export async function syncFollowupDate(
  supabase: SupabaseClient,
  opts: {
    prospectId: string;
    userId: string;
    dateTimeIso: string | null;
  },
): Promise<SyncFollowupResult> {
  const { data: prospect } = await supabase
    .from("prospects")
    .select("contact_id")
    .eq("id", opts.prospectId)
    .eq("user_id", opts.userId)
    .single();

  if (!prospect?.contact_id) {
    return { synced: false, reason: "no_linked_contact" };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", prospect.contact_id)
    .eq("user_id", opts.userId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    return { synced: false, reason: "no_active_conversation" };
  }

  if (opts.dateTimeIso) {
    const { data: existingEvent } = await supabase
      .from("scheduled_events")
      .select("id")
      .eq("conversation_id", conversation.id)
      .is("executed_at", null)
      .eq("cancelled", false)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      await supabase
        .from("scheduled_events")
        .update({ scheduled_at: opts.dateTimeIso })
        .eq("id", existingEvent.id);
    } else {
      await supabase.from("scheduled_events").insert({
        conversation_id: conversation.id,
        type: "followup",
        scheduled_at: opts.dateTimeIso,
      });
    }

    await supabase
      .from("conversations")
      .update({ next_followup_at: opts.dateTimeIso })
      .eq("id", conversation.id);
  } else {
    await supabase
      .from("scheduled_events")
      .update({ cancelled: true })
      .eq("conversation_id", conversation.id)
      .is("executed_at", null)
      .eq("cancelled", false);

    await supabase
      .from("conversations")
      .update({ next_followup_at: null })
      .eq("id", conversation.id);
  }

  return { synced: true };
}
