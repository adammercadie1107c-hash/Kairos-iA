import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, Message } from "@/lib/supabase/types";

const anthropic = new Anthropic();

const MAX_CONTEXT = 10;

export interface GeneratedFollowup {
  message: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

function buildFollowupSystemPrompt(
  config: AgentConfig,
  followupNumber: number,
): string {
  return `Tu es l'assistant IA de "${config.business_name}".

Le prospect n'a pas répondu depuis un moment. Tu dois envoyer un message de relance naturel.

## CONTEXTE
${config.business_description}

## OFFRE
${config.offer}

## CONTRAINTES
- Relance n°${followupNumber} sur ${config.max_followups} maximum
- 1 à 2 phrases maximum
- Fais reference au contexte de la conversation precedente
- Ne repete pas un message deja envoye
- Ne sois pas insistant
- N'invente aucune information absente de la conversation
${config.booking_link ? `- Si un lien de reservation a ete envoye, tu peux le rappeler brievement : ${config.booking_link}` : ""}

Reponds UNIQUEMENT avec le message de relance, sans JSON, sans guillemets, sans commentaire.`;
}

export async function generateFollowupMessage(
  history: Message[],
  config: AgentConfig,
  followupNumber: number,
): Promise<GeneratedFollowup> {
  const systemPrompt = buildFollowupSystemPrompt(config, followupNumber);

  const recent = history.slice(-MAX_CONTEXT);
  const apiMessages: Array<{ role: "user" | "assistant"; content: string }> =
    [];

  for (const m of recent) {
    if (m.role === "system") continue;
    const role: "user" | "assistant" =
      m.role === "contact" ? "user" : "assistant";
    const last = apiMessages[apiMessages.length - 1];
    if (last && last.role === role) {
      if (role === "user") last.content += "\n" + m.content;
      else last.content = m.content;
    } else {
      apiMessages.push({ role, content: m.content });
    }
  }

  apiMessages.push({
    role: "user",
    content: `[Pas de reponse du prospect. Genere la relance n°${followupNumber}.]`,
  });

  if (apiMessages[0]?.role === "assistant") {
    apiMessages.shift();
  }

  const start = Date.now();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 256,
    system: systemPrompt,
    messages: apiMessages,
  });

  const latencyMs = Date.now() - start;

  let message = "";
  for (const block of response.content) {
    if (block.type === "text") message += block.text;
  }

  message = message.trim();
  if (!message) {
    throw new Error("Empty follow-up message generated");
  }

  return {
    message,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  };
}
