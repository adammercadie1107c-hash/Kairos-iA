"use client";

import { useTransition } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveAlert } from "./alert-actions";

interface Alert {
  id: string;
  type: string;
  reason: string;
  prospect_question: string;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  human_confirmation: "Confirmation requise",
  handoff: "Reprise humaine",
  commercial_question: "Question commerciale",
  booking_intent: "Intention de booking",
};

const TYPE_COLORS: Record<string, string> = {
  human_confirmation: "border-yellow-200 bg-yellow-50",
  handoff: "border-orange-200 bg-orange-50",
  commercial_question: "border-blue-200 bg-blue-50",
  booking_intent: "border-green-200 bg-green-50",
};

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const pending = alerts.filter((a) => a.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="mx-4 mt-3 space-y-2">
      {pending.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const [isPending, startTransition] = useTransition();

  function handleResolve() {
    startTransition(async () => {
      await resolveAlert(alert.id);
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        TYPE_COLORS[alert.type] ?? "border-gray-200 bg-gray-50",
      )}
    >
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">
          {TYPE_LABELS[alert.type] ?? alert.type}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">{alert.reason}</p>
        <p className="mt-1 text-xs text-gray-500 italic truncate">
          Prospect : &quot;{alert.prospect_question}&quot;
        </p>
      </div>
      <button
        type="button"
        onClick={handleResolve}
        disabled={isPending}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          isPending
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-green-100 text-green-700 hover:bg-green-200",
        )}
      >
        <CheckCircle className="h-3 w-3" />
        {isPending ? "..." : "Résolu"}
      </button>
    </div>
  );
}
