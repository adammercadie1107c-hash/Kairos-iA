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

  // B variant: extracted_info alone triggers intent
  it("B: extracted_info with greeting reason → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "greeting" }),
      { objectif: "perdre du poids" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
  });

  // C. ghosting case — same as B, prospect stays
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

  // D. qualification complete → updates same prospect to contacte
  it("D: qualified status → intent, status contacte", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "all_fields_collected" }),
      { objectif: "perdre 5 kg", budget: "500€", timing: "3 mois" },
      "qualified",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("contacte");
  });

  // E. "Combien coûte ton coaching ?" → prospect created
  it("E: faq_answer with extracted_info → intent", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "faq_answer" }),
      { interet: "prix coaching" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
  });

  // E variant: commercial_unknown triggers intent
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

  // G. NOT_A_FIT with commercial intent → prospect created as perdu
  it("G: not_a_fit → intent with perdu status", () => {
    const result = detectCommercialIntent(
      makeDecision({ reason_code: "not_a_fit" }),
      { objectif: "prise de masse" },
      "qualifying",
    );
    expect(result.hasIntent).toBe(true);
    expect(result.prospectStatus).toBe("perdu");
  });

  // H. booking_sent → updates existing prospect
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
