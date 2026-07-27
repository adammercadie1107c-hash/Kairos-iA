import type { ChannelAdapter, CanonicalMessage, ChannelContext } from "./types";
import type { AgentDecision } from "@/lib/agent/schema";

export interface DemoInbound {
  content: string;
  externalId: string;
  displayName: string | null;
}

export const demoAdapter: ChannelAdapter = {
  channel: "demo",

  normalize(raw: unknown): CanonicalMessage {
    const data = raw as DemoInbound;
    return {
      content: data.content,
      externalId: data.externalId,
      displayName: data.displayName,
    };
  },

  async send(_decision: AgentDecision, _ctx: ChannelContext): Promise<void> {
    // Demo channel: messages are saved to DB by the API route.
    // No external delivery needed.
  },
};
