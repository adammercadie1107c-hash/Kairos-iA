"use client";

import { useState, useTransition } from "react";
import {
  Clock,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markFollowedUp } from "./actions";
import type { Prospect } from "@/lib/supabase/types";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-gray-100 text-gray-700" },
  contacte: { label: "Contacté", className: "bg-blue-100 text-blue-700" },
  a_relancer: {
    label: "À relancer",
    className: "bg-yellow-100 text-yellow-700",
  },
  gagne: { label: "Gagné", className: "bg-green-100 text-green-700" },
  perdu: { label: "Perdu", className: "bg-red-100 text-red-600" },
};

interface Props {
  overdue: Prospect[];
  today: Prospect[];
  upcoming: Prospect[];
}

export function FollowupList({ overdue, today, upcoming }: Props) {
  const total = overdue.length + today.length + upcoming.length;

  if (total === 0) {
    return (
      <div className="mt-12 flex flex-col items-center">
        <CalendarCheck className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">
          Aucune relance prévue. Ajoutez des dates de relance sur vos prospects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {overdue.length > 0 && (
        <Section
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          title="En retard"
          count={overdue.length}
          badgeClassName="bg-red-100 text-red-700"
          prospects={overdue}
        />
      )}

      {today.length > 0 && (
        <Section
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          title="Aujourd'hui"
          count={today.length}
          badgeClassName="bg-orange-100 text-orange-700"
          prospects={today}
        />
      )}

      {upcoming.length > 0 && (
        <Section
          icon={<CalendarClock className="h-5 w-5 text-blue-500" />}
          title="À venir (7 jours)"
          count={upcoming.length}
          badgeClassName="bg-blue-100 text-blue-700"
          prospects={upcoming}
        />
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  badgeClassName,
  prospects,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  badgeClassName: string;
  prospects: Prospect[];
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            badgeClassName,
          )}
        >
          {count}
        </span>
      </div>

      <div className="space-y-2">
        {prospects.map((p) => (
          <ProspectCard key={p.id} prospect={p} />
        ))}
      </div>
    </section>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nextDate, setNextDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const st = STATUS_CONFIG[prospect.status] ?? {
    label: prospect.status,
    className: "bg-gray-100 text-gray-600",
  };

  function handleMark() {
    if (isPending) return;
    if (showDatePicker) {
      setResult(null);
      setErrorMessage(null);
      startTransition(async () => {
        const res = await markFollowedUp(
          prospect.id,
          nextDate || null,
        );
        if (res.error) {
          setResult("error");
          setErrorMessage(res.error);
        } else {
          setResult("success");
          setErrorMessage(null);
          setShowDatePicker(false);
          setNextDate("");
        }
      });
    } else {
      setShowDatePicker(true);
    }
  }

  function handleSkipDate() {
    if (isPending) return;
    setResult(null);
    setErrorMessage(null);
    startTransition(async () => {
      const res = await markFollowedUp(prospect.id, null);
      if (res.error) {
        setResult("error");
        setErrorMessage(res.error);
      } else {
        setResult("success");
        setErrorMessage(null);
        setShowDatePicker(false);
        setNextDate("");
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              {prospect.first_name} {prospect.last_name}
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

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {prospect.company && <span>{prospect.company}</span>}
            {(prospect.email || prospect.phone) && (
              <span>{prospect.email || prospect.phone}</span>
            )}
            {prospect.next_followup_at && (
              <span className="text-xs">
                Relance :{" "}
                {new Date(prospect.next_followup_at).toLocaleDateString(
                  "fr-FR",
                )}
              </span>
            )}
          </div>

          {prospect.next_action && (
            <p className="mt-1 text-xs text-blue-600 line-clamp-1">
              → {prospect.next_action}
            </p>
          )}

          {prospect.notes && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
              {prospect.notes}
            </p>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 shrink-0">
          {result === "success" && (
            <span className="text-xs text-green-600 font-medium">
              Fait
            </span>
          )}
          {result === "error" && (
            <span className="text-xs text-red-600 font-medium">
              {errorMessage || "Erreur"}
            </span>
          )}
          <button
            type="button"
            onClick={handleMark}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              showDatePicker
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700",
              isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showDatePicker ? "Confirmer" : "Marquer comme relance"}
            </span>
            <span className="sm:hidden">
              {showDatePicker ? "OK" : "Relance"}
            </span>
          </button>
        </div>
      </div>

      {/* Date picker row */}
      {showDatePicker && (
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 border-t border-gray-100 pt-3">
          <label className="text-sm text-gray-600">
            Prochaine relance :
          </label>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">
            Laisser vide = pas de prochaine relance
          </span>
          <button
            type="button"
            onClick={handleSkipDate}
            disabled={isPending}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sans date
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDatePicker(false);
              setNextDate("");
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}
