import { describe, it, expect } from "vitest";
import { checkProspectFit } from "./fit-check";

describe("checkProspectFit", () => {
  const baseRules = {
    accepted_goals: ["perte de poids", "perdre du poids", "perte de gras", "perdre du gras", "sèche", "mincir", "maigrir"],
    rejected_goals: ["prise de masse", "bodybuilding", "musculation"],
  };

  it("A: objectif compatible → FIT", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "perdre 5 kg" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("FIT");
  });

  it("A: variante perte de gras → FIT", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "je veux faire une sèche" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("FIT");
  });

  it("B: objectif hors cible → NOT_A_FIT", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "prise de masse musculaire" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("NOT_A_FIT");
  });

  it("B: objectif hors cible via rejected_goals → NOT_A_FIT", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "je fais du bodybuilding" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("NOT_A_FIT");
  });

  it("C: objectif ambigu → NOT_A_FIT (not in accepted list)", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "me remettre en forme" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("NOT_A_FIT");
  });

  it("C: pas d'objectif encore → UNCERTAIN", () => {
    expect(
      checkProspectFit({
        extractedInfo: {},
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("UNCERTAIN");
  });

  it("D: changement objectif — prise de masse → perte de poids → FIT", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "en fait je veux surtout perdre du gras" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("FIT");
  });

  it("no rules configured → always UNCERTAIN", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "prise de masse" },
        offer: "Programme perte de poids",
        qualificationRules: {},
      }),
    ).toBe("UNCERTAIN");
  });

  it("only accepted_goals, no rejected → NOT_A_FIT for unknown goal", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "prise de masse" },
        offer: "Programme perte de poids",
        qualificationRules: { accepted_goals: ["perte de poids"] },
      }),
    ).toBe("NOT_A_FIT");
  });

  it("case-insensitive matching", () => {
    expect(
      checkProspectFit({
        extractedInfo: { objectif: "PERTE DE POIDS" },
        offer: "Programme perte de poids",
        qualificationRules: baseRules,
      }),
    ).toBe("FIT");
  });
});
