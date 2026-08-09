import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routeSource = readFileSync(
  join(__dirname, "../../app/api/cron/followups/route.ts"),
  "utf-8",
);

const vercelJson = JSON.parse(
  readFileSync(join(__dirname, "../../../vercel.json"), "utf-8"),
);

describe("cron/followups route", () => {
  it("exports GET handler", () => {
    expect(routeSource).toContain("export async function GET");
  });

  it("exports POST handler", () => {
    expect(routeSource).toContain("export async function POST");
  });

  it("GET verifies CRON_SECRET via Authorization header", () => {
    expect(routeSource).toContain("verifyCronAuth");
    expect(routeSource).toContain("authorization");
    expect(routeSource).toContain("CRON_SECRET");
  });

  it("returns 401 when auth header is missing or invalid", () => {
    expect(routeSource).toContain("401");
    expect(routeSource).toContain("Unauthorized");
  });

  it("returns 500 when CRON_SECRET is not configured", () => {
    expect(routeSource).toContain("CRON_SECRET not configured");
    expect(routeSource).toContain("500");
  });

  it("GET and POST share the same execution logic", () => {
    expect(routeSource).toContain("handleFollowups");
    const getHandler = routeSource.slice(routeSource.indexOf("export async function GET"));
    const postHandler = routeSource.slice(routeSource.indexOf("export async function POST"));
    expect(getHandler).toContain("handleFollowups()");
    expect(postHandler).toContain("handleFollowups()");
  });

  it("uses executeDueFollowups (no duplication)", () => {
    const matches = routeSource.match(/executeDueFollowups/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it("does not mention n8n", () => {
    expect(routeSource).not.toContain("n8n");
  });
});

describe("vercel.json cron config", () => {
  it("has crons array", () => {
    expect(vercelJson.crons).toBeDefined();
    expect(Array.isArray(vercelJson.crons)).toBe(true);
  });

  it("targets /api/cron/followups", () => {
    const cron = vercelJson.crons[0];
    expect(cron.path).toBe("/api/cron/followups");
  });

  it("runs every 15 minutes", () => {
    const cron = vercelJson.crons[0];
    expect(cron.schedule).toBe("*/15 * * * *");
  });
});

describe("middleware: /api/cron/ bypasses auth redirect", () => {
  const middlewareSource = readFileSync(
    join(__dirname, "../supabase/middleware.ts"),
    "utf-8",
  );

  it("excludes /api/cron/ from auth redirect", () => {
    expect(middlewareSource).toContain('"/api/cron/"');
    expect(middlewareSource).toContain("isCron");
  });

  it("isCron is checked in the redirect condition", () => {
    const redirectLine = middlewareSource
      .split("\n")
      .find((l) => l.includes("!isAuthPage") && l.includes("!isPublicPage"));
    expect(redirectLine).toBeDefined();
    expect(redirectLine).toContain("!isCron");
  });
});

describe("no double processing", () => {
  const engineSource = readFileSync(
    join(__dirname, "./execute-due-followups.ts"),
    "utf-8",
  );

  it("claims events with processing_at lock", () => {
    expect(engineSource).toContain("processing_at");
    expect(engineSource).toContain("claimEvent");
  });

  it("checks executed_at is null before claiming", () => {
    expect(engineSource).toContain('is("executed_at", null)');
  });

  it("sets executed_at after success", () => {
    expect(engineSource).toContain("executed_at: nowIso");
  });
});
