import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AgentDecisionSchema, type AgentDecision } from "./schema";
import { buildSystemPrompt } from "./prompt";
import type { AgentConfig, Message } from "@/lib/supabase/types";

const anthropic = new Anthropic();

const MAX_CONTEXT_MESSAGES = 20;
const MAX_RETRIES = 1;

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

  // Ensure last message is from user
  if (
    contextMessages.length === 0 ||
    contextMessages[contextMessages.length - 1].role !== "user"
  ) {
    throw new Error("Last message must be from contact");
  }

  // Append a reminder as the last user message to force JSON
  const lastIdx = contextMessages.length - 1;
  contextMessages[lastIdx].content +=
    "\n\n[RAPPEL SYSTÈME : réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après. Commence directement par { ]";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

    try {
      const jsonStr = extractJson(rawOutput);
      const parsed = z.safeParse(AgentDecisionSchema, JSON.parse(jsonStr));

      if (!parsed.success) {
        lastError = new Error(
          `Validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        );
        continue;
      }

      return {
        decision: parsed.data,
        inputTokens,
        outputTokens,
        latencyMs,
        rawOutput,
      };
    } catch (e) {
      // If we got plain text, wrap it as a fallback reply
      if (attempt === MAX_RETRIES && rawOutput.length > 0) {
        const fallback: AgentDecision = {
          action: "reply",
          message: rawOutput.trim(),
          reason_code: "greeting",
          handoff_reason: null,
          confidence: 0.7,
        };
        return {
          decision: fallback,
          inputTokens,
          outputTokens,
          latencyMs,
          rawOutput,
        };
      }
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw new Error(
    `Agent failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  );
}

function extractJson(text: string): string {
  const trimmed = text.trim();

  // Starts with {
  if (trimmed.startsWith("{")) {
    const end = trimmed.lastIndexOf("}");
    if (end !== -1) return trimmed.slice(0, end + 1);
  }

  // Inside code block
  const match = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) return match[1];

  // Find first { to last }
  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }

  throw new Error("No JSON found in agent response");
}
