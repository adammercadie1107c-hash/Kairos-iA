"use client";

import type { PostHog } from "posthog-js";

let initialized = false;
let posthog: PostHog | null = null;

export async function initPostHog(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;

  try {
    const mod = await import("posthog-js");
    posthog = mod.default;
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      autocapture: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
      enable_recording_console_log: false,
    });
    initialized = true;

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog] initialized — session replay URL:",
        posthog.get_session_replay_url(),
      );
    }
  } catch {
    // never break the app
  }
}

export function identifyUser(userId: string, email?: string): void {
  try {
    if (!initialized || !posthog) return;
    posthog.identify(userId, email ? { email } : {});
    posthog.startSessionRecording();

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PostHog] identified + recording started — replay URL:",
        posthog.get_session_replay_url(),
      );
    }
  } catch {
    // ignore
  }
}

export function resetUser(): void {
  try {
    if (!initialized || !posthog) return;
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
    if (!initialized || !posthog) return;
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
