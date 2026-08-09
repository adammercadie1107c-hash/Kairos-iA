import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(
  body: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;

  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
