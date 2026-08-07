import { describe, it, expect } from "vitest";
import { extractDisplayFields, buildAiSummary } from "./extract-display-fields";

describe("extractDisplayFields", () => {
  it("extracts known qualification fields", () => {
    const info = {
      objectif: "Perdre 10kg",
      blocage: "Manque de temps",
      timing: "Dans 3 mois",
      budget: "200 EUR/mois",
      motivation: "Mariage en juin",
      experience: "Salle de sport il y a 2 ans",
    };

    const result = extractDisplayFields(info);

    expect(result.objectif).toBe("Perdre 10kg");
    expect(result.blocage).toBe("Manque de temps");
    expect(result.timing).toBe("Dans 3 mois");
    expect(result.budget).toBe("200 EUR/mois");
    expect(result.motivation).toBe("Mariage en juin");
    expect(result.experience).toBe("Salle de sport il y a 2 ans");
    expect(Object.keys(result.extra)).toHaveLength(0);
  });

  it("normalizes variant keys", () => {
    const info = {
      "experience passee": "CrossFit",
      delai: "Immédiat",
      goal: "Se muscler",
      blocages: "Douleur au genou",
    };

    const result = extractDisplayFields(info);

    expect(result.experience).toBe("CrossFit");
    expect(result.timing).toBe("Immédiat");
    expect(result.objectif).toBe("Se muscler");
    expect(result.blocage).toBe("Douleur au genou");
  });

  it("extracts email and phone from extracted_info", () => {
    const info = {
      email: "test@example.com",
      "téléphone": "+33612345678",
    };

    const result = extractDisplayFields(info);

    expect(result.email).toBe("test@example.com");
    expect(result.phone).toBe("+33612345678");
  });

  it("prefers prospect email/phone over extracted_info", () => {
    const info = {
      email: "info@example.com",
      phone: "+33600000000",
    };

    const result = extractDisplayFields(info, "prospect@test.com", "+33699999999");

    expect(result.email).toBe("prospect@test.com");
    expect(result.phone).toBe("+33699999999");
  });

  it("puts unknown keys in extra", () => {
    const info = {
      objectif: "Maigrir",
      "sport préféré": "Natation",
      "régime actuel": "Végétarien",
    };

    const result = extractDisplayFields(info);

    expect(result.objectif).toBe("Maigrir");
    expect(result.extra["sport préféré"]).toBe("Natation");
    expect(result.extra["régime actuel"]).toBe("Végétarien");
  });

  it("returns nulls for empty extracted_info", () => {
    const result = extractDisplayFields({});

    expect(result.objectif).toBeNull();
    expect(result.blocage).toBeNull();
    expect(result.timing).toBeNull();
    expect(result.budget).toBeNull();
    expect(result.motivation).toBeNull();
    expect(result.experience).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(Object.keys(result.extra)).toHaveLength(0);
  });

  it("skips empty values", () => {
    const info = {
      objectif: "",
      blocage: "  ",
      timing: "Mars 2025",
    };

    const result = extractDisplayFields(info);

    expect(result.objectif).toBeNull();
    expect(result.blocage).toBeNull();
    expect(result.timing).toBe("Mars 2025");
  });
});

describe("buildAiSummary", () => {
  it("builds summary from qualification fields", () => {
    const info = {
      objectif: "Perdre 10kg",
      blocage: "Pas le temps",
      motivation: "Haute",
    };

    const summary = buildAiSummary(info);

    expect(summary).toContain("Objectif : Perdre 10kg");
    expect(summary).toContain("Blocage : Pas le temps");
    expect(summary).toContain("Motivation : Haute");
  });

  it("returns null when no qualification fields", () => {
    const info = {
      email: "a@b.com",
      "sport préféré": "Running",
    };

    expect(buildAiSummary(info)).toBeNull();
  });

  it("returns null for empty info", () => {
    expect(buildAiSummary({})).toBeNull();
  });

  it("includes only available fields in correct order", () => {
    const info = {
      timing: "Septembre",
      budget: "300 EUR",
    };

    const summary = buildAiSummary(info)!;
    const timingIdx = summary.indexOf("Timing");
    const budgetIdx = summary.indexOf("Budget");
    expect(timingIdx).toBeLessThan(budgetIdx);
  });
});
