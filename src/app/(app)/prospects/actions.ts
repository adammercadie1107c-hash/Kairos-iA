"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateContactInfo(
  contactId: string,
  info: Record<string, string>,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  if (!contact) return { error: "Contact introuvable" };

  await supabase
    .from("contacts")
    .update({ extracted_info: info })
    .eq("id", contactId)
    .eq("user_id", user.id);

  revalidatePath(`/prospects/${contactId}`);
  revalidatePath("/prospects");
  revalidatePath("/inbox");
}
