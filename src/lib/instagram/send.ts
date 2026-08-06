import type { IGSendResponse } from "./types";

const FB_API_VERSION = "v21.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

export async function resolvePageId(pageAccessToken: string): Promise<string> {
  const res = await fetch(
    `${FB_BASE_URL}/me?fields=id&access_token=${encodeURIComponent(pageAccessToken)}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to resolve page_id (${res.status}): ${err}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function sendInstagramMessage(
  recipientId: string,
  text: string,
  pageAccessToken: string,
  pageId: string,
): Promise<IGSendResponse> {
  if (!pageId) {
    throw new Error("missing_page_id");
  }

  const endpoint = `${FB_BASE_URL}/${pageId}/messages`;
  console.log("[send] endpoint:", endpoint);
  console.log("[send] page_id present:", !!pageId);
  console.log("[send] token present:", !!pageAccessToken);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  console.log("[send] Meta HTTP status:", res.status);

  if (!res.ok) {
    const err = await res.text();
    console.error("[send] Meta error response:", err);
    throw new Error(`Instagram API ${res.status}: ${err}`);
  }

  return res.json() as Promise<IGSendResponse>;
}
