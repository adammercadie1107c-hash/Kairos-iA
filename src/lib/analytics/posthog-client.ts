"use client";

import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;

  try {
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      autocapture: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      enable_recording_console_log: false,
    });
    initialized = true;
  } catch {
    // never break the app
  }
}

export function identifyUser(userId: string, email?: string): void {
  try {
    if (!initialized) return;
    posthog.identify(userId, email ? { email } : {});
  } catch {
    // ignore
  }
}

export function resetUser(): void {
  try {
    if (!initialized) return;
    posthog.reset();
  } catch {
    // ignore
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (!initialized) return;
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
