import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_SCOPES = [
  "pages_show_list",
  "instagram_basic",
  "instagram_manage_messages",
  "pages_manage_metadata",
];

const REMOVED_SCOPES = [
  "pages_read_engagement",
  "business_management",
];

describe("OAuth scopes", () => {
  const routeSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/route.ts"),
    "utf-8",
  );

  it("requests exactly the minimal required scopes", () => {
    for (const scope of EXPECTED_SCOPES) {
      expect(routeSource).toContain(`"${scope}"`);
    }
  });

  it("does not request removed scopes", () => {
    for (const scope of REMOVED_SCOPES) {
      expect(routeSource).not.toContain(`"${scope}"`);
    }
  });

  it("scopes list has exactly 4 entries", () => {
    const match = routeSource.match(/const scopes = \[([\s\S]*?)\]\.join/);
    expect(match).not.toBeNull();
    const entries = match![1].match(/"/g);
    expect(entries!.length).toBe(EXPECTED_SCOPES.length * 2);
  });
});

describe("API version consistency", () => {
  const oauthSource = readFileSync(
    join(__dirname, "./oauth.ts"),
    "utf-8",
  );
  const sendSource = readFileSync(
    join(__dirname, "./send.ts"),
    "utf-8",
  );

  it("oauth.ts uses v21.0", () => {
    expect(oauthSource).toContain("v21.0");
    expect(oauthSource).not.toContain("v20.0");
  });

  it("send.ts uses v21.0", () => {
    expect(sendSource).toContain("v21.0");
  });

  it("both files use the same API version", () => {
    const oauthVersion = oauthSource.match(/v\d+\.\d+/)?.[0];
    const sendVersion = sendSource.match(/v\d+\.\d+/)?.[0];
    expect(oauthVersion).toBe(sendVersion);
  });
});
