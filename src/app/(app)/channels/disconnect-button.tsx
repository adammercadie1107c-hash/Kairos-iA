"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disconnectInstagram } from "./actions";

export function DisconnectButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Déconnecter
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Confirmer ?</span>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const result = await disconnectInstagram();
          if (result.error) {
            setLoading(false);
            setConfirming(false);
          } else {
            router.refresh();
          }
        }}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "..." : "Oui"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        Non
      </button>
    </div>
  );
}
