"use client";

const CONSENT_KEY = "kairos_cookie_consent";

export type ConsentState = "accepted" | "declined" | null;

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === "accepted" || val === "declined") return val;
  return null;
}

export function setConsent(value: "accepted" | "declined"): void {
  localStorage.setItem(CONSENT_KEY, value);
}

export function resetConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}
