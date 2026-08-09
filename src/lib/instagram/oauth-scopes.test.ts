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

describe("Token exchange body format", () => {
  const oauthSource = readFileSync(
    join(__dirname, "./oauth.ts"),
    "utf-8",
  );

  it("sends client_id in form body", () => {
    expect(oauthSource).toContain('body.set("client_id"');
  });

  it("sends client_secret in form body", () => {
    expect(oauthSource).toContain('body.set("client_secret"');
  });

  it("sends grant_type=authorization_code", () => {
    expect(oauthSource).toContain('"grant_type", "authorization_code"');
  });

  it("sends redirect_uri in form body", () => {
    expect(oauthSource).toContain('body.set("redirect_uri"');
  });

  it("sends code in form body", () => {
    expect(oauthSource).toContain('body.set("code"');
  });

  it("sets Content-Type to application/x-www-form-urlencoded", () => {
    expect(oauthSource).toContain("application/x-www-form-urlencoded");
  });

  it("does not log secrets", () => {
    const lines = oauthSource.split("\n");
    const logLines = lines.filter((l) =>
      l.includes("console.log") || l.includes("console.info") || l.includes("console.debug"),
    );
    for (const line of logLines) {
      expect(line).not.toMatch(/secret/i);
      expect(line).not.toMatch(/access.?token/i);
    }
  });
});

describe("Callback guards missing env vars", () => {
  const callbackSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/callback/route.ts"),
    "utf-8",
  );

  it("checks META_APP_SECRET presence before token exchange", () => {
    const secretCheck = callbackSource.indexOf("!appSecret");
    const exchangeCall = callbackSource.indexOf("await exchangeCodeForToken(");
    expect(secretCheck).toBeGreaterThan(-1);
    expect(exchangeCall).toBeGreaterThan(secretCheck);
  });

  it("returns not_configured when env vars are missing", () => {
    expect(callbackSource).toContain('redirectWithError("not_configured")');
  });

  it("logs which env vars are missing without exposing values", () => {
    expect(callbackSource).toContain("!!appSecret");
    expect(callbackSource).not.toMatch(/console\.(log|error|warn).*appSecret[^!]/);
  });
});
