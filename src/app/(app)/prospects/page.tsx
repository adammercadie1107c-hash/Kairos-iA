import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeProspectScore, type ProspectScore } from "@/lib/prospects/scoring";
import type { Prospect } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { ProspectsTable } from "./prospects-table";

export const metadata: Metadata = { title: "Prospects — Kairos iA" };

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-lg font-bold text-gray-900">Prospects</h1>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Erreur lors du chargement des prospects : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const prospects = (data ?? []) as Prospect[];

  const contactIds = prospects
    .map((p) => p.contact_id)
    .filter((id): id is string => id !== null);

  const contactInfoMap: Record<string, Record<string, string>> = {};
  const convStatusMap: Record<string, string> = {};

  const contactToConvId: Record<string, string> = {};

  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, extracted_info")
      .in("id", contactIds);

    for (const c of contacts ?? []) {
      contactInfoMap[c.id] = c.extracted_info ?? {};
    }

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, contact_id, status")
      .eq("user_id", user.id)
      .in("contact_id", contactIds)
      .neq("status", "closed");

    for (const conv of conversations ?? []) {
      if (conv.contact_id && !convStatusMap[conv.contact_id]) {
        convStatusMap[conv.contact_id] = conv.status;
        contactToConvId[conv.contact_id] = conv.id;
      }
    }
  }

  const followupTimestamps: Record<string, string> = {};
  const convIds = Object.values(contactToConvId);
  if (convIds.length > 0) {
    const { data: pendingEvents } = await supabase
      .from("scheduled_events")
      .select("conversation_id, scheduled_at")
      .in("conversation_id", convIds)
      .is("executed_at", null)
      .eq("cancelled", false)
      .eq("type", "followup");

    const convToContact: Record<string, string> = {};
    for (const [contactId, convId] of Object.entries(contactToConvId)) {
      convToContact[convId] = contactId;
    }

    for (const evt of pendingEvents ?? []) {
      const contactId = convToContact[evt.conversation_id];
      if (!contactId) continue;
      const prospect = prospects.find((p) => p.contact_id === contactId);
      if (!prospect) continue;
      const existing = followupTimestamps[prospect.id];
      if (!existing || evt.scheduled_at < existing) {
        followupTimestamps[prospect.id] = evt.scheduled_at;
      }
    }
  }

  const scores: Record<string, ProspectScore> = {};
  for (const p of prospects) {
    const info = p.contact_id ? contactInfoMap[p.contact_id] ?? {} : {};
    const convStatus = p.contact_id ? convStatusMap[p.contact_id] ?? null : null;
    scores[p.id] = computeProspectScore(info, convStatus);
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-lg font-bold text-gray-900">Prospects</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gérez vos prospects et suivez vos relances.
      </p>
      <div className="mt-4">
        <ProspectsTable
          prospects={prospects}
          scores={scores}
          followupTimestamps={followupTimestamps}
          autoOpen={params.new === "1"}
        />
      </div>
    </div>
  );
}
