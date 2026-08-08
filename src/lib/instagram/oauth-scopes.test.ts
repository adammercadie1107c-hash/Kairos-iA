import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
];

const REMOVED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
  "pages_manage_metadata",
];

describe("OAuth scopes", () => {
  const routeSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/route.ts"),
    "utf-8",
  );

  it("requests exactly the required Instagram Login scopes", () => {
    for (const scope of EXPECTED_SCOPES) {
      expect(routeSource).toContain(`"${scope}"`);
    }
  });

  it("does not request any Facebook Login scopes", () => {
    for (const scope of REMOVED_SCOPES) {
      expect(routeSource).not.toContain(`"${scope}"`);
    }
  });

  it("scopes list has exactly 2 entries", () => {
    const match = routeSource.match(/const scopes = \[([\s\S]*?)\]\.join/);
    expect(match).not.toBeNull();
    const entries = match![1].match(/"/g);
    expect(entries!.length).toBe(EXPECTED_SCOPES.length * 2);
  });

  it("uses instagram.com/oauth/authorize (not facebook.com)", () => {
    expect(routeSource).toContain("instagram.com/oauth/authorize");
    expect(routeSource).not.toContain("facebook.com/dialog/oauth");
  });
});

describe("API version consistency", () => {
  const sendSource = readFileSync(
    join(__dirname, "./send.ts"),
    "utf-8",
  );

  it("send.ts uses graph.instagram.com (not graph.facebook.com)", () => {
    expect(sendSource).toContain("graph.instagram.com");
    expect(sendSource).not.toContain("graph.facebook.com");
  });

  it("send.ts uses v21.0", () => {
    expect(sendSource).toContain("v21.0");
  });
});

describe("OAuth module uses Instagram Login endpoints", () => {
  const oauthSource = readFileSync(
    join(__dirname, "./oauth.ts"),
    "utf-8",
  );

  it("token exchange uses api.instagram.com", () => {
    expect(oauthSource).toContain("api.instagram.com/oauth/access_token");
  });

  it("long-lived token uses ig_exchange_token grant type", () => {
    expect(oauthSource).toContain("ig_exchange_token");
  });

  it("does not use graph.facebook.com", () => {
    expect(oauthSource).not.toContain("graph.facebook.com");
  });

  it("does not use fb_exchange_token", () => {
    expect(oauthSource).not.toContain("fb_exchange_token");
  });

  it("does not export Facebook Login functions", () => {
    expect(oauthSource).not.toContain("getUserPages");
    expect(oauthSource).not.toContain("getInstagramAccountFromPage");
    expect(oauthSource).not.toContain("subscribePageToApp");
  });
});
