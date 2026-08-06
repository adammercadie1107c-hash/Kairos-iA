import type { IGSendResponse } from "./types";

const FB_API_VERSION = "v21.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

export async function sendInstagramMessage(
  recipientId: string,
  text: string,
  accessToken: string,
): Promise<IGSendResponse> {
  const res = await fetch(`${FB_BASE_URL}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram API ${res.status}: ${err}`);
  }

  return res.json() as Promise<IGSendResponse>;
}
