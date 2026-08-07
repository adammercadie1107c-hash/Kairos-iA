import { describe, it, expect } from "vitest";
import { mergeExtractedInfo } from "./merge-info";

describe("mergeExtractedInfo", () => {
  it("adds new fields from incoming", () => {
    const existing = { objectif: "perdre du poids" };
    const incoming = { budget: "500€" };
    const result = mergeExtractedInfo(existing, incoming);
    expect(result).toEqual({ objectif: "perdre du poids", budget: "500€" });
  });

  it("does not overwrite existing with null", () => {
    const existing = { objectif: "perdre du poids" };
    const incoming = { objectif: null as unknown as string };
    const result = mergeExtractedInfo(existing, incoming);
    expect(result.objectif).toBe("perdre du poids");
  });

  it("does not overwrite existing with empty string", () => {
    const existing = { objectif: "perdre du poids" };
    const incoming = { objectif: "" };
    const result = mergeExtractedInfo(existing, incoming);
    expect(result.objectif).toBe("perdre du poids");
  });

  it("does not overwrite existing with shorter/less precise value", () => {
    const existing = { objectif: "Perdre 10kg en 3 mois pour un mariage" };
    const incoming = { objectif: "perdre du poids" };
    const result = mergeExtractedInfo(existing, incoming);
    expect(result.objectif).toBe("Perdre 10kg en 3 mois pour un mariage");
  });

  it("overwrites with a more precise (longer) value", () => {
    const existing = { objectif: "perdre du poids" };
    const incoming = { objectif: "Perdre 10kg en 3 mois pour un mariage" };
    const result = mergeExtractedInfo(existing, incoming);
    expect(result.objectif).toBe("Perdre 10kg en 3 mois pour un mariage");
  });

  it("returns existing unchanged when incoming is undefined", () => {
    const existing = { objectif: "perdre du poids" };
    const result = mergeExtractedInfo(existing, undefined);
    expect(result).toEqual(existing);
  });

  it("returns existing unchanged when incoming is empty", () => {
    const existing = { objectif: "perdre du poids" };
    const result = mergeExtractedInfo(existing, {});
    expect(result).toEqual(existing);
  });

  it("accumulates info across multiple merges", () => {
    let info: Record<string, string> = {};
    info = mergeExtractedInfo(info, { objectif: "perdre du poids" });
    info = mergeExtractedInfo(info, { budget: "500€" });
    info = mergeExtractedInfo(info, { timing: "3 mois" });
    expect(info).toEqual({
      objectif: "perdre du poids",
      budget: "500€",
      timing: "3 mois",
    });
  });

  it("trims whitespace from incoming values", () => {
    const result = mergeExtractedInfo({}, { objectif: "  perdre du poids  " });
    expect(result.objectif).toBe("perdre du poids");
  });
});
