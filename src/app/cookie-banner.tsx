"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getConsent,
  setConsent,
  resetConsent,
  type ConsentState,
} from "@/lib/analytics/consent";
import { initPostHog, optOutPostHog } from "@/lib/analytics/posthog-client";
import { saveCookieConsent } from "./cookie-actions";

export function CookieBanner() {
  const [consent, setConsentState] = useState<ConsentState | "loading">(
    "loading",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setConsentState(getConsent());

    function handleReset() {
      setConsentState(null);
    }
    window.addEventListener("kairos:reset-consent", handleReset);
    return () =>
      window.removeEventListener("kairos:reset-consent", handleReset);
  }, []);

  if (consent === "loading" || consent !== null) return null;

  function handleAccept() {
    setConsent("accepted");
    setConsentState("accepted");
    initPostHog();
    startTransition(async () => {
      await saveCookieConsent(true);
    });
  }

  function handleDecline() {
    setConsent("declined");
    setConsentState("declined");
    optOutPostHog();
    startTransition(async () => {
      await saveCookieConsent(false);
    });
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 md:p-6">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-lg md:p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          Ce site utilise des cookies d&apos;analyse (PostHog) pour comprendre
          comment vous utilisez l&apos;application et améliorer votre
          expérience. Aucune donnée personnelle sensible n&apos;est collectée.{" "}
          <Link
            href="/privacy"
            className="text-blue-600 underline hover:text-blue-700"
          >
            Politique de confidentialité
          </Link>
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

export function openCookieSettings() {
  resetConsent();
  window.dispatchEvent(new Event("kairos:reset-consent"));
}
