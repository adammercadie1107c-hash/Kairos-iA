"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteProspect } from "./actions";

export function DeleteDialog({
  prospectId,
  prospectName,
  onClose,
}: {
  prospectId: string;
  prospectName: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProspect(prospectId);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Supprimer le prospect
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Supprimer <strong>{prospectName}</strong> ? Cette action est
              irréversible.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white",
              isPending
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700",
            )}
          >
            {isPending ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
