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

  const contextMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  for (const m of recentMessages) {
    if (m.role === "contact") {
      contextMessages.push({ role: "user", content: m.content });
    } else if (m.role === "agent" || m.role === "human") {
      contextMessages.push({
        role: "assistant",
        content: JSON.stringify({
          action: "reply",
          message: m.content,
          reason_code: "greeting",
          handoff_reason: null,
          confidence: 0.9,
        }),
      });
    }
  }

  if (
    contextMessages.length === 0 ||
    contextMessages[contextMessages.length - 1].role !== "user"
  ) {
    throw new Error("Last message must be from contact");
  }

  const start = Date.now();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: contextMessages,
  });

  const latencyMs = Date.now() - start;
  const rawOutput =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  // Try to parse as JSON
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
  } catch {
    // fall through to fallback
  }

  // Attempt 2: maybe the JSON is valid but has extra fields or minor issues
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
  } catch {
    // fall through to text fallback
  }

  // Attempt 3: plain text fallback — use the response as-is
  if (rawOutput.trim().length > 0) {
    let cleanText = rawOutput.trim();
    // Remove any partial JSON artifacts
    if (cleanText.includes('"message"')) {
      const msgMatch = cleanText.match(/"message"\s*:\s*"([^"]+)"/);
      if (msgMatch) cleanText = msgMatch[1];
    }
    return {
      action: "reply",
      message: cleanText,
      reason_code: "greeting",
      handoff_reason: null,
      confidence: 0.5,
    };
  }

  throw new Error("Empty response from agent");
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
