import type { IGSendResponse } from "./types";

const IG_GRAPH_BASE = "https://graph.instagram.com/v21.0";

export async function sendInstagramMessage(
  igUserId: string,
  recipientId: string,
  text: string,
  accessToken: string,
): Promise<IGSendResponse> {
  const res = await fetch(`${IG_GRAPH_BASE}/${igUserId}/messages`, {
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
