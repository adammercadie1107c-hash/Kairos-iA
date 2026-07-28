import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { todayDateStr, addDaysDateStr } from "@/lib/utils";
import type { Prospect } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { FollowupList } from "./followup-list";

export const metadata: Metadata = { title: "Relances — Kairos iA" };

export default async function RelancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todayStr = todayDateStr();
  const in7daysStr = addDaysDateStr(7);

  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .not("next_followup_at", "is", null)
    .not("status", "in", '("gagne","perdu")')
    .lte("next_followup_at", in7daysStr)
    .order("next_followup_at", { ascending: true });

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-lg font-bold text-gray-900">Relances</h1>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const prospects = (data ?? []) as Prospect[];

  const overdue = prospects.filter(
    (p) => p.next_followup_at! < todayStr,
  );
  const today = prospects.filter(
    (p) => p.next_followup_at === todayStr,
  );
  const upcoming = prospects.filter(
    (p) => p.next_followup_at! > todayStr,
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <h1 className="text-lg font-bold text-gray-900">Relances</h1>
      <p className="mt-1 text-sm text-gray-500">
        Suivez vos relances à venir et en retard.
      </p>
      <div className="mt-6">
        <FollowupList overdue={overdue} today={today} upcoming={upcoming} />
      </div>
    </div>
  );
}
