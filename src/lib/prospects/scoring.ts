import type { ConversationStatus } from "@/lib/supabase/types";

const INFO_KEY_MAP: Record<string, string> = {
  objectif: "objectif",
  objective: "objectif",
  goal: "objectif",
  budget: "budget",
  motivation: "motivation",
  interet: "motivation",
  interest: "motivation",
  "niveau de motivation": "motivation",
  "niveau d'interet": "motivation",
  blocage: "blocage",
  blocages: "blocage",
  contraintes: "blocage",
  constraints: "blocage",
  contrainte: "blocage",
  freins: "blocage",
  objections: "blocage",
  objection: "blocage",
  timing: "timing",
  delai: "timing",
  disponibilite: "timing",
  experience: "experience",
  "experience passee": "experience",
  "offre recherchee": "offre",
  offre: "offre",
  "capacite investissement": "investissement",
  "volonte investissement": "investissement",
  investissement: "investissement",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase().trim();
  return INFO_KEY_MAP[lower] ?? lower;
}

export type ScoreLevel = "faible" | "moyen" | "fort";

export interface ScoreCriterion {
  key: string;
  label: string;
  points: number;
  met: boolean;
}

export interface ProspectScore {
  score: number;
  level: ScoreLevel;
  criteria: ScoreCriterion[];
  reasons: string[];
  missing: string[];
}

const CRITERIA: Array<{
  key: string;
  label: string;
  points: number;
  match: (normalized: Set<string>) => boolean;
}> = [
  {
    key: "objectif",
    label: "Objectif clair",
    points: 20,
    match: (s) => s.has("objectif"),
  },
  {
    key: "blocage",
    label: "Blocage identifié",
    points: 10,
    match: (s) => s.has("blocage"),
  },
  {
    key: "timing",
    label: "Timing défini",
    points: 20,
    match: (s) => s.has("timing"),
  },
  {
    key: "motivation",
    label: "Motivation suffisante",
    points: 15,
    match: (s) => s.has("motivation"),
  },
  {
    key: "investissement",
    label: "Capacité / volonté d'investissement",
    points: 20,
    match: (s) => s.has("investissement") || s.has("budget"),
  },
];

const BOOKING_CRITERION = {
  key: "booking",
  label: "Intention de réserver / booking_sent",
  points: 15,
};

export function computeProspectScore(
  extractedInfo: Record<string, string>,
  conversationStatus?: ConversationStatus | string | null,
): ProspectScore {
  const normalizedKeys = new Set<string>();

  for (const [key, val] of Object.entries(extractedInfo)) {
    if (val?.trim()) {
      normalizedKeys.add(normalizeKey(key));
    }
  }

  const criteria: ScoreCriterion[] = [];
  const reasons: string[] = [];
  const missing: string[] = [];
  let score = 0;

  for (const c of CRITERIA) {
    const met = c.match(normalizedKeys);
    criteria.push({ key: c.key, label: c.label, points: c.points, met });
    if (met) {
      score += c.points;
      reasons.push(c.label);
    } else {
      missing.push(c.label);
    }
  }

  const bookingMet = conversationStatus === "booking_sent";
  criteria.push({
    key: BOOKING_CRITERION.key,
    label: BOOKING_CRITERION.label,
    points: BOOKING_CRITERION.points,
    met: bookingMet,
  });

  if (bookingMet) {
    score += BOOKING_CRITERION.points;
    reasons.push(BOOKING_CRITERION.label);
  } else {
    missing.push(BOOKING_CRITERION.label);
  }

  let level: ScoreLevel;
  if (score >= 70) level = "fort";
  else if (score >= 40) level = "moyen";
  else level = "faible";

  return { score, level, criteria, reasons, missing };
}
