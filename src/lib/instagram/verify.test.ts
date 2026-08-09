import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature } from "./verify";

const BODY = '{"object":"instagram","entry":[]}';
const SECRET = "test_secret_abc123";
const VALID_SIG =
  "sha256=" + createHmac("sha256", SECRET).update(BODY).digest("hex");

describe("verifySignature", () => {
  it("accepts a correct HMAC-SHA256 signature", () => {
    expect(verifySignature(BODY, VALID_SIG, SECRET)).toBe(true);
  });

  it("accepts the precomputed vector", () => {
    expect(
      verifySignature(
        BODY,
        "sha256=b397223235aff248809b4cd0e16c4d6a6cdfd00bb9e070b217bfe5ae8dd769a0",
        SECRET,
      ),
    ).toBe(true);
  });

  it("rejects when body is modified", () => {
    expect(verifySignature(BODY + " ", VALID_SIG, SECRET)).toBe(false);
  });

  it("rejects when secret is wrong", () => {
    expect(verifySignature(BODY, VALID_SIG, "wrong_secret")).toBe(false);
  });

  it("rejects when signature is null", () => {
    expect(verifySignature(BODY, null, SECRET)).toBe(false);
  });

  it("rejects when signature has wrong prefix", () => {
    const badPrefix = "sha1=" + VALID_SIG.slice(7);
    expect(verifySignature(BODY, badPrefix, SECRET)).toBe(false);
  });

  it("rejects a truncated signature", () => {
    expect(verifySignature(BODY, VALID_SIG.slice(0, -4), SECRET)).toBe(false);
  });

  it("rejects an empty signature string", () => {
    expect(verifySignature(BODY, "", SECRET)).toBe(false);
  });
});
