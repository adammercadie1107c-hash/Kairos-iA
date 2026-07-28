import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Prospect } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { ProspectsTable } from "./prospects-table";

export const metadata: Metadata = { title: "Prospects — Kairos iA" };

export default async function ProspectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-lg font-bold text-gray-900">Prospects</h1>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Erreur lors du chargement des prospects : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const prospects = (data ?? []) as Prospect[];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-lg font-bold text-gray-900">Prospects</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gerez vos prospects et suivez vos relances.
      </p>
      <div className="mt-4">
        <ProspectsTable prospects={prospects} />
      </div>
    </div>
  );
}
