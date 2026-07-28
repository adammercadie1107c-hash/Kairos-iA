import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Europe/Paris";

export function todayDateStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function addDaysDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}
