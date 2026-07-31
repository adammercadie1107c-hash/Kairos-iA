import { createHmac } from "node:crypto";

export function verifySignature(
  body: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;

  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");

  if (expected.length !== signature.length) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
