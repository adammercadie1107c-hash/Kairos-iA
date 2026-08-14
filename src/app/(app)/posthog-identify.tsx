"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics/posthog-client";

export function PostHogIdentify({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
  useEffect(() => {
    identifyUser(userId, email);
  }, [userId, email]);

  return null;
}
