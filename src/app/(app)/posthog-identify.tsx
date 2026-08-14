"use client";

import { useEffect } from "react";
import { identifyUser, onPostHogReady } from "@/lib/analytics/posthog-client";

export function PostHogIdentify({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
  useEffect(() => {
    const unregister = onPostHogReady(() => {
      identifyUser(userId, email);
    });
    return unregister;
  }, [userId, email]);

  return null;
}
