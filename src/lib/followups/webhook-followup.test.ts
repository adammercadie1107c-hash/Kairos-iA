import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhookSource = readFileSync(
  join(__dirname, "../../app/api/webhooks/instagram/route.ts"),
  "utf-8",
);

describe("webhook: deterministic first followup fallback", () => {
  it("imports ensureFollowupScheduled", () => {
    expect(webhookSource).toContain("ensureFollowupScheduled");
    expect(webhookSource).toContain("@/lib/followups/ensure-followup");
  });

  it("calls ensureFollowupScheduled after commercial intent check", () => {
    const intentIdx = webhookSource.indexOf("detectCommercialIntent");
    const ensureIdx = webhookSource.indexOf("ensureFollowupScheduled(supabase");
    expect(intentIdx).toBeGreaterThan(-1);
    expect(ensureIdx).toBeGreaterThan(intentIdx);
  });

  it("skips fallback when LLM already chose schedule_followup", () => {
    expect(webhookSource).toContain('decision.action !== "schedule_followup"');
  });

  it("skips fallback for handoff status", () => {
    expect(webhookSource).toContain('"handoff"');
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("Deterministic first followup"),
    );
    expect(fallbackSection).toContain("handoff");
  });

  it("skips fallback for booking_sent status", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("FOLLOWUP_EXCLUDED"),
    );
    expect(fallbackSection).toContain("booking_sent");
  });

  it("skips fallback for disqualified status", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("FOLLOWUP_EXCLUDED"),
    );
    expect(fallbackSection).toContain("disqualified");
  });

  it("skips fallback for closed status", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("FOLLOWUP_EXCLUDED"),
    );
    expect(fallbackSection).toContain("closed");
  });

  it("only triggers when intent.hasIntent is true", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("Deterministic first followup"),
      webhookSource.indexOf("Save agent log"),
    );
    expect(fallbackSection).toContain("intent.hasIntent");
  });

  it("passes maxFollowups and currentFollowupCount", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("ensureFollowupScheduled(supabase"),
    );
    expect(fallbackSection).toContain("maxFollowups");
    expect(fallbackSection).toContain("currentFollowupCount");
    expect(fallbackSection).toContain("followup_count");
  });

  it("catches errors without crashing webhook", () => {
    const fallbackSection = webhookSource.slice(
      webhookSource.indexOf("Deterministic first followup"),
      webhookSource.indexOf("Save agent log"),
    );
    expect(fallbackSection).toContain("catch");
    expect(fallbackSection).toContain("followupErr");
  });
});
