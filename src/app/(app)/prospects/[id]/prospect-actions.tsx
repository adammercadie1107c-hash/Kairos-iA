"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Trophy, XCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { markProspectStatus, scheduleManualFollowup } from "../actions";
import { toggleAi } from "../../inbox/actions";

export function ProspectQuickActions({
  prospectId,
  isTerminal,
  conversationId,
  aiEnabled,
}: {
  prospectId: string;
  isTerminal: boolean;
  conversationId: string | null;
  aiEnabled: boolean | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  function handleScheduleFollowup() {
    startTransition(async () => {
      await scheduleManualFollowup(prospectId, 1);
      router.refresh();
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
      {!isTerminal && (
        <button
          type="button"
          onClick={handleScheduleFollowup}
          disabled={isPending}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50",
            isPending && "opacity-50 cursor-not-allowed",
          )}
        >
          <Calendar className="h-4 w-4" />
          Planifier une relance
        </button>
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
