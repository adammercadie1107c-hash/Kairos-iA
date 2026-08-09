const INFO_KEY_MAP: Record<string, string> = {
  objectif: "objectif",
  objective: "objectif",
  goal: "objectif",
  budget: "budget",
  contraintes: "contraintes",
  constraints: "contraintes",
  contrainte: "contraintes",
  objections: "objections",
  objection: "objections",
  freins: "objections",
  motivation: "motivation",
  interet: "interet",
  interest: "interet",
  "niveau de motivation": "motivation",
  "niveau d'interet": "interet",
  "offre recherchee": "offre recherchee",
  offre: "offre recherchee",
  blocage: "blocage",
  blocages: "blocage",
  timing: "timing",
  delai: "timing",
  disponibilite: "timing",
  experience: "experience",
  "experience passee": "experience",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase().trim();
  return INFO_KEY_MAP[lower] ?? lower;
}

export interface ProspectDisplayFields {
  objectif: string | null;
  blocage: string | null;
  timing: string | null;
  budget: string | null;
  motivation: string | null;
  experience: string | null;
  email: string | null;
  phone: string | null;
  extra: Record<string, string>;
}

const SKIP_KEYS = /e?-?mail|t[eé]l[eé]?phone?|phone|mobile|num[eé]ro|pr[eé]nom|nom|name/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractDisplayFields(
  info: Record<string, string>,
  prospectEmail?: string | null,
  prospectPhone?: string | null,
): ProspectDisplayFields {
  const result: ProspectDisplayFields = {
    objectif: null,
    blocage: null,
    timing: null,
    budget: null,
    motivation: null,
    experience: null,
    email: prospectEmail ?? null,
    phone: prospectPhone ?? null,
    extra: {},
  };

  const knownFields = new Set(["objectif", "blocage", "timing", "budget", "motivation", "experience"]);

  for (const [key, val] of Object.entries(info)) {
    if (!val?.trim()) continue;
    const normalized = normalizeKey(key);

    if (!result.email && /e?-?mail/i.test(key) && EMAIL_RE.test(val.trim())) {
      result.email = val.trim().toLowerCase();
      continue;
    }

    if (!result.phone && /t[eé]l[eé]?phone?|phone|mobile|num[eé]ro/i.test(key)) {
      result.phone = val.trim();
      continue;
    }

    if (knownFields.has(normalized)) {
      const k = normalized as "objectif" | "blocage" | "timing" | "budget" | "motivation" | "experience";
      if (!result[k]) {
        result[k] = val.trim();
        continue;
      }
    }

    if (!SKIP_KEYS.test(key) && !knownFields.has(normalized)) {
      result.extra[key] = val.trim();
    }
  }

  return result;
}

export function buildAiSummary(info: Record<string, string>): string | null {
  const fields = extractDisplayFields(info);
  const parts: string[] = [];

  if (fields.objectif) parts.push(`Objectif : ${fields.objectif}`);
  if (fields.blocage) parts.push(`Blocage : ${fields.blocage}`);
  if (fields.motivation) parts.push(`Motivation : ${fields.motivation}`);
  if (fields.timing) parts.push(`Timing : ${fields.timing}`);
  if (fields.budget) parts.push(`Budget : ${fields.budget}`);
  if (fields.experience) parts.push(`Expérience : ${fields.experience}`);

  if (parts.length === 0) return null;
  return parts.join(". ") + ".";
}
