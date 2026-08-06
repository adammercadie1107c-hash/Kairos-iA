"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function disconnectInstagram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const service = await createServiceClient();

  const { error } = await service
    .from("channels")
    .update({ status: "inactive", credentials: {} })
    .eq("user_id", user.id)
    .eq("type", "instagram");

  if (error) {
    return { error: "Erreur lors de la déconnexion." };
  }

  return { success: true };
}
