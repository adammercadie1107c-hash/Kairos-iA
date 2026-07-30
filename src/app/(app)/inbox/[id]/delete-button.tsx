"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteConversation } from "../actions";

export function DeleteConversationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (isPending) return;
    startTransition(async () => {
      await deleteConversation(conversationId);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600">Supprimer ?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium text-white",
            isPending
              ? "bg-red-300 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700",
          )}
        >
          {isPending ? "Suppression..." : "Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title="Supprimer la conversation"
      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
