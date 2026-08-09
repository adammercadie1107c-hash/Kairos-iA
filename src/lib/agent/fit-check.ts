export type FitResult = "FIT" | "UNCERTAIN" | "NOT_A_FIT";

export interface FitCheckInput {
  extractedInfo: Record<string, string>;
  offer: string;
  qualificationRules: Record<string, unknown>;
}

export function checkProspectFit(input: FitCheckInput): FitResult {
  const rules = input.qualificationRules;
  const info = input.extractedInfo;

  const acceptedGoals = normalizeList(rules.accepted_goals);
  const rejectedGoals = normalizeList(rules.rejected_goals);

  const objectifKey = Object.keys(info).find(
    (k) => k.toLowerCase().trim() === "objectif",
  );
  const objectif = objectifKey ? info[objectifKey].toLowerCase().trim() : "";

  if (!objectif) return "UNCERTAIN";

  const matchesAccepted = acceptedGoals.length > 0 && matchesAny(objectif, acceptedGoals);
  const matchesRejected = rejectedGoals.length > 0 && matchesAny(objectif, rejectedGoals);

  if (matchesAccepted && matchesRejected) return "FIT";
  if (matchesAccepted) return "FIT";
  if (matchesRejected) return "NOT_A_FIT";
  if (acceptedGoals.length > 0) return "NOT_A_FIT";

  return "UNCERTAIN";
}

function normalizeList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string")
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);
  }
  return [];
}

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (text.includes(pattern)) return true;
    const patternWords = pattern.split(/\s+/).filter((w) => w.length > 2);
    if (patternWords.length === 0) return false;
    return patternWords.some((pw) => text.includes(pw));
  });
}
