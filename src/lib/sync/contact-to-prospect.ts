import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationStatus } from "@/lib/supabase/types";

const QUALIFIED_STATUSES: ConversationStatus[] = ["qualified", "booking_sent"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INFO_KEY_MAP: Record<string, string> = {
  objectif: "objectif",
  objective: "objectif",
  goal: "objectif",
  budget: "budget",
  contraintes: "contraintes",
  constraints: "contraintes",
  contrainte: "contraintes",
  objections: "objections",
  objection: "objections",
  freins: "objections",
  motivation: "motivation",
  interet: "interet",
  interest: "interet",
  "niveau de motivation": "motivation",
  "niveau d'interet": "interet",
  "offre recherchee": "offre recherchee",
  offre: "offre recherchee",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase().trim();
  return INFO_KEY_MAP[lower] ?? lower;
}

export function extractEmail(info: Record<string, string>): string | null {
  for (const [key, val] of Object.entries(info)) {
    if (/e?-?mail/i.test(key) && EMAIL_RE.test(val.trim())) {
      return val.trim().toLowerCase();
    }
  }
  return null;
}

export function extractPhone(info: Record<string, string>): string | null {
  for (const [key, val] of Object.entries(info)) {
    if (/t[eé]l[eé]?phone?|phone|mobile|num[eé]ro/i.test(key) && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

export function buildNotes(info: Record<string, string>): string {
  const skipKeys = /e?-?mail|t[eé]l[eé]?phone?|phone|mobile|num[eé]ro|pr[eé]nom|nom|name/i;
  const lines: string[] = [];

  for (const [key, val] of Object.entries(info)) {
    if (skipKeys.test(key) || !val.trim()) continue;
    const label = normalizeKey(key);
    lines.push(`${label.charAt(0).toUpperCase() + label.slice(1)} : ${val.trim()}`);
  }

  return lines.join("\n");
}

export function splitName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export interface SyncResult {
  action: "created" | "updated" | "skipped";
  prospectId?: string;
  reason?: string;
}

export async function syncQualifiedContactToProspect(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<SyncResult> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, status, contact_id, user_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!conversation) {
    return { action: "skipped", reason: "conversation_not_found" };
  }

  if (!QUALIFIED_STATUSES.includes(conversation.status as ConversationStatus)) {
    return { action: "skipped", reason: "not_qualified" };
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, display_name, extracted_info, external_id")
    .eq("id", conversation.contact_id)
    .single();

  if (!contact) {
    return { action: "skipped", reason: "contact_not_found" };
  }

  const info: Record<string, string> = contact.extracted_info ?? {};
  const { first, last } = splitName(contact.display_name ?? "");
  const email = extractEmail(info);
  const phone = extractPhone(info);
  const notes = buildNotes(info);

  // 1. Look for existing prospect by contact_id
  const { data: byContact } = await supabase
    .from("prospects")
    .select("id, first_name, last_name, email, phone, notes, contact_id")
    .eq("user_id", userId)
    .eq("contact_id", contact.id)
    .maybeSingle();

  if (byContact) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (!byContact.first_name && first) updates.first_name = first;
    if (!byContact.last_name && last) updates.last_name = last;
    if (!byContact.email && email) updates.email = email;
    if (!byContact.phone && phone) updates.phone = phone;
    if (notes && !byContact.notes) updates.notes = notes;

    if (Object.keys(updates).length > 1) {
      await supabase
        .from("prospects")
        .update(updates)
        .eq("id", byContact.id)
        .eq("user_id", userId);
    }

    return { action: "updated", prospectId: byContact.id };
  }

  // 2. Look for existing prospect by email (if available)
  if (email) {
    const { data: byEmail } = await supabase
      .from("prospects")
      .select("id, first_name, last_name, phone, notes, contact_id")
      .eq("user_id", userId)
      .ilike("email", email)
      .is("contact_id", null)
      .maybeSingle();

    if (byEmail) {
      const updates: Record<string, unknown> = {
        contact_id: contact.id,
        updated_at: new Date().toISOString(),
      };
      if (!byEmail.first_name && first) updates.first_name = first;
      if (!byEmail.last_name && last) updates.last_name = last;
      if (!byEmail.phone && phone) updates.phone = phone;
      if (notes && !byEmail.notes) updates.notes = notes;

      await supabase
        .from("prospects")
        .update(updates)
        .eq("id", byEmail.id)
        .eq("user_id", userId);

      return { action: "updated", prospectId: byEmail.id };
    }
  }

  // 3. Create new prospect with auto-scheduled follow-up
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const { data: newProspect, error } = await supabase
    .from("prospects")
    .insert({
      user_id: userId,
      contact_id: contact.id,
      first_name: first,
      last_name: last,
      email,
      phone,
      status: "contacte",
      notes,
      next_action: "Contacter suite a la qualification IA",
      next_followup_at: tomorrow.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("prospects_user_contact_unique")) {
      return { action: "skipped", reason: "duplicate_contact" };
    }
    console.error("syncQualifiedContactToProspect insert error:", error.message);
    return { action: "skipped", reason: error.message };
  }

  return { action: "created", prospectId: newProspect.id };
}
