import type { AgentDecision } from "@/lib/agent/schema";

export interface CanonicalMessage {
  content: string;
  externalId: string;
  displayName: string | null;
}

export interface ChannelContext {
  channelId: string;
  contactExternalId: string;
}

export interface ChannelAdapter {
  channel: "demo" | "instagram" | "whatsapp";
  normalize(raw: unknown): CanonicalMessage;
  send(decision: AgentDecision, ctx: ChannelContext): Promise<void>;
}
