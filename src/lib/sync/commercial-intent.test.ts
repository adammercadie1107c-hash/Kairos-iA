import { describe, it, expect } from "vitest";
import { detectCommercialIntent } from "./commercial-intent";
import type { AgentDecision } from "@/lib/agent/schema";

function makeDecision(overrides: Partial<AgentDecision>): AgentDecision {
  return {
    action: "reply",
    message: "test",
    reason_code: "greeting",
    handoff_reason: null,
    confidence: 0.8,
    ...overrides,
  };
}

describe("detectCommercialIntent", () => {
  // A. "Salut" → no prospect
  it("A: greeting with no extracted_info → no intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "salut",
    );
    expect(result.hasIntent).toBe(false);
  });

  it("A: 'merci' → no intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "merci",
    );
    expect(result.hasIntent).toBe(false);
  });

  it("A: emoji only → no intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "👋",
    );
    expect(result.hasIntent).toBe(false);
  });

  // B. "Je veux perdre 5 kg" → prospect created
  it("B: extracted objectif → intent, status nouveau", () => {
    const result = detectCommercialIntent(
      makeDecision({
        action: "ask_qualification",
        reason_code: "qualification_progress",
      }),
      { objectif: "perdre 5 kg" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("nouveau");
  });

  it("B: extracted_info with greeting reason → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      { objectif: "perdre du poids" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
  });

  // C. ghosting case
  it("C: qualification_progress action → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({
        action: "ask_qualification",
        reason_code: "qualification_progress",
      }),
      {},
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("nouveau");
  });

  // D. qualification complete → contacte
  it("D: qualified status → intent, status contacte", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "all_fields_collected" }),
      { objectif: "perdre 5 kg", budget: "500€", timing: "3 mois" },
      "qualified",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("contacte");
  });

  // E. Price/FAQ questions → prospect created
  it("E: faq_answer reason_code → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "faq_answer" }),
      {},
      "qualifying",
      "combien ça coûte ?",
    );
    expect(result.hasIntent).toBe(true);
  });

  it("E: commercial_unknown → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({
        action: "request_human_confirmation",
        reason_code: "commercial_unknown",
      }),
      {},
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
  });

  // F. off-topic → no prospect
  it("F: off_topic → no intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "off_topic" }),
      {},
      "new",
      "quel temps fait-il ?",
    );
    expect(result.hasIntent).toBe(false);
  });

  it("F: sensitive_topic → no intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "sensitive_topic" }),
      {},
      "new",
    );
    expect(result.hasIntent).toBe(false);
  });

  // G. NOT_A_FIT → perdu
  it("G: not_a_fit → intent with perdu status", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "not_a_fit" }),
      { objectif: "prise de masse" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("perdu");
  });

  // H. booking_sent → contacte
  it("H: booking_sent status → intent, status contacte", () => {
    const result = detectCommercialIntent(
      makeDecision({
        action: "send_booking",
        reason_code: "booking_ready",
      }),
      { objectif: "perdre 5 kg", budget: "500€", timing: "3 mois" },
      "booking_sent",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("contacte");
  });

  it("objection_handled → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "objection_handled" }),
      { objectif: "perdre 5 kg" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
  });

  it("send_booking action → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ action: "send_booking", reason_code: "booking_ready" }),
      {},
      "qualified",
    );
    expect(result.hasIntent).toBe(true);
  });
});

describe("price/offer keyword detection", () => {
  it('"quel est le prix" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "hello quel est le prix",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("nouveau");
  });

  it('"c\'est combien ?" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "c'est combien ?",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"combien coûte le coaching ?" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "faq_answer" }),
      {},
      "new",
      "combien coûte le coaching ?",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"vous avez quels tarifs ?" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "vous avez quels tarifs ?",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"je voudrais connaître le prix de l\'accompagnement" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "je voudrais connaître le prix de l'accompagnement",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"je veux commencer un accompagnement" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "je veux commencer un accompagnement",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"je cherche un coaching" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "je cherche un coaching",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"je veux m\'inscrire" → intent', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "je veux m'inscrire",
    );
    expect(result.hasIntent).toBe(true);
  });

  it('"salut" seul → no intent (pas de keyword commercial)', () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      {},
      "new",
      "salut",
    );
    expect(result.hasIntent).toBe(false);
  });

  it("off_topic avec mot prix → no intent (off_topic prioritaire)", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "off_topic" }),
      {},
      "new",
      "le prix du pétrole monte",
    );
    expect(result.hasIntent).toBe(false);
  });
});
