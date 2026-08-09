import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhookSource = readFileSync(
  join(__dirname, "../../app/api/webhooks/instagram/route.ts"),
  "utf-8",
);

describe("webhook: signature enforcement", () => {
  it("rejects invalid signature with 401 before any processing", () => {
    const sigCheckIndex = webhookSource.indexOf("!signatureValid");
    const parseIndex = webhookSource.indexOf("JSON.parse(rawBody)");
    expect(sigCheckIndex).toBeGreaterThan(-1);
    expect(parseIndex).toBeGreaterThan(-1);
    expect(sigCheckIndex).toBeLessThan(parseIndex);
  });

  it("returns 401 on invalid signature", () => {
    const block = webhookSource.slice(
      webhookSource.indexOf("if (!signatureValid)"),
      webhookSource.indexOf("if (!signatureValid)") + 300,
    );
    expect(block).toContain("401");
    expect(block).toContain("return");
  });

  it("returns early — no supabase call when signature fails", () => {
    const postFn = webhookSource.indexOf("export async function POST");
    const sigCheck = webhookSource.indexOf("if (!signatureValid)", postFn);
    const returnAfterSig = webhookSource.indexOf("return", sigCheck);
    const supabaseCall = webhookSource.indexOf("createServiceClient", postFn);
    expect(returnAfterSig).toBeLessThan(supabaseCall);
  });

  it("returns early — no agent call when signature fails", () => {
    const postFn = webhookSource.indexOf("export async function POST");
    const sigCheck = webhookSource.indexOf("if (!signatureValid)", postFn);
    const returnAfterSig = webhookSource.indexOf("return", sigCheck);
    const agentCall = webhookSource.indexOf("handleInboundMessage", postFn + 100);
    expect(returnAfterSig).toBeLessThan(agentCall);
  });

  it("has NO bypass, no P1-BLOCKER, no processing-anyway fallback", () => {
    expect(webhookSource).not.toContain("P1-BLOCKER");
    expect(webhookSource).not.toContain("processing anyway");
    expect(webhookSource).not.toContain("bypass");
  });

  it("calls verifySignature before any business logic", () => {
    const verifyCall = webhookSource.indexOf("verifySignature(");
    const handleMsg = webhookSource.indexOf("handleInboundMessage");
    expect(verifyCall).toBeGreaterThan(-1);
    expect(handleMsg).toBeGreaterThan(-1);
    expect(verifyCall).toBeLessThan(handleMsg);
  });

  it("requires META_APP_SECRET — returns 500 if missing", () => {
    const secretCheck = webhookSource.indexOf("!appSecret");
    expect(secretCheck).toBeGreaterThan(-1);
    const block = webhookSource.slice(secretCheck, secretCheck + 200);
    expect(block).toContain("500");
  });
});
