"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveCookieConsent(accepted: boolean) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("cookie_consents").upsert(
      {
        user_id: user.id,
        analytics_accepted: accepted,
        consented_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    // non-critical
  }
}
