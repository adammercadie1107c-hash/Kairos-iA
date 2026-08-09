"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface OrphanContact {
  id: string;
  external_id: string;
  display_name: string | null;
  extracted_info: Record<string, string>;
}

export function OrphanContacts({
  contacts,
}: {
  contacts: OrphanContact[];
}) {
  if (contacts.length === 0) return null;

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <p className="text-xs font-semibold text-orange-800 uppercase tracking-wider mb-2">
        Contacts orphelins (sans conversation)
      </p>
      <p className="text-xs text-orange-600 mb-3">
        Ces contacts ont encore des données en mémoire. L&apos;IA se souviendra d&apos;eux au prochain message.
      </p>
      <div className="space-y-2">
        {contacts.map((contact) => (
          <OrphanContactRow key={contact.id} contact={contact} />
        ))}
      </div>
    </div>
  );
}

function OrphanContactRow({ contact }: { contact: OrphanContact }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  function handleReset() {
    startTransition(async () => {
      const res = await fetch("/api/test/reset-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: contact.external_id, confirm: true }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
        <RotateCcw className="h-3.5 w-3.5" />
        {contact.display_name ?? contact.external_id} supprime
      </div>
    );
  }

  const infoKeys = Object.keys(contact.extracted_info);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-orange-100">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-medium text-orange-700">
        {(contact.display_name ?? "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {contact.display_name ?? "Contact"}
        </p>
        {infoKeys.length > 0 && (
          <p className="text-xs text-gray-500 truncate">
            Mémoire : {infoKeys.join(", ")}
          </p>
        )}
      </div>
      {confirming ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium text-white",
              isPending
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700",
            )}
          >
            {isPending ? "..." : "Confirmer"}
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
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
          Reset
        </button>
      )}
    </div>
  );
}
