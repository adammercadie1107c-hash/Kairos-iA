import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Prospect } from "@/lib/supabase/types";
import type { Metadata } from "next";
import {
  Users,
  UserPlus,
  CalendarClock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Kairos iA" };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-gray-100 text-gray-700" },
  contacte: { label: "Contacte", className: "bg-blue-100 text-blue-700" },
  a_relancer: { label: "A relancer", className: "bg-yellow-100 text-yellow-700" },
  gagne: { label: "Gagne", className: "bg-green-100 text-green-700" },
  perdu: { label: "Perdu", className: "bg-red-100 text-red-600" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Erreur lors du chargement : {error.message}
          </p>
        </div>
      </div>
    );
  }

  const prospects = (data ?? []) as Prospect[];
  const todayStr = new Date().toISOString().split("T")[0];

  const total = prospects.length;
  const nouveaux = prospects.filter((p) => p.status === "nouveau").length;
  const gagnes = prospects.filter((p) => p.status === "gagne").length;

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

  const conversionRate = total > 0 ? Math.round((gagnes / total) * 100) : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Vue d&apos;ensemble de vos prospects
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={Users}
          label="Total prospects"
          value={total}
          color="blue"
          href="/prospects"
        />
        <KpiCard
          icon={UserPlus}
          label="Nouveaux"
          value={nouveaux}
          color="blue"
          href="/prospects"
        />
        <KpiCard
          icon={CalendarClock}
          label="Relances aujourd'hui"
          value={relancesToday}
          color="orange"
          href="/relances"
        />
        <KpiCard
          icon={AlertTriangle}
          label="En retard"
          value={relancesOverdue}
          color="red"
          href="/relances"
        />
        <KpiCard
          icon={Trophy}
          label="Gagnes"
          value={gagnes}
          color="green"
          href="/prospects"
        />
        <KpiCard
          icon={TrendingUp}
          label="Conversion"
          value={`${conversionRate}%`}
          color="green"
        />
      </div>

      {/* Upcoming follow-ups */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Prochaines relances
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
              Aucune relance prevue.
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
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3"
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
                    <div className="flex gap-3 text-xs text-gray-500">
                      {p.company && <span>{p.company}</span>}
                      {(p.email || p.phone) && (
                        <span>{p.email || p.phone}</span>
                      )}
                    </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const kpiColors = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  green: { bg: "bg-green-50", icon: "text-green-600" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600" },
  red: { bg: "bg-red-50", icon: "text-red-600" },
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
