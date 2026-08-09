import type { ConversationStatus } from "@/lib/supabase/types";

const FORBIDDEN_TRANSITIONS: Record<string, ConversationStatus[]> = {
  booking_sent: ["qualified", "qualifying", "new"],
  qualified: ["qualifying", "new"],
  disqualified: ["qualifying", "qualified", "booking_sent"],
  closed: ["new", "qualifying", "qualified", "booking_sent", "handoff", "disqualified"],
};

export function canTransitionStatus(
  current: ConversationStatus,
  next: ConversationStatus,
  isHumanAction: boolean,
): boolean {
  if (current === next) return true;

  if (isHumanAction) {
    if (current === "closed") return true;
    if (current === "disqualified") return true;
  }

  const forbidden = FORBIDDEN_TRANSITIONS[current];
  if (!forbidden) return true;

  return !forbidden.includes(next);
}
