import type { ChannelAdapter, CanonicalMessage, ChannelContext } from "./types";
import type { AgentDecision } from "@/lib/agent/schema";

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  normalize(_raw: unknown): CanonicalMessage {
    throw new Error("WhatsApp adapter not connected");
  },

  async send(_decision: AgentDecision, _ctx: ChannelContext): Promise<void> {
    throw new Error("WhatsApp adapter not connected");
  },
};
