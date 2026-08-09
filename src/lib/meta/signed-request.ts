import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
  [key: string]: unknown;
}

export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;

  const sig = Buffer.from(
    encodedSig.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );

  const expected = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const decoded = Buffer.from(
      encodedPayload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");

    const payload = JSON.parse(decoded) as SignedRequestPayload;

    if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") return null;
    if (!payload.user_id) return null;

    return payload;
  } catch {
    return null;
  }
}
