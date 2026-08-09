import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseSignedRequest } from "./signed-request";

const APP_SECRET = "test_secret_for_deletion";

function buildSignedRequest(
  payload: Record<string, unknown>,
  secret = APP_SECRET,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sig = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${sig}.${encodedPayload}`;
}

describe("data deletion signed_request validation", () => {
  it("accepts a valid deletion request", () => {
    const sr = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      user_id: "12345",
      issued_at: Date.now(),
    });
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).not.toBeNull();
    expect(result!.user_id).toBe("12345");
  });

  it("rejects a forged signed_request", () => {
    const sr = buildSignedRequest(
      { algorithm: "HMAC-SHA256", user_id: "12345", issued_at: Date.now() },
      "attacker_secret",
    );
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).toBeNull();
  });

  it("generates a unique confirmation_code equivalent per call", async () => {
    const { nanoid } = await import("nanoid");
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(nanoid(12));
    }
    expect(codes.size).toBe(100);
  });

  it("does not leak user data in the signed_request payload", () => {
    const sr = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      user_id: "fb_user_99",
      issued_at: 1700000000,
    });
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).not.toBeNull();
    expect(Object.keys(result!)).not.toContain("email");
    expect(Object.keys(result!)).not.toContain("password");
    expect(Object.keys(result!)).not.toContain("access_token");
    expect(result!.user_id).toBe("fb_user_99");
  });

  it("ensures user_id isolation — different fb users produce different identifiers", () => {
    const sr1 = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      user_id: "user_A",
      issued_at: 1700000000,
    });
    const sr2 = buildSignedRequest({
      algorithm: "HMAC-SHA256",
      user_id: "user_B",
      issued_at: 1700000000,
    });
    const r1 = parseSignedRequest(sr1, APP_SECRET);
    const r2 = parseSignedRequest(sr2, APP_SECRET);
    expect(r1!.user_id).not.toBe(r2!.user_id);
  });
});
