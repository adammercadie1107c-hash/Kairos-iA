import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("callback uses Instagram Login flow (no Facebook Login)", () => {
  const callbackSource = readFileSync(
    join(__dirname, "../../app/api/auth/instagram/callback/route.ts"),
    "utf-8",
  );

  it("imports exchangeCodeForToken from instagram/oauth", () => {
    expect(callbackSource).toContain("exchangeCodeForToken");
  });

  it("imports exchangeForLongLivedToken from instagram/oauth", () => {
    expect(callbackSource).toContain("exchangeForLongLivedToken");
  });

  it("imports getInstagramUserInfo from instagram/oauth", () => {
    expect(callbackSource).toContain("getInstagramUserInfo");
  });

  it("does not import Facebook Login functions", () => {
    expect(callbackSource).not.toContain("getUserPages");
    expect(callbackSource).not.toContain("getInstagramAccountFromPage");
    expect(callbackSource).not.toContain("subscribePageToApp");
    expect(callbackSource).not.toContain("getInstagramUsername");
  });

  it("stores instagram_user_id in credentials (not instagram_account_id or page_id)", () => {
    expect(callbackSource).toContain("instagram_user_id");
    expect(callbackSource).not.toContain("instagram_account_id");
    expect(callbackSource).not.toContain("page_id");
    expect(callbackSource).not.toContain("page_access_token");
  });

  it("stores access_token directly (not page_access_token)", () => {
    expect(callbackSource).toContain("access_token: longToken");
  });

  it("upserts channel with credentials", () => {
    expect(callbackSource).toContain(".upsert(");
    expect(callbackSource).toContain("credentials");
  });

  it("redirects with connected=true on success", () => {
    expect(callbackSource).toContain("connected=true");
  });

  it("clears ig_oauth_state cookie after flow", () => {
    expect(callbackSource).toContain("ig_oauth_state");
    expect(callbackSource).toContain("maxAge: 0");
  });

  it("does not reference Facebook Pages or Page tokens", () => {
    expect(callbackSource).not.toContain("getUserPages");
    expect(callbackSource).not.toContain("page_access_token");
    expect(callbackSource).not.toContain("no_pages");
    expect(callbackSource).not.toContain("no_instagram_account");
  });
});
