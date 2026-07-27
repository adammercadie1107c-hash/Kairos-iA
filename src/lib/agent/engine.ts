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

  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES).map((m) => ({
    role: (m.role === "contact" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

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
  if (trimmed.startsWith("{")) return trimmed;

  const match = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) return match[1];

  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }

  throw new Error("No JSON found in agent response");
}
