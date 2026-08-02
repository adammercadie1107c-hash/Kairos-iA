const GRAPH_BASE = "https://graph.facebook.com/v21.0";

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

/** Exchange authorization code for a short-lived user access token (Facebook OAuth). */
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

/** Exchange a short-lived user token for a long-lived one (~60 days). */
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

/** List Facebook Pages the user manages, with their long-lived Page Access Tokens. */
export async function getUserPages(userAccessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`/me/accounts failed (${res.status}): ${body}`);
  }
  const json = await res.json() as { data: FacebookPage[] };
  return json.data ?? [];
}

/**
 * Return the Instagram Business Account ID linked to a Facebook Page,
 * or null if no Instagram account is connected.
 */
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
