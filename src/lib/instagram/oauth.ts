const GRAPH_BASE = "https://graph.instagram.com";

export interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
}

export interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface IGMeResponse {
  id: string;
  username: string;
}

export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string,
): Promise<ShortLivedTokenResponse> {
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<ShortLivedTokenResponse>;
}

export async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string,
): Promise<LongLivedTokenResponse> {
  const url = new URL(`${GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortToken);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Long-lived token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<LongLivedTokenResponse>;
}

export async function getInstagramMe(accessToken: string): Promise<IGMeResponse> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram /me failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<IGMeResponse>;
}
