import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("callback subscribePageToApp handling", () => {
  const callbackSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/callback/route.ts"),
    "utf-8",
  );

  it("calls subscribePageToApp", () => {
    expect(callbackSource).toContain("subscribePageToApp(pageId,");
  });

  it("does not block channel creation when subscription fails (returns false)", () => {
    expect(callbackSource).toContain("webhookSubscribed = false");
    expect(callbackSource).not.toContain('return redirectWithError("webhook_subscription_failed")');
  });

  it("catches exceptions from subscribePageToApp without blocking", () => {
    expect(callbackSource).toContain("catch (subErr)");
    expect(callbackSource).toContain("webhook subscription error — continuing");
  });

  it("channel upsert runs regardless of subscription outcome", () => {
    const subCallIndex = callbackSource.indexOf("await subscribePageToApp(");
    const upsertIndex = callbackSource.indexOf(".upsert(");
    expect(subCallIndex).toBeGreaterThan(-1);
    expect(upsertIndex).toBeGreaterThan(subCallIndex);
    const between = callbackSource.slice(subCallIndex, upsertIndex);
    expect(between).not.toContain("return redirectWithError");
  });

  it("sets webhook_warning query param when subscription fails", () => {
    expect(callbackSource).toContain("webhook_warning=true");
  });

  it("redirects with connected=true in both success and failure cases", () => {
    expect(callbackSource).toContain("connected=true");
    const matches = callbackSource.match(/connected=true/g);
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("logs failure without exposing tokens", () => {
    const logLines = callbackSource
      .split("\n")
      .filter((l) => l.includes("webhook subscription"));
    expect(logLines.length).toBeGreaterThanOrEqual(2);
    for (const line of logLines) {
      expect(line).not.toMatch(/access.?token/i);
      expect(line).not.toMatch(/secret/i);
    }
  });
});
