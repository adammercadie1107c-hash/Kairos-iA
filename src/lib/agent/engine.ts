import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AgentDecisionSchema, type AgentDecision } from "./schema";
import { buildSystemPrompt } from "./prompt";
import type { AgentConfig, Message } from "@/lib/supabase/types";

const anthropic = new Anthropic();

const MAX_CONTEXT_MESSAGES = 20;

export interface AgentRunResult {
  decision: AgentDecision;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  rawOutput: string;
}

export async function runAgent(
  messages: Message[],
  config: AgentConfig,
): Promise<AgentRunResult> {
  const systemPrompt = buildSystemPrompt(config);

  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  // Build alternating user/assistant messages (API requirement)
  const contextMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  for (const m of recentMessages) {
    const role: "user" | "assistant" =
      m.role === "contact" ? "user" : "assistant";

    // Skip system messages
    if (m.role === "system") continue;

    const content =
      role === "assistant"
        ? JSON.stringify({
            action: "reply",
            message: m.content,
            reason_code: "greeting",
            handoff_reason: null,
            confidence: 0.9,
          })
        : m.content;

    // Merge consecutive same-role messages
    const last = contextMessages[contextMessages.length - 1];
    if (last && last.role === role) {
      if (role === "user") {
        last.content += "\n" + content;
      } else {
        last.content = content;
      }
    } else {
      contextMessages.push({ role, content });
    }
  }

  // Must end with user message
  if (
    contextMessages.length === 0 ||
    contextMessages[contextMessages.length - 1].role !== "user"
  ) {
    throw new Error("Last message must be from contact");
  }

  // Must start with user message
  if (contextMessages[0].role === "assistant") {
    contextMessages.shift();
  }

  console.log(
    "[agent] Sending",
    contextMessages.length,
    "messages to Claude",
  );
  console.log(
    "[agent] Roles:",
    contextMessages.map((m) => m.role).join(" → "),
  );

  const start = Date.now();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: contextMessages,
  });

  const latencyMs = Date.now() - start;

  console.log("[agent] Response stop_reason:", response.stop_reason);
  console.log("[agent] Response content blocks:", response.content.length);

  let rawOutput = "";
  for (const block of response.content) {
    if (block.type === "text") {
      rawOutput += block.text;
    }
  }

  console.log("[agent] Raw output length:", rawOutput.length);
  if (rawOutput.length < 500) {
    console.log("[agent] Raw output:", rawOutput);
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  const decision = parseDecision(rawOutput);

  return {
    decision,
    inputTokens,
    outputTokens,
    latencyMs,
    rawOutput,
  };
}

function parseDecision(rawOutput: string): AgentDecision {
  // Attempt 1: extract and validate JSON
  try {
    const jsonStr = extractJson(rawOutput);
    const parsed = z.safeParse(AgentDecisionSchema, JSON.parse(jsonStr));
    if (parsed.success) {
      return parsed.data;
    }
    console.log(
      "[agent] Zod validation failed:",
      parsed.error.issues.map((i) => i.message),
    );
  } catch (e) {
    console.log("[agent] JSON extraction attempt 1 failed:", e);
  }

  // Attempt 2: loose JSON parsing
  try {
    const jsonStr = extractJson(rawOutput);
    const obj = JSON.parse(jsonStr);
    if (obj.message && typeof obj.message === "string") {
      return {
        action: obj.action ?? "reply",
        message: obj.message,
        reason_code: obj.reason_code ?? "greeting",
        handoff_reason: obj.handoff_reason ?? null,
        extracted_info: obj.extracted_info,
        new_status: obj.new_status,
        confidence: typeof obj.confidence === "number" ? obj.confidence : 0.7,
      };
    }
  } catch (e) {
    console.log("[agent] JSON extraction attempt 2 failed:", e);
  }

  // Attempt 3: plain text fallback
  const cleanText = rawOutput.trim();
  if (cleanText.length > 0) {
    // Try to extract just the message field if it exists
    const msgMatch = cleanText.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const message = msgMatch ? msgMatch[1] : cleanText;

    console.log("[agent] Using text fallback");
    return {
      action: "reply",
      message,
      reason_code: "greeting",
      handoff_reason: null,
      confidence: 0.5,
    };
  }

  // Last resort: return a generic message instead of crashing
  console.error("[agent] Empty response from model, using default message");
  return {
    action: "reply",
    message:
      "Merci pour votre message ! Pouvez-vous m'en dire un peu plus sur ce que vous recherchez ?",
    reason_code: "greeting",
    handoff_reason: null,
    confidence: 0.3,
  };
}

function extractJson(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    const end = trimmed.lastIndexOf("}");
    if (end !== -1) return trimmed.slice(0, end + 1);
  }

  const match = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) return match[1];

  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }

  throw new Error("No JSON found");
}
