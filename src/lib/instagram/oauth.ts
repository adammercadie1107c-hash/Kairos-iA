const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export interface UserTokenResponse {
  access_token: string;
  token_type: string;
}

export interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string,
): Promise<UserTokenResponse> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<UserTokenResponse>;
}

export async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string,
): Promise<LongLivedTokenResponse> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Long-lived token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<LongLivedTokenResponse>;
}

export async function getUserPages(userAccessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`/me/accounts failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { data: FacebookPage[] };
  return json.data ?? [];
}

export async function getInstagramAccountFromPage(
  pageId: string,
  pageAccessToken: string,
): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json() as { instagram_business_account?: { id: string } };
  return json.instagram_business_account?.id ?? null;
}

export async function subscribePageToApp(
  pageId: string,
  pageAccessToken: string,
): Promise<boolean> {
  const url = new URL(`${GRAPH_BASE}/${pageId}/subscribed_apps`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: "messages",
      access_token: pageAccessToken,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`subscribed_apps failed (${res.status}):`, body);
    return false;
  }
  return true;
}

export async function getInstagramUsername(
  igAccountId: string,
  pageAccessToken: string,
): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${igAccountId}`);
  url.searchParams.set("fields", "username");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json() as { username?: string };
  return json.username ?? null;
}
