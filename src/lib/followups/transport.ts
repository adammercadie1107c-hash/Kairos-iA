import type { SupabaseClient } from "@supabase/supabase-js";

export interface SendFollowupParams {
  conversationId: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SendFollowupResult {
  delivered: boolean;
  error?: string;
  errorCode?: "unsupported_transport" | "delivery_failed";
}

export interface FollowupTransport {
  send(
    params: SendFollowupParams,
    supabase: SupabaseClient,
  ): Promise<SendFollowupResult>;
}

export class DemoFollowupTransport implements FollowupTransport {
  async send(
    params: SendFollowupParams,
    supabase: SupabaseClient,
  ): Promise<SendFollowupResult> {
    const { error } = await supabase.from("messages").insert({
      conversation_id: params.conversationId,
      role: "agent",
      content: params.content,
      metadata: params.metadata,
    });

    if (error) {
      return {
        delivered: false,
        error: error.message,
        errorCode: "delivery_failed",
      };
    }

    return { delivered: true };
  }
}

export class UnsupportedFollowupTransport implements FollowupTransport {
  constructor(private channelType: string) {}

  async send(): Promise<SendFollowupResult> {
    return {
      delivered: false,
      error: `unsupported_transport: ${this.channelType}`,
      errorCode: "unsupported_transport",
    };
  }
}

export function resolveTransport(channelType: string): FollowupTransport {
  if (channelType === "demo") return new DemoFollowupTransport();
  return new UnsupportedFollowupTransport(channelType);
}
