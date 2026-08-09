import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhookSource = readFileSync(
  join(__dirname, "../../app/api/webhooks/instagram/route.ts"),
  "utf-8",
);

describe("webhook: coach alert creation", () => {
  it("creates alert on request_human_confirmation", () => {
    expect(webhookSource).toContain('decision.action === "request_human_confirmation"');
    expect(webhookSource).toContain('coach_alerts');
  });

  it("creates alert on escalate/handoff", () => {
    expect(webhookSource).toContain('decision.action === "escalate"');
    const escalateSection = webhookSource.slice(
      webhookSource.indexOf('decision.action === "escalate"'),
    );
    expect(escalateSection).toContain('coach_alerts');
  });

  it("sets correct alert type for commercial questions", () => {
    expect(webhookSource).toContain('"commercial_question"');
  });

  it("sets correct alert type for handoff", () => {
    const lines = webhookSource.split("\n");
    const handoffAlertLines = lines.filter(
      (l) => l.includes("handoff") && l.includes("type:"),
    );
    expect(handoffAlertLines.length).toBeGreaterThan(0);
  });

  it("stores prospect question in alert", () => {
    expect(webhookSource).toContain("prospect_question: text");
  });

  it("stores metadata with reason_code and source", () => {
    expect(webhookSource).toContain("reason_code: decision.reason_code");
    expect(webhookSource).toContain('source: "instagram"');
  });

  it("does NOT set ai_enabled=false for request_human_confirmation", () => {
    const rhcSection = webhookSource.slice(
      webhookSource.indexOf('request_human_confirmation"'),
      webhookSource.indexOf('decision.action === "escalate"'),
    );
    expect(rhcSection).not.toContain("ai_enabled");
  });

  it("sets ai_enabled=false only for escalate", () => {
    expect(webhookSource).toContain('decision.action === "escalate"');
    const escalateBlock = webhookSource.slice(
      webhookSource.indexOf('if (decision.action === "escalate")'),
      webhookSource.indexOf('if (decision.action === "escalate")') + 200,
    );
    expect(escalateBlock).toContain("ai_enabled");
  });
});

describe("webhook: anti-repetition context", () => {
  it("extracts recent agent questions", () => {
    expect(webhookSource).toContain("extractRecentAgentQuestions");
  });

  it("passes recentAgentQuestions to runAgent context", () => {
    expect(webhookSource).toContain("recentAgentQuestions");
    const runAgentCall = webhookSource.slice(
      webhookSource.indexOf("runAgent("),
    );
    expect(runAgentCall).toContain("recentAgentQuestions");
  });
});

describe("webhook: no regression on existing behavior", () => {
  it("still handles escalate with ai_enabled=false and handoff status", () => {
    expect(webhookSource).toContain('updates.ai_enabled = false');
    expect(webhookSource).toContain('updates.status = "handoff"');
  });

  it("still handles schedule_followup", () => {
    expect(webhookSource).toContain('decision.action === "schedule_followup"');
    expect(webhookSource).toContain("scheduled_events");
  });

  it("still sends message via Instagram", () => {
    expect(webhookSource).toContain("sendInstagramMessage");
  });

  it("still syncs to CRM on qualification", () => {
    expect(webhookSource).toContain("syncQualifiedContactToProspect");
  });

  it("still merges extracted_info", () => {
    expect(webhookSource).toContain("mergeExtractedInfo");
  });

  it("has NO signature bypass — strict 401 rejection", () => {
    expect(webhookSource).not.toContain("P1-BLOCKER");
    expect(webhookSource).not.toContain("processing anyway");
    expect(webhookSource).not.toContain("bypass");
    expect(webhookSource).toContain("invalid signature");
    expect(webhookSource).toContain("401");
  });
});
