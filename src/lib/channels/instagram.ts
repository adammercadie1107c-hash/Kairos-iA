import type { ChannelAdapter, CanonicalMessage, ChannelContext } from "./types";
import type { AgentDecision } from "@/lib/agent/schema";

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",

  normalize(_raw: unknown): CanonicalMessage {
    throw new Error("Instagram adapter not connected");
  },

  async send(_decision: AgentDecision, _ctx: ChannelContext): Promise<void> {
    throw new Error("Instagram adapter not connected");
  },
};
