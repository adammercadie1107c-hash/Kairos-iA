import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("callback subscribePageToApp error handling", () => {
  const callbackSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/callback/route.ts"),
    "utf-8",
  );

  it("checks the return value of subscribePageToApp", () => {
    expect(callbackSource).toContain("const subscribed = await subscribePageToApp");
  });

  it("returns an error when subscription fails", () => {
    expect(callbackSource).toContain("if (!subscribed)");
    expect(callbackSource).toContain("webhook_subscription_failed");
  });

  it("logs the failure without exposing tokens", () => {
    expect(callbackSource).toContain("subscribePageToApp failed for page");
    const logLine = callbackSource
      .split("\n")
      .find((l) => l.includes("subscribePageToApp failed"));
    expect(logLine).toBeDefined();
    expect(logLine).not.toMatch(/access.?token/i);
    expect(logLine).not.toMatch(/secret/i);
  });
});
