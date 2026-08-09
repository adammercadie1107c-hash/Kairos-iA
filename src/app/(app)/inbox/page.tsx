import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { OrphanContacts } from "./orphan-contacts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox — Kairos iA" };

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("conversations")
    .select(
      "id, status, ai_enabled, last_message_at, created_at, contact_id, contacts(display_name, extracted_info), channels(type)",
    )
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: conversations } = await query;

  // Get last message for each conversation
  const convIds = (conversations ?? []).map((c) => c.id);
  const { data: lastMessages } = convIds.length > 0
    ? await supabase
        .from("messages")
        .select("conversation_id, content, role, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastMessageMap = new Map<string, { content: string; role: string }>();
  for (const msg of lastMessages ?? []) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg);
    }
  }

  const showTestTools =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_TEST_TOOLS === "true";

  let orphanContacts: {
    id: string;
    external_id: string;
    display_name: string | null;
    extracted_info: Record<string, string>;
  }[] = [];

  if (showTestTools) {
    const { data: allContacts } = await supabase
      .from("contacts")
      .select("id, external_id, display_name, extracted_info")
      .eq("user_id", user.id);

    if (allContacts && allContacts.length > 0) {
      const { data: activeConvs } = await supabase
        .from("conversations")
        .select("contact_id")
        .eq("user_id", user.id);

      const activeContactIds = new Set(
        (activeConvs ?? []).map((c) => c.contact_id),
      );

      orphanContacts = allContacts
        .filter((c) => !activeContactIds.has(c.id))
        .map((c) => ({
          ...c,
          extracted_info: (c.extracted_info ?? {}) as Record<string, string>,
        }));
    }
  }

  const activeFilter = params.status || "all";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
        <div className="mt-2 sm:mt-3 flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Tous" },
            { key: "qualifying", label: "Qualification" },
            { key: "qualified", label: "Qualifiés" },
            { key: "booking_sent", label: "Lien envoyé" },
            { key: "handoff", label: "Humain" },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/inbox?status=${tab.key}`}
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

      {showTestTools && <OrphanContacts contacts={orphanContacts} />}

      <div className="flex-1 overflow-y-auto">
        {(!conversations || conversations.length === 0) ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Aucune conversation.</p>
              <Link
                href="/simulator"
                className="mt-1 inline-block text-sm text-blue-600 hover:underline"
              >
                Tester dans le simulateur
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => {
              const contact = conv.contacts as unknown as {
                display_name: string | null;
                extracted_info: Record<string, string>;
              } | null;
              const channel = conv.channels as unknown as {
                type: string;
              } | null;
              const lastMsg = lastMessageMap.get(conv.id);
              const status = statusLabels[conv.status] ?? {
                label: conv.status,
                className: "bg-gray-100 text-gray-600",
              };

              return (
                <Link
                  key={conv.id}
                  href={`/inbox/${conv.id}`}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {(contact?.display_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                        {contact?.display_name ?? "Contact"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                      {!conv.ai_enabled && (
                        <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-orange-600">
                          IA off
                        </span>
                      )}
                      {channel && (
                        <span className="hidden sm:inline shrink-0 text-xs text-gray-400">
                          {channel.type}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {lastMsg.role === "contact" ? "" : "Vous : "}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-gray-400">
                    {conv.last_message_at
                      ? formatRelative(conv.last_message_at)
                      : ""}
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
