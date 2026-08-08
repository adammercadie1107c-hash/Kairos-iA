"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function ResetContactButton({
  externalId,
}: {
  externalId: string;
}) {
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePreview() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/test/reset-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: externalId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setPreview(data.will_delete);
      setStep("preview");
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/test/reset-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: externalId, confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur");
        return;
      }
      setStep("done");
      router.push("/inbox");
      router.refresh();
    });
  }

  if (step === "done") {
    return (
      <p className="text-xs text-green-600 font-medium">
        Contact supprime. Redirection...
      </p>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
        <p className="text-xs font-medium text-orange-800">
          Supprimer toutes les donnees de ce contact ?
        </p>
        <ul className="text-xs text-orange-700 space-y-0.5">
          <li>{preview.messages ?? 0} messages</li>
          <li>{preview.agent_logs ?? 0} logs IA</li>
          <li>{preview.scheduled_events ?? 0} events</li>
          <li>{preview.prospects ?? 0} prospect</li>
          <li>{preview.conversations ?? 0} conversation(s)</li>
          <li>1 contact</li>
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium text-white",
              isPending
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700",
            )}
          >
            {isPending ? "Suppression..." : "Confirmer le reset"}
          </button>
          <button
            type="button"
            onClick={() => setStep("idle")}
            disabled={isPending}
            className="rounded-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePreview}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          isPending
            ? "border-gray-200 text-gray-400 cursor-not-allowed"
            : "border-orange-200 text-orange-600 hover:bg-orange-50",
        )}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isPending ? "Chargement..." : "Reset ce contact"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
