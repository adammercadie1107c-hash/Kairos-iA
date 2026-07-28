import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — Kairos iA" };
import {
  MessageSquare,
  Users,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  Bot,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [convResult_, contactCountResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, status, ai_enabled, created_at, last_message_at, contact_id, contacts(display_name)")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("contacts")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .limit(0),
  ]);
  const conversations_ = convResult_.data;
  const totalContacts = contactCountResult.count ?? 0;

  const conversations = conversations_ ?? [];
  const convIds = conversations.map((c) => c.id);

  const [msgResult, logResult] = convIds.length > 0
    ? await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact" })
          .in("conversation_id", convIds)
          .limit(0),
        supabase
          .from("agent_logs")
          .select("latency_ms, decision, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(100),
      ])
    : [{ count: 0 }, { data: [] }];

  const totalMessages = msgResult.count ?? 0;
  const logs = logResult.data ?? [];

  const total = conversations.length;
  const byStatus: Record<string, number> = {};
  for (const c of conversations) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  const qualified = (byStatus["qualified"] ?? 0) + (byStatus["booking_sent"] ?? 0);
  const bookingSent = byStatus["booking_sent"] ?? 0;
  const handoffs = byStatus["handoff"] ?? 0;
  const qualifying = byStatus["qualifying"] ?? 0;
  const disqualified = byStatus["disqualified"] ?? 0;

  const qualificationRate = total > 0 ? Math.round((qualified / total) * 100) : 0;

  const avgLatency =
    logs.length > 0
      ? Math.round(
          logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / logs.length,
        )
      : 0;

  const escalations = logs.filter((l) => l.decision === "escalate").length;

  const recentConversations = conversations.slice(0, 5);

  // Conversations from last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentCount = conversations.filter(
    (c) => new Date(c.created_at) >= weekAgo,
  ).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={Users}
          label="Prospects"
          value={totalContacts}
          sub={`${total} conversation${total > 1 ? "s" : ""}`}
          color="blue"
          href="/prospects"
        />
        <KpiCard
          icon={MessageSquare}
          label="Conversations"
          value={total}
          sub={`${recentCount} cette semaine`}
          color="blue"
          href="/inbox"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux de qualification"
          value={`${qualificationRate}%`}
          sub={`${qualified} qualifié${qualified > 1 ? "s" : ""} / ${total}`}
          color="green"
        />
        <KpiCard
          icon={CalendarCheck}
          label="Liens envoyés"
          value={bookingSent}
          sub={`${qualifying} en qualification`}
          color="purple"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Escalades"
          value={handoffs}
          sub={`${disqualified} disqualifié${disqualified > 1 ? "s" : ""}`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent conversations */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Conversations récentes
            </h2>
            <Link
              href="/inbox"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                Aucune conversation pour le moment.
              </p>
              <Link
                href="/simulator"
                className="mt-1 inline-block text-sm text-blue-600 hover:underline"
              >
                Tester dans le simulateur
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentConversations.map((conv) => {
                const contact = conv.contacts as unknown as {
                  display_name: string | null;
                } | null;
                return (
                  <Link
                    key={conv.id}
                    href={`/inbox/${conv.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {(contact?.display_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {contact?.display_name ?? "Contact"}
                      </span>
                    </div>
                    <StatusBadge status={conv.status} />
                    <span className="text-xs text-gray-400">
                      {conv.last_message_at
                        ? formatRelative(conv.last_message_at)
                        : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent stats */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Performance IA
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <StatRow
              icon={Bot}
              label="Messages total"
              value={totalMessages.toString()}
            />
            <StatRow
              icon={Bot}
              label="Appels IA"
              value={logs.length.toString()}
            />
            <StatRow
              icon={Bot}
              label="Latence moyenne"
              value={avgLatency > 0 ? `${avgLatency}ms` : "—"}
            />
            <StatRow
              icon={AlertTriangle}
              label="Escalades IA"
              value={escalations.toString()}
            />

            {/* Status breakdown */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Répartition par statut
              </p>
              <div className="space-y-1.5">
                {[
                  { key: "new", label: "Nouveau", color: "bg-gray-400" },
                  { key: "qualifying", label: "Qualification", color: "bg-blue-500" },
                  { key: "qualified", label: "Qualifié", color: "bg-green-500" },
                  { key: "booking_sent", label: "Lien envoyé", color: "bg-purple-500" },
                  { key: "handoff", label: "Humain", color: "bg-orange-500" },
                  { key: "disqualified", label: "Disqualifié", color: "bg-red-500" },
                  { key: "closed", label: "Fermé", color: "bg-gray-400" },
                ].map((s) => {
                  const count = byStatus[s.key] ?? 0;
                  if (count === 0) return null;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", s.color)} />
                      <span className="text-xs text-gray-600 flex-1">
                        {s.label}
                      </span>
                      <span className="text-xs font-medium text-gray-900">
                        {count}
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const kpiColors = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  green: { bg: "bg-green-50", icon: "text-green-600" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600" },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  color: keyof typeof kpiColors;
  href?: string;
}) {
  const c = kpiColors[color];
  const content = (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg",
            c.bg,
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", c.icon)} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] sm:text-xs text-gray-400 truncate">{sub}</p>
    </>
  );
  const cls = "rounded-lg border border-gray-200 bg-white p-3 sm:p-4";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "hover:border-gray-300 transition-colors")}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="flex-1 text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusLabels[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        s.className,
      )}
    >
      {s.label}
    </span>
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
