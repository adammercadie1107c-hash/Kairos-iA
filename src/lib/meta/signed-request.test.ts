import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseSignedRequest } from "./signed-request";

const APP_SECRET = "test_app_secret_123";

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

const VALID_PAYLOAD = {
  algorithm: "HMAC-SHA256",
  user_id: "fb_user_42",
  issued_at: 1700000000,
};

describe("parseSignedRequest", () => {
  it("accepts a valid signed_request and returns the payload", () => {
    const sr = buildSignedRequest(VALID_PAYLOAD);
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).not.toBeNull();
    expect(result!.user_id).toBe("fb_user_42");
    expect(result!.algorithm).toBe("HMAC-SHA256");
    expect(result!.issued_at).toBe(1700000000);
  });

  it("rejects when signature is wrong (different secret)", () => {
    const sr = buildSignedRequest(VALID_PAYLOAD, "wrong_secret");
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).toBeNull();
  });

  it("rejects when signed_request has no dot separator", () => {
    const result = parseSignedRequest("nodot", APP_SECRET);
    expect(result).toBeNull();
  });

  it("rejects when payload is corrupted", () => {
    const sr = buildSignedRequest(VALID_PAYLOAD);
    const [sig] = sr.split(".");
    const result = parseSignedRequest(`${sig}.corrupted`, APP_SECRET);
    expect(result).toBeNull();
  });

  it("rejects when algorithm is not HMAC-SHA256", () => {
    const sr = buildSignedRequest({ ...VALID_PAYLOAD, algorithm: "SHA-1" });
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).toBeNull();
  });

  it("rejects when user_id is missing", () => {
    const { user_id: _, ...noUserId } = VALID_PAYLOAD;
    void _;
    const sr = buildSignedRequest({ ...noUserId, algorithm: "HMAC-SHA256" });
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).toBeNull();
  });

  it("returns the confirmation_code when present in payload", () => {
    const sr = buildSignedRequest({ ...VALID_PAYLOAD, extra: "value" });
    const result = parseSignedRequest(sr, APP_SECRET);
    expect(result).not.toBeNull();
    expect(result!.extra).toBe("value");
  });

  it("rejects an empty string", () => {
    const result = parseSignedRequest("", APP_SECRET);
    expect(result).toBeNull();
  });
});
