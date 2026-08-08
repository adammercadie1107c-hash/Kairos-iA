const IG_GRAPH_BASE = "https://graph.instagram.com";

export interface ShortLivedTokenResponse {
  access_token: string;
  user_id: number;
}

export interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface InstagramUserInfo {
  user_id: string;
  username: string;
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);
  body.set("code", code);

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ShortLivedTokenResponse>;
}

export async function exchangeForLongLivedToken(
  shortToken: string,
  clientSecret: string,
): Promise<LongLivedTokenResponse> {
  const url = new URL(`${IG_GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", shortToken);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Long-lived token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<LongLivedTokenResponse>;
}

export async function getInstagramUserInfo(
  accessToken: string,
): Promise<InstagramUserInfo> {
  const url = new URL(`${IG_GRAPH_BASE}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`User info fetch failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { user_id: string; username: string };
  return { user_id: json.user_id, username: json.username };
}
