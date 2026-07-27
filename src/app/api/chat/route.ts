import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/agent/engine";
import { demoAdapter } from "@/lib/channels/demo";
import type { AgentConfig, Message } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { content, conversationId, externalId, displayName } = body as {
    content: string;
    conversationId?: string;
    externalId: string;
    displayName?: string;
  };

  if (!content || !externalId) {
    return NextResponse.json(
      { error: "content et externalId sont requis" },
      { status: 400 },
    );
  }

  try {
    // Load agent config
    const { data: config, error: configError } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: "Configuration de l'agent introuvable" },
        { status: 404 },
      );
    }

    // Get demo channel
    const { data: channel } = await supabase
      .from("channels")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "demo")
      .single();

    if (!channel) {
      return NextResponse.json(
        { error: "Canal démo introuvable" },
        { status: 404 },
      );
    }

    // Normalize inbound message
    const canonical = demoAdapter.normalize({
      content,
      externalId,
      displayName: displayName || null,
    });

    // Find or create contact
    let { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("channel_id", channel.id)
      .eq("external_id", canonical.externalId)
      .single();

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          channel_id: channel.id,
          external_id: canonical.externalId,
          display_name: canonical.displayName,
        })
        .select()
        .single();

      if (contactError) {
        return NextResponse.json(
          { error: "Erreur création contact: " + contactError.message },
          { status: 500 },
        );
      }
      contact = newContact;
    }

    // Find or create conversation
    let currentConversationId = conversationId;
    let conversation;

    if (currentConversationId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", currentConversationId)
        .eq("user_id", user.id)
        .single();
      conversation = existing;
    }

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          channel_id: channel.id,
          status: "new",
        })
        .select()
        .single();

      if (convError) {
        return NextResponse.json(
          { error: "Erreur création conversation: " + convError.message },
          { status: 500 },
        );
      }
      conversation = newConv;
      currentConversationId = newConv.id;
    }

    // Check if AI is enabled
    if (!conversation.ai_enabled) {
      // Save inbound message only, don't run agent
      await supabase.from("messages").insert({
        conversation_id: currentConversationId,
        role: "contact",
        content: canonical.content,
      });

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", currentConversationId);

      return NextResponse.json({
        conversationId: currentConversationId,
        aiEnabled: false,
        message: "L'IA est désactivée sur cette conversation.",
      });
    }

    // Save inbound message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "contact",
      content: canonical.content,
    });

    if (msgError) {
      return NextResponse.json(
        { error: "Erreur sauvegarde message: " + msgError.message },
        { status: 500 },
      );
    }

    // Load conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", currentConversationId)
      .order("created_at", { ascending: true });

    // Run agent
    const result = await runAgent(
      (history ?? []) as Message[],
      config as AgentConfig,
    );

    const { decision } = result;

    const agentMessage = decision.message;

    // Save agent response
    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "agent",
      content: agentMessage,
      metadata: {
        action: decision.action,
        reason_code: decision.reason_code,
        confidence: decision.confidence,
      },
    });

    // Update contact extracted info
    if (decision.extracted_info && Object.keys(decision.extracted_info).length > 0) {
      const merged = { ...contact.extracted_info, ...decision.extracted_info };
      await supabase
        .from("contacts")
        .update({ extracted_info: merged })
        .eq("id", contact.id);
    }

    // Update conversation status
    const updates: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
    };

    if (decision.new_status) {
      updates.status = decision.new_status;
    }

    if (decision.action === "escalate") {
      updates.ai_enabled = false;
      updates.status = "handoff";
    }

    await supabase
      .from("conversations")
      .update(updates)
      .eq("id", currentConversationId);

    // Save agent log
    await supabase.from("agent_logs").insert({
      conversation_id: currentConversationId,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      latency_ms: result.latencyMs,
      decision: decision.action,
      reason_code: decision.reason_code,
      handoff_reason: decision.handoff_reason,
      raw_output: JSON.parse(result.rawOutput),
    });

    return NextResponse.json({
      conversationId: currentConversationId,
      decision: {
        action: decision.action,
        message: agentMessage,
        reason_code: decision.reason_code,
        handoff_reason: decision.handoff_reason,
        new_status: decision.new_status,
        confidence: decision.confidence,
        extracted_info: decision.extracted_info,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur interne";
    console.error("Chat API error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
