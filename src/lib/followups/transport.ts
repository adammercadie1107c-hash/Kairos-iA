import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInstagramMessage } from "@/lib/instagram/send";
import type { InstagramCredentials } from "@/lib/instagram/types";

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

export class InstagramFollowupTransport implements FollowupTransport {
  async send(
    params: SendFollowupParams,
    supabase: SupabaseClient,
  ): Promise<SendFollowupResult> {
    const { error: dbError } = await supabase.from("messages").insert({
      conversation_id: params.conversationId,
      role: "agent",
      content: params.content,
      metadata: params.metadata,
    });

    if (dbError) {
      return {
        delivered: false,
        error: dbError.message,
        errorCode: "delivery_failed",
      };
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("contact_id, channel_id")
      .eq("id", params.conversationId)
      .single();

    if (!conversation) {
      return { delivered: false, error: "conversation_not_found", errorCode: "delivery_failed" };
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("external_id")
      .eq("id", conversation.contact_id)
      .single();

    if (!contact) {
      return { delivered: false, error: "contact_not_found", errorCode: "delivery_failed" };
    }

    const { data: channel } = await supabase
      .from("channels")
      .select("credentials")
      .eq("id", conversation.channel_id)
      .single();

    if (!channel) {
      return { delivered: false, error: "channel_not_found", errorCode: "delivery_failed" };
    }

    const credentials = channel.credentials as unknown as InstagramCredentials;

    try {
      await sendInstagramMessage(
        credentials.instagram_user_id,
        contact.external_id,
        params.content,
        credentials.access_token,
      );
    } catch (err) {
      return {
        delivered: false,
        error: err instanceof Error ? err.message : "ig_send_failed",
        errorCode: "delivery_failed",
      };
    }

    return { delivered: true };
  }
}

export function resolveTransport(channelType: string): FollowupTransport {
  if (channelType === "demo") return new DemoFollowupTransport();
  if (channelType === "instagram") return new InstagramFollowupTransport();
  return new UnsupportedFollowupTransport(channelType);
}
