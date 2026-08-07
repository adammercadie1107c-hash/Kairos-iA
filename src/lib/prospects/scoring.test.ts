import { describe, it, expect } from "vitest";
import { computeProspectScore } from "./scoring";

describe("computeProspectScore", () => {
  it("returns maximum score when all fields present + booking_sent", () => {
    const info = {
      objectif: "Perdre 10kg",
      blocage: "Manque de temps",
      timing: "Dans 3 mois",
      motivation: "Mariage en juin",
      budget: "200 EUR/mois",
    };
    const result = computeProspectScore(info, "booking_sent");

    expect(result.score).toBe(100);
    expect(result.level).toBe("fort");
    expect(result.missing).toHaveLength(0);
    expect(result.reasons).toHaveLength(6);
  });

  it("scores 85 when all fields present but no booking", () => {
    const info = {
      objectif: "Se muscler",
      blocage: "Pas de salle",
      timing: "Immédiat",
      motivation: "Compétition",
      budget: "150 EUR",
    };
    const result = computeProspectScore(info, "qualified");

    expect(result.score).toBe(85);
    expect(result.level).toBe("fort");
    expect(result.missing).toEqual(["Intention de réserver / booking_sent"]);
  });

  it("returns 0 when no fields and no booking", () => {
    const result = computeProspectScore({});

    expect(result.score).toBe(0);
    expect(result.level).toBe("faible");
    expect(result.reasons).toHaveLength(0);
    expect(result.missing).toHaveLength(6);
  });

  it("scores correctly when budget is absent", () => {
    const info = {
      objectif: "Maigrir",
      blocage: "Temps",
      timing: "Septembre",
      motivation: "Haute",
    };
    const result = computeProspectScore(info);

    expect(result.score).toBe(65);
    expect(result.level).toBe("moyen");
    expect(result.missing).toContain("Capacité / volonté d'investissement");
  });

  it("scores correctly when timing is absent", () => {
    const info = {
      objectif: "Maigrir",
      blocage: "Temps",
      motivation: "Haute",
      budget: "100 EUR",
    };
    const result = computeProspectScore(info);

    expect(result.score).toBe(65);
    expect(result.level).toBe("moyen");
    expect(result.missing).toContain("Timing défini");
  });

  it("booking_sent adds 15 points", () => {
    const info = { objectif: "Perdre du poids" };
    const without = computeProspectScore(info, "qualifying");
    const with_ = computeProspectScore(info, "booking_sent");

    expect(with_.score - without.score).toBe(15);
  });

  it("normalizes variant keys correctly", () => {
    const info = {
      goal: "Se muscler",
      blocages: "Douleur",
      delai: "Mars",
      interet: "Élevé",
      "capacite investissement": "Oui",
    };
    const result = computeProspectScore(info);

    expect(result.score).toBe(85);
    expect(result.level).toBe("fort");
  });

  it("skips empty values", () => {
    const info = {
      objectif: "Perdre 5kg",
      blocage: "",
      timing: "  ",
    };
    const result = computeProspectScore(info);

    expect(result.score).toBe(20);
    expect(result.missing).toContain("Blocage identifié");
    expect(result.missing).toContain("Timing défini");
  });

  it("level boundaries: 39 = faible, 40 = moyen, 69 = moyen, 70 = fort", () => {
    const info39 = { objectif: "Test", timing: "Demain" };
    expect(computeProspectScore(info39).score).toBe(40);
    expect(computeProspectScore(info39).level).toBe("moyen");

    const info20 = { objectif: "Test" };
    expect(computeProspectScore(info20).score).toBe(20);
    expect(computeProspectScore(info20).level).toBe("faible");

    const infoAll = {
      objectif: "a",
      blocage: "b",
      timing: "c",
      motivation: "d",
      budget: "e",
    };
    expect(computeProspectScore(infoAll, "qualifying").score).toBe(85);
    expect(computeProspectScore(infoAll, "qualifying").level).toBe("fort");
  });

  it("uses investissement as alternative to budget", () => {
    const info = { investissement: "Prêt à investir 500 EUR" };
    const result = computeProspectScore(info);

    expect(result.criteria.find((c) => c.key === "investissement")?.met).toBe(true);
    expect(result.score).toBe(20);
  });

  it("null conversationStatus does not give booking points", () => {
    const result = computeProspectScore({ objectif: "Test" }, null);
    expect(result.criteria.find((c) => c.key === "booking")?.met).toBe(false);
  });
});
