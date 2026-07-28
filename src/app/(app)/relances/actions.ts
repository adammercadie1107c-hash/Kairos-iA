"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markFollowedUp(
  prospectId: string,
  nextFollowupAt: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (nextFollowupAt) {
    const todayStr = new Date().toISOString().split("T")[0];
    if (nextFollowupAt < todayStr) {
      return { error: "La date de prochaine relance ne peut pas être dans le passé." };
    }
  }

  const newStatus = nextFollowupAt ? "a_relancer" : "contacte";

  const { error } = await supabase
    .from("prospects")
    .update({
      last_followup_at: new Date().toISOString(),
      next_followup_at: nextFollowupAt || null,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/relances");
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  return { success: true };
}
