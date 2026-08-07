import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, Message } from "@/lib/supabase/types";

const anthropic = new Anthropic();

const MAX_CONTEXT = 10;

export interface FollowupContext {
  extractedInfo: Record<string, string>;
  conversationStatus: string;
}

export interface GeneratedFollowup {
  message: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
    case "qualifying":
      return "Qualification en cours — certains champs manquent encore.";
    case "qualified":
      return "Le prospect est qualifié mais n'a pas encore réservé.";
    case "booking_sent":
      return "Un lien de réservation a été envoyé. Le prospect n'a pas encore confirmé.";
    default:
      return "";
  }
}

function buildFollowupSystemPrompt(
  config: AgentConfig,
  followupNumber: number,
  context?: FollowupContext,
): string {
  const infoBlock =
    context?.extractedInfo && Object.keys(context.extractedInfo).length > 0
      ? Object.entries(context.extractedInfo)
          .map(([k, v]) => `- ${k} : ${v}`)
          .join("\n")
      : "(aucune information collectée)";

  const statusInfo = context ? statusLabel(context.conversationStatus) : "";

  return `Tu es l'assistant IA de "${config.business_name}".

Le prospect n'a pas répondu depuis un moment. Tu dois envoyer un message de relance naturel.

## CONTEXTE BUSINESS
${config.business_description}

## OFFRE
${config.offer}

## ÉTAT DE LA CONVERSATION
${statusInfo}

## INFORMATIONS COLLECTÉES SUR LE PROSPECT
${infoBlock}

## CONTRAINTES
- Relance n°${followupNumber} sur ${config.max_followups} maximum
- 1 à 2 phrases maximum
- Fais référence au contexte de la conversation précédente
- Utilise les informations collectées pour personnaliser le message
- Ne répète PAS un message déjà envoyé dans l'historique
- Ne sois PAS insistant — ton naturel, comme un message entre humains
- N'invente AUCUNE information absente de la conversation
- UNE SEULE intention par message (une question OU un rappel, pas les deux)
- Si c'est la relance n°2+, change complètement d'angle par rapport aux relances précédentes
${config.booking_link ? `- Si un lien de réservation a été envoyé, tu peux le rappeler brièvement : ${config.booking_link}` : ""}

Réponds UNIQUEMENT avec le message de relance, sans JSON, sans guillemets, sans commentaire.`;
}

export async function generateFollowupMessage(
  history: Message[],
  config: AgentConfig,
  followupNumber: number,
  context?: FollowupContext,
): Promise<GeneratedFollowup> {
  const systemPrompt = buildFollowupSystemPrompt(config, followupNumber, context);

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
    content: `[Pas de réponse du prospect. Génère la relance n°${followupNumber}. Le message DOIT être différent de toute relance précédente dans l'historique.]`,
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
