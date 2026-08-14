"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { z } from "zod";

const FaqItemSchema = z.object({
  q: z.string().min(1, "La question est requise"),
  a: z.string().min(1, "La réponse est requise"),
});

const AgentConfigSchema = z.object({
  business_name: z.string().min(1, "Le nom de l'activité est requis"),
  business_description: z.string().min(1, "La description est requise"),
  offer: z.string().min(1, "L'offre est requise"),
  tone: z.string().min(1, "Le ton est requis"),
  faq: z.array(FaqItemSchema),
  qualification_questions: z.array(z.string().min(1)),
  required_qualification_fields: z.array(z.string().min(1)),
  qualification_rules: z.record(z.string(), z.unknown()),
  booking_link: z.union([z.string().url("Le lien doit être une URL valide"), z.literal("")]),
  booking_message: z.string().min(1, "Le message de réservation est requis"),
  max_followups: z.number().int().min(0).max(5),
});

export type AgentConfigFormState = {
  error?: string;
  success?: boolean;
};

export async function saveAgentConfig(
  _prev: AgentConfigFormState,
  formData: FormData,
): Promise<AgentConfigFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const rawFaq = formData.get("faq") as string;
  const rawQuestions = formData.get("qualification_questions") as string;
  const rawFields = formData.get("required_qualification_fields") as string;
  const rawRules = formData.get("qualification_rules") as string;

  let faq: unknown[] = [];
  let qualificationQuestions: unknown[] = [];
  let requiredFields: unknown[] = [];
  let qualificationRules: Record<string, unknown> = {};

  try {
    faq = rawFaq ? JSON.parse(rawFaq) : [];
    qualificationQuestions = rawQuestions ? JSON.parse(rawQuestions) : [];
    requiredFields = rawFields ? JSON.parse(rawFields) : [];
    qualificationRules = rawRules ? JSON.parse(rawRules) : {};
  } catch {
    return { error: "Format JSON invalide dans l'un des champs" };
  }

  const input = {
    business_name: formData.get("business_name"),
    business_description: formData.get("business_description"),
    offer: formData.get("offer"),
    tone: formData.get("tone"),
    faq,
    qualification_questions: qualificationQuestions,
    required_qualification_fields: requiredFields,
    qualification_rules: qualificationRules,
    booking_link: formData.get("booking_link") || "",
    booking_message: formData.get("booking_message"),
    max_followups: Number(formData.get("max_followups")),
  };

  const parsed = z.safeParse(AgentConfigSchema, input);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Données invalides" };
  }

  const { data: existing } = await supabase
    .from("agent_configs")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const dbOp = existing
    ? supabase
        .from("agent_configs")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
    : supabase
        .from("agent_configs")
        .insert({ user_id: user.id, ...parsed.data });

  const { error } = await dbOp;

  if (error) {
    return { error: "Erreur lors de la sauvegarde : " + error.message };
  }

  trackServerEvent(user.id, AnalyticsEvents.AGENT_CONFIGURED);

  revalidatePath("/agent");
  return { success: true };
}
