import type { ChannelAdapter, CanonicalMessage, ChannelContext } from "./types";
import type { AgentDecision } from "@/lib/agent/schema";
import type { IGMessagingEvent } from "@/lib/instagram/types";

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",

  normalize(raw: unknown): CanonicalMessage {
    const event = raw as IGMessagingEvent;
    return {
      content: event.message?.text ?? "",
      externalId: event.sender.id,
      displayName: null,
    };
  },

  async send(_decision: AgentDecision, _ctx: ChannelContext): Promise<void> {
    // Sending is handled directly in the webhook route via sendInstagramMessage.
    // This adapter normalizes inbound payloads only.
  },
};
