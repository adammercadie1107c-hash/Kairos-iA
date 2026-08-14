"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Trophy, XCircle, Bot, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markProspectStatus,
  updateFollowupDate,
  cancelFollowup,
} from "../actions";
import { toggleAi } from "../../inbox/actions";

function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function ProspectQuickActions({
  prospectId,
  isTerminal,
  conversationId,
  aiEnabled,
  nextFollowupAt,
}: {
  prospectId: string;
  isTerminal: boolean;
  conversationId: string | null;
  aiEnabled: boolean | null;
  nextFollowupAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [followupDate, setFollowupDate] = useState("");
  const [followupError, setFollowupError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setFollowupDate(
      nextFollowupAt ? toDateTimeLocal(nextFollowupAt) : defaultDateTimeLocal(),
    );
  }, [nextFollowupAt]);

  function handleMarkWon() {
    startTransition(async () => {
      await markProspectStatus(prospectId, "gagne");
      router.refresh();
    });
  }

  function handleMarkLost() {
    startTransition(async () => {
      await markProspectStatus(prospectId, "perdu");
      router.refresh();
    });
  }

  const [reminderOnly, setReminderOnly] = useState(false);

  function handleSaveFollowup() {
    setFollowupError(null);
    setReminderOnly(false);
    startTransition(async () => {
      const iso = new Date(followupDate).toISOString();
      const result = await updateFollowupDate(prospectId, iso);
      if (result.error) {
        setFollowupError(result.error);
      } else {
        if (result.reminder_only) setReminderOnly(true);
        router.refresh();
      }
    });
  }

  function handleCancelFollowup() {
    setFollowupError(null);
    startTransition(async () => {
      const result = await cancelFollowup(prospectId);
      if (result.error) {
        setFollowupError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleReactivateAi() {
    if (!conversationId) return;
    startTransition(async () => {
      await toggleAi(conversationId, true);
      router.refresh();
    });
  }

  return (
    <>
      {!isTerminal && conversationId && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            Relance automatique
          </label>
          <input
            type="datetime-local"
            value={followupDate}
            onChange={(e) => setFollowupDate(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {followupError && (
            <p className="text-xs text-red-600">{followupError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveFollowup}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50",
                isPending && "opacity-50 cursor-not-allowed",
              )}
            >
              <Calendar className="h-4 w-4" />
              Enregistrer
            </button>
            {nextFollowupAt && (
              <button
                type="button"
                onClick={handleCancelFollowup}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
                title="Annuler la relance"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!isTerminal && !conversationId && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            Rappel coach
          </label>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              Aucune conversation Instagram liée — aucun message ne sera envoyé automatiquement.
            </p>
          </div>
          <input
            type="datetime-local"
            value={followupDate}
            onChange={(e) => setFollowupDate(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {followupError && (
            <p className="text-xs text-red-600">{followupError}</p>
          )}
          {reminderOnly && (
            <p className="text-xs text-amber-600">
              Rappel enregistré. Ce prospect n&apos;est pas lié à une conversation Instagram, aucun DM automatique ne sera envoyé.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveFollowup}
              disabled={isPending}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50",
                isPending && "opacity-50 cursor-not-allowed",
              )}
            >
              <Calendar className="h-4 w-4" />
              Enregistrer le rappel
            </button>
            {nextFollowupAt && (
              <button
                type="button"
                onClick={handleCancelFollowup}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
                title="Annuler le rappel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {conversationId && aiEnabled === false && (
        <button
          type="button"
          onClick={handleReactivateAi}
          disabled={isPending}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50",
            isPending && "opacity-50 cursor-not-allowed",
          )}
        >
          <Bot className="h-4 w-4" />
          Réactiver l&apos;IA
        </button>
      )}

      {!isTerminal && (
        <>
          <button
            type="button"
            onClick={handleMarkWon}
            disabled={isPending}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50",
              isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            <Trophy className="h-4 w-4" />
            Marquer gagné
          </button>

          <button
            type="button"
            onClick={handleMarkLost}
            disabled={isPending}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50",
              isPending && "opacity-50 cursor-not-allowed",
            )}
          >
            <XCircle className="h-4 w-4" />
            Marquer perdu
          </button>
        </>
      )}
    </>
  );
}
