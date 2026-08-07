import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn, todayDateStr } from "@/lib/utils";
import { fetchDashboardKpis, type Period } from "@/lib/dashboard/kpis";
import type { Prospect } from "@/lib/supabase/types";
import type { Metadata } from "next";
import {
  Users,
  MessageSquare,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  Trophy,
  XCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Send,
  HeadphonesIcon,
  RotateCcw,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Kairos iA" };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-gray-100 text-gray-700" },
  contacte: { label: "Contacté", className: "bg-blue-100 text-blue-700" },
  a_relancer: { label: "À relancer", className: "bg-yellow-100 text-yellow-700" },
  gagne: { label: "Gagné", className: "bg-green-100 text-green-700" },
  perdu: { label: "Perdu", className: "bg-red-100 text-red-600" },
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "all", label: "Total" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const period: Period =
    params.period === "7d" || params.period === "30d" || params.period === "all"
      ? params.period
      : "30d";

  const kpis = await fetchDashboardKpis(supabase, user.id, period);

  const { data: allProspects } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id);

  const prospects = (allProspects ?? []) as Prospect[];
  const todayStr = todayDateStr();

  const relancesToday = prospects.filter(
    (p) =>
      p.next_followup_at === todayStr &&
      p.status !== "gagne" &&
      p.status !== "perdu",
  ).length;

  const relancesOverdue = prospects.filter(
    (p) =>
      p.next_followup_at !== null &&
      p.next_followup_at < todayStr &&
      p.status !== "gagne" &&
      p.status !== "perdu",
  ).length;

  const upcomingFollowups = prospects
    .filter(
      (p) =>
        p.next_followup_at !== null &&
        p.next_followup_at >= todayStr &&
        p.status !== "gagne" &&
        p.status !== "perdu",
    )
    .sort((a, b) => a.next_followup_at!.localeCompare(b.next_followup_at!))
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/prospects?new=1"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter un prospect
          </Link>
          <Link
            href="/relances"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Voir les relances</span>
            <span className="sm:hidden">Relances</span>
          </Link>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/dashboard?period=${p.value}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              period === p.value
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={MessageSquare}
          label="Conversations"
          value={kpis.conversationsReceived}
          color="blue"
          href="/inbox"
        />
        <KpiCard
          icon={Users}
          label="En qualification"
          value={kpis.prospetsQualifying}
          color="blue"
          href="/inbox"
        />
        <KpiCard
          icon={UserCheck}
          label="Qualifiés"
          value={kpis.prospectsQualified}
          color="green"
          href="/prospects"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux qualification"
          value={`${kpis.qualificationRate}%`}
          color="green"
        />
        <KpiCard
          icon={Send}
          label="Booking envoyé"
          value={kpis.bookingSent}
          color="purple"
          href="/inbox"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={HeadphonesIcon}
          label="Handoffs"
          value={kpis.handoffs}
          color="orange"
          href="/inbox"
        />
        <KpiCard
          icon={RotateCcw}
          label="Relances exécutées"
          value={kpis.followupsExecuted}
          color="blue"
          href="/relances"
        />
        <KpiCard
          icon={Trophy}
          label="Gagnés"
          value={kpis.prospectsWon}
          color="green"
          href="/prospects"
        />
        <KpiCard
          icon={XCircle}
          label="Perdus"
          value={kpis.prospectsLost}
          color="red"
          href="/prospects"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Relances en retard"
          value={relancesOverdue}
          color="red"
          href="/relances"
        />
      </div>

      {/* Pipeline */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
          <PipelineStep
            label="Nouveau"
            count={kpis.pipeline.new}
            color="bg-gray-200 text-gray-700"
          />
          <PipelineArrow />
          <PipelineStep
            label="Qualification"
            count={kpis.pipeline.qualifying}
            color="bg-blue-100 text-blue-700"
          />
          <PipelineArrow />
          <PipelineStep
            label="Qualifié"
            count={kpis.pipeline.qualified}
            color="bg-green-100 text-green-700"
          />
          <PipelineArrow />
          <PipelineStep
            label="Booking"
            count={kpis.pipeline.booking_sent}
            color="bg-purple-100 text-purple-700"
          />
          <PipelineArrow />
          <div className="flex gap-2">
            <PipelineStep
              label="Gagné"
              count={kpis.prospectsWon}
              color="bg-green-100 text-green-700"
            />
            <PipelineStep
              label="Perdu"
              count={kpis.prospectsLost}
              color="bg-red-100 text-red-600"
            />
          </div>
        </div>
        {kpis.pipeline.handoff > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
            <HeadphonesIcon className="h-4 w-4" />
            {kpis.pipeline.handoff} en reprise humaine
          </div>
        )}
      </section>

      {/* Upcoming follow-ups */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Prochaines relances
            {relancesToday > 0 && (
              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                {relancesToday} aujourd&apos;hui
              </span>
            )}
          </h2>
          <Link
            href="/relances"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {upcomingFollowups.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Aucune relance prévue.
            </p>
            <Link
              href="/prospects"
              className="mt-1 inline-block text-sm text-blue-600 hover:underline"
            >
              Ajouter des prospects
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingFollowups.map((p) => {
              const st = STATUS_CONFIG[p.status] ?? {
                label: p.status,
                className: "bg-gray-100 text-gray-600",
              };
              const isToday = p.next_followup_at === todayStr;
              return (
                <Link
                  key={p.id}
                  href={`/prospects/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {(p.first_name || p.last_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {p.first_name} {p.last_name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                    {p.next_action && (
                      <p className="text-xs text-blue-600 truncate">
                        {p.next_action}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isToday ? "text-orange-600" : "text-gray-500",
                      )}
                    >
                      {isToday
                        ? "Aujourd'hui"
                        : new Date(p.next_followup_at!).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" },
                          )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const kpiColors = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  green: { bg: "bg-green-50", icon: "text-green-600" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600" },
  red: { bg: "bg-red-50", icon: "text-red-600" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600" },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: keyof typeof kpiColors;
  href?: string;
}) {
  const c = kpiColors[color];
  const content = (
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

function PipelineStep({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", color)}>
      <span>{label}</span>
      <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-bold">
        {count}
      </span>
    </div>
  );
}

function PipelineArrow() {
  return (
    <span className="hidden sm:block px-1 text-gray-300 text-lg">
      →
    </span>
  );
}
