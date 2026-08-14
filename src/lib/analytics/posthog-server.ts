import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) return null;

  client = new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 });
  return client;
}

export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    ph.capture({ distinctId: userId, event, properties });
  } catch {
    // never break the app
  }
}

export async function shutdownPosthog(): Promise<void> {
  try {
    await client?.shutdown();
  } catch {
    // ignore
  }
}
