"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProspectStatus } from "@/lib/supabase/types";

const VALID_STATUSES: ProspectStatus[] = [
  "nouveau",
  "contacte",
  "a_relancer",
  "gagne",
  "perdu",
];

function isValidStatus(s: string): s is ProspectStatus {
  return VALID_STATUSES.includes(s as ProspectStatus);
}

export async function createProspect(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const status = formData.get("status") as string;
  if (!isValidStatus(status)) return { error: "Statut invalide" };

  const nextFollowup = formData.get("next_followup_at") as string;

  const { error } = await supabase.from("prospects").insert({
    user_id: user.id,
    first_name: (formData.get("first_name") as string)?.trim() ?? "",
    last_name: (formData.get("last_name") as string)?.trim() ?? "",
    company: (formData.get("company") as string)?.trim() ?? "",
    email: (formData.get("email") as string)?.trim() ?? "",
    phone: (formData.get("phone") as string)?.trim() ?? "",
    status,
    next_followup_at: nextFollowup || null,
    notes: (formData.get("notes") as string)?.trim() ?? "",
  });

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return { success: true };
}

export async function updateProspect(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const status = formData.get("status") as string;
  if (!isValidStatus(status)) return { error: "Statut invalide" };

  const nextFollowup = formData.get("next_followup_at") as string;

  const { error } = await supabase
    .from("prospects")
    .update({
      first_name: (formData.get("first_name") as string)?.trim() ?? "",
      last_name: (formData.get("last_name") as string)?.trim() ?? "",
      company: (formData.get("company") as string)?.trim() ?? "",
      email: (formData.get("email") as string)?.trim() ?? "",
      phone: (formData.get("phone") as string)?.trim() ?? "",
      status,
      next_followup_at: nextFollowup || null,
      notes: (formData.get("notes") as string)?.trim() ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return { success: true };
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/prospects");
  return { success: true };
}
