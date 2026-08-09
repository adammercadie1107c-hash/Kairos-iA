import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, Camera, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisconnectButton } from "./disconnect-button";
import type { Channel } from "@/lib/supabase/types";
import type { InstagramCredentials } from "@/lib/instagram/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Canaux — Kairos iA" };

const channelMeta: Record<
  string,
  { label: string; icon: typeof MessageSquare; description: string }
> = {
  demo: {
    label: "Canal Démo",
    icon: MessageSquare,
    description: "Testez votre agent via le simulateur intégré.",
  },
  instagram: {
    label: "Instagram DM",
    icon: Camera,
    description: "Répondez automatiquement aux messages Instagram.",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    description: "Répondez automatiquement aux messages WhatsApp.",
  },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "Connecté", className: "bg-green-100 text-green-700" },
  inactive: { label: "Déconnecté", className: "bg-gray-100 text-gray-600" },
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
};

const oauthErrorMessages: Record<string, string> = {
  invalid_state: "Erreur de sécurité (CSRF). Veuillez réessayer.",
  no_code: "Code d'autorisation manquant.",
  token_exchange: "Échec de l'échange de token avec Instagram.",
  oauth_failed:
    "Erreur lors de la connexion Instagram. Vérifiez que votre compte est bien un compte professionnel (Business ou Creator).",
  not_professional:
    "Le compte Instagram doit être de type Business ou Creator.",
  db_error: "Erreur lors de la sauvegarde du canal. Réessayez.",
  access_denied: "Connexion annulée.",
  not_configured: "La configuration Instagram n'est pas encore activée.",
};

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  const allChannelTypes = ["demo", "instagram", "whatsapp"] as const;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <h1 className="text-lg font-bold text-gray-900">Canaux</h1>
      <p className="mt-1 text-sm text-gray-500">
        Gérez vos canaux de communication.
      </p>

      {connected && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Compte Instagram connecté avec succès.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {oauthErrorMessages[error] ?? `Erreur : ${error}`}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {allChannelTypes.map((type) => {
          const channel = channels?.find((c: Channel) => c.type === type);
          const meta = channelMeta[type];
          const Icon = meta.icon;

          const isConnected = channel?.status === "active";
          const isInactive = channel?.status === "inactive";
          const showConnect = type === "instagram" && (!channel || isInactive);

          const igCredentials =
            type === "instagram" && isConnected
              ? (channel.credentials as unknown as InstagramCredentials)
              : null;
          const igUsername = igCredentials?.instagram_username;

          const status =
            channel && !isInactive
              ? statusLabels[channel.status]
              : {
                  label: "Non connecté",
                  className: "bg-gray-100 text-gray-500",
                };

          return (
            <div
              key={type}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {meta.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                {igUsername ? (
                  <p className="text-sm text-gray-500 truncate">
                    @{igUsername}
                  </p>
                ) : isConnected && type === "instagram" ? (
                  <p className="text-sm text-gray-500">Compte connecté</p>
                ) : (
                  <p className="text-sm text-gray-500">{meta.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {showConnect && (
                  <a
                    href="/api/auth/instagram"
                    className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Connecter Instagram
                  </a>
                )}

                {type === "instagram" && isConnected && <DisconnectButton />}

                {type === "whatsapp" && !channel && (
                  <span className="text-xs text-gray-400">
                    Bientôt disponible
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
