import { describe, it, expect } from "vitest";
import { z } from "zod";
import { AgentDecisionSchema } from "./schema";

describe("AgentDecisionSchema", () => {
  it("accepts request_human_confirmation action", () => {
    const result = z.safeParse(AgentDecisionSchema, {
      action: "request_human_confirmation",
      message: "Je n'ai pas cette information exacte, le coach pourra te la confirmer.",
      reason_code: "commercial_unknown",
      handoff_reason: null,
      confidence: 0.8,
      alert_reason: "Prospect demande un paiement en plusieurs fois",
    });
    expect(result.success).toBe(true);
  });

  it("accepts commercial_unknown reason_code", () => {
    const result = z.safeParse(AgentDecisionSchema, {
      action: "reply",
      message: "test",
      reason_code: "commercial_unknown",
      handoff_reason: null,
      confidence: 0.7,
    });
    expect(result.success).toBe(true);
  });

  it("still accepts all existing actions", () => {
    for (const action of ["reply", "ask_qualification", "send_booking", "escalate", "schedule_followup"]) {
      const result = z.safeParse(AgentDecisionSchema, {
        action,
        message: "test",
        reason_code: "greeting",
        handoff_reason: null,
        confidence: 0.7,
      });
      expect(result.success).toBe(true);
    }
  });

  it("alert_reason is optional", () => {
    const result = z.safeParse(AgentDecisionSchema, {
      action: "reply",
      message: "test",
      reason_code: "greeting",
      handoff_reason: null,
      confidence: 0.7,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = z.safeParse(AgentDecisionSchema, {
      action: "invalid_action",
      message: "test",
      reason_code: "greeting",
      handoff_reason: null,
      confidence: 0.7,
    });
    expect(result.success).toBe(false);
  });
});
