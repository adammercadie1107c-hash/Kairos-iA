import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Users, Search } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Prospects — Kairos iA" };

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, display_name, external_id, extracted_info, created_at, channel_id, channels(type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const contactIds = (contacts ?? []).map((c) => c.id);
  const { data: conversations } = contactIds.length > 0
    ? await supabase
        .from("conversations")
        .select("id, contact_id, status, last_message_at")
        .in("contact_id", contactIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
    : { data: [] };

  const convByContact = new Map<string, { id: string; status: string; last_message_at: string | null }>();
  for (const conv of conversations ?? []) {
    if (!convByContact.has(conv.contact_id)) {
      convByContact.set(conv.contact_id, conv);
    }
  }

  let filtered = (contacts ?? []).map((c) => ({
    ...c,
    lastConv: convByContact.get(c.id) ?? null,
  }));

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((c) => c.lastConv?.status === params.status);
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((c) => {
      const name = (c.display_name ?? "").toLowerCase();
      const info = JSON.stringify(c.extracted_info ?? {}).toLowerCase();
      return name.includes(q) || info.includes(q);
    });
  }

  const activeFilter = params.status || "all";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Prospects</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} contact{filtered.length > 1 ? "s" : ""}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <form className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Rechercher..."
                className="w-full rounded-full border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </form>

          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { key: "all", label: "Tous" },
              { key: "qualifying", label: "Qualification" },
              { key: "qualified", label: "Qualifiés" },
              { key: "booking_sent", label: "Lien envoyé" },
              { key: "handoff", label: "Humain" },
              { key: "disqualified", label: "Disqualifiés" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={`/prospects?status=${tab.key}${params.q ? `&q=${params.q}` : ""}`}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeFilter === tab.key
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Aucun prospect trouvé.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((contact) => {
              const channel = contact.channels as unknown as { type: string } | null;
              const info = (contact.extracted_info ?? {}) as Record<string, string>;
              const infoKeys = Object.keys(info);
              const status = contact.lastConv
                ? statusLabels[contact.lastConv.status] ?? { label: contact.lastConv.status, className: "bg-gray-100 text-gray-600" }
                : null;

              return (
                <Link
                  key={contact.id}
                  href={`/prospects/${contact.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {(contact.display_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {contact.display_name ?? "Contact"}
                      </span>
                      {status && (
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
                          {status.label}
                        </span>
                      )}
                      {channel && (
                        <span className="shrink-0 text-xs text-gray-400">{channel.type}</span>
                      )}
                    </div>
                    {infoKeys.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {infoKeys.slice(0, 3).map((k) => `${k}: ${info[k]}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-gray-400">
                    {contact.lastConv?.last_message_at
                      ? formatRelative(contact.lastConv.last_message_at)
                      : new Date(contact.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}j`;
}
