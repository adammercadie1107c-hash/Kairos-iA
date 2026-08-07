"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { toggleAi } from "../actions";

export function ReactivateAiButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleAi(conversationId, true);
        })
      }
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      <Power className="h-3.5 w-3.5" />
      {isPending ? "..." : "Réactiver l'IA"}
    </button>
  );
}
