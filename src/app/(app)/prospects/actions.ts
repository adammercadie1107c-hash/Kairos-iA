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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function validateForm(formData: FormData, existingId?: string): {
  ok: false;
  result: ActionResult;
} | {
  ok: true;
  fields: {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    status: ProspectStatus;
    next_followup_at: string | null;
    next_action: string | null;
    notes: string;
  };
} {
  const fieldErrors: Record<string, string> = {};

  const firstName = (formData.get("first_name") as string)?.trim() ?? "";
  const lastName = (formData.get("last_name") as string)?.trim() ?? "";
  const company = (formData.get("company") as string)?.trim() ?? "";
  const rawEmail = (formData.get("email") as string) ?? "";
  const email = rawEmail.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const status = formData.get("status") as string;
  const nextFollowup = (formData.get("next_followup_at") as string) ?? "";
  const nextAction = (formData.get("next_action") as string)?.trim() ?? "";
  const notes = (formData.get("notes") as string)?.trim() ?? "";

  if (!firstName) {
    fieldErrors.first_name = "Veuillez renseigner le prénom.";
  }

  if (!email) {
    fieldErrors.email = "Veuillez renseigner l'adresse email.";
  } else if (!EMAIL_RE.test(email)) {
    fieldErrors.email = "Saisissez une adresse email valide.";
  }

  if (!isValidStatus(status)) {
    fieldErrors.status = "Statut invalide.";
  }

  if (nextFollowup) {
    const todayStr = new Date().toISOString().split("T")[0];
    if (nextFollowup < todayStr) {
      fieldErrors.next_followup_at =
        "La date de prochaine relance ne peut pas être dans le passé.";
    }
  }

  if (nextAction.length > 200) {
    fieldErrors.next_action = "La prochaine action ne peut pas dépasser 200 caractères.";
  }

  if (notes.length > 1000) {
    fieldErrors.notes = "Les notes ne peuvent pas dépasser 1 000 caractères.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, result: { fieldErrors } };
  }

  return {
    ok: true,
    fields: {
      first_name: firstName,
      last_name: lastName,
      company,
      email,
      phone,
      status: status as ProspectStatus,
      next_followup_at: nextFollowup || null,
      next_action: nextAction || null,
      notes,
    },
  };
}

function isDuplicateEmailError(msg: string): boolean {
  return msg.includes("prospects_user_email_unique");
}

export async function createProspect(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const validation = validateForm(formData);
  if (!validation.ok) return validation.result;

  const { error } = await supabase.from("prospects").insert({
    user_id: user.id,
    ...validation.fields,
  });

  if (error) {
    if (isDuplicateEmailError(error.message)) {
      return { fieldErrors: { email: "Cet email est déjà utilisé par un autre prospect." } };
    }
    return { error: error.message };
  }

  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  revalidatePath("/relances");
  return { success: true };
}

export async function updateProspect(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const validation = validateForm(formData, id);
  if (!validation.ok) return validation.result;

  const { error } = await supabase
    .from("prospects")
    .update({
      ...validation.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isDuplicateEmailError(error.message)) {
      return { fieldErrors: { email: "Cet email est déjà utilisé par un autre prospect." } };
    }
    return { error: error.message };
  }

  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  revalidatePath("/relances");
  return { success: true };
}

export async function deleteProspect(id: string): Promise<ActionResult> {
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
  revalidatePath("/dashboard");
  revalidatePath("/relances");
  return { success: true };
}
