"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface PilotFormData {
  first_name: string;
  email: string;
  instagram_handle: string;
  coaching_type: string;
  price_range: string;
  weekly_dms: string;
  current_process: string;
}

export async function submitPilotApplication(
  data: PilotFormData,
): Promise<{ success: boolean; error?: string }> {
  if (!data.first_name || !data.email || !data.instagram_handle || !data.coaching_type) {
    return { success: false, error: "Champs obligatoires manquants." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { success: false, error: "Adresse email invalide." };
  }

  try {
    const supabase = await createServiceClient();

    const { error: existingError, data: existing } = await supabase
      .from("pilot_applications")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: "Erreur lors de la vérification." };
    }

    if (existing) {
      return { success: false, error: "Une candidature avec cet email existe déjà." };
    }

    const { error } = await supabase.from("pilot_applications").insert({
      first_name: data.first_name,
      email: data.email,
      instagram_handle: data.instagram_handle,
      coaching_type: data.coaching_type,
      price_range: data.price_range || null,
      weekly_dms: data.weekly_dms || null,
      current_process: data.current_process || null,
    });

    if (error) {
      return { success: false, error: "Erreur lors de l'envoi. Réessayez." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erreur inattendue. Réessayez." };
  }
}
