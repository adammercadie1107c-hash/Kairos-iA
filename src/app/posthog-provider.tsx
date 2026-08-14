"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics/posthog-client";
import { getConsent } from "@/lib/analytics/consent";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (getConsent() === "accepted") {
      initPostHog();
    }
  }, []);

  return <>{children}</>;
}
