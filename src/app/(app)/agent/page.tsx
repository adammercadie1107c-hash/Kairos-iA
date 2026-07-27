import { createClient } from "@/lib/supabase/server";
import { AgentConfigForm } from "./agent-config-form";

export default async function AgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: config } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">
        Configuration de l&apos;agent
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Décrivez votre activité et votre offre. L&apos;agent utilisera ces
        informations pour répondre à vos prospects.
      </p>
      <div className="mt-6">
        <AgentConfigForm config={config} />
      </div>
    </div>
  );
}
