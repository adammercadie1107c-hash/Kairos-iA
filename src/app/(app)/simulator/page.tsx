import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SimulatorChat } from "./simulator-chat";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Simulateur — Kairos iA" };

export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: config } = await supabase
    .from("agent_configs")
    .select("business_name")
    .eq("user_id", user.id)
    .single();

  const hasConfig = Boolean(config?.business_name);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Simulateur</h1>
        <p className="text-sm text-gray-500">
          Testez votre agent comme si vous étiez un prospect.
        </p>
      </div>
      {hasConfig ? (
        <SimulatorChat agentName={config!.business_name} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">
              Configurez d&apos;abord votre agent avant de le tester.
            </p>
            <a
              href="/agent"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              Aller à la configuration
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
