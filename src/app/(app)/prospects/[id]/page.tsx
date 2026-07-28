import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { EditInfoForm } from "./edit-info-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Prospect — Kairos iA" };

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contact } = await supabase
    .from("contacts")
    .select("*, channels(type)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!contact) redirect("/prospects");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, ai_enabled, created_at, last_message_at")
    .eq("contact_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const channel = contact.channels as unknown as { type: string } | null;
  const info = (contact.extracted_info ?? {}) as Record<string, string>;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
        <Link
          href="/prospects"
          aria-label="Retour aux prospects"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
          {(contact.display_name ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {contact.display_name ?? "Contact"}
          </h1>
          <p className="text-xs text-gray-500">
            {channel?.type ?? "—"} · {contact.external_id}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {/* Extracted info */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Informations collectées
            </h2>

            {Object.keys(info).length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                Aucune information collectée pour le moment.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {Object.entries(info).map(([key, value]) => (
                  <div key={key} className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                      {key}
                    </span>
                    <span className="text-sm text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <EditInfoForm contactId={contact.id} currentInfo={info} />
            </div>
          </section>

          {/* Conversations */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Conversations ({(conversations ?? []).length})
            </h2>

            {(!conversations || conversations.length === 0) ? (
              <p className="mt-3 text-sm text-gray-400">
                Aucune conversation avec ce prospect.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {conversations.map((conv) => {
                  const status = statusLabels[conv.status] ?? {
                    label: conv.status,
                    className: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <Link
                      key={conv.id}
                      href={`/inbox/${conv.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                          {!conv.ai_enabled && (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                              IA off
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Meta */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Détails</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Canal</span>
                <span className="text-gray-900">{channel?.type ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID externe</span>
                <span className="font-mono text-xs text-gray-900">{contact.external_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Créé le</span>
                <span className="text-gray-900">
                  {new Date(contact.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
