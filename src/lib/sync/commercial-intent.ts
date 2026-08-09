import type { AgentDecision } from "@/lib/agent/schema";
import type { ProspectStatus } from "@/lib/supabase/types";

const INTENT_REASON_CODES = new Set([
  "qualification_progress",
  "all_fields_collected",
  "booking_ready",
  "objection_handled",
  "not_a_fit",
  "commercial_unknown",
  "faq_answer",
]);

const INTENT_ACTIONS = new Set([
  "ask_qualification",
  "send_booking",
  "request_human_confirmation",
]);

const NO_INTENT_REASON_CODES = new Set([
  "off_topic",
  "sensitive_topic",
]);

const PRICE_PATTERN = /\b(prix|tarifs?|co[uû]t[es]?|combien|paiement|devis|facturer?)\b/i;
const OFFER_PATTERN = /\b(coaching|accompagnement|programme|formule|offre|inscription|commencer|me lancer)\b|inscrire\b/i;

export interface CommercialIntentResult {
  hasIntent: boolean;
  prospectStatus: ProspectStatus;
}

export function detectCommercialIntent(
  decision: AgentDecision,
  extractedInfo: Record<string, string>,
  conversationStatus: string,
  messageText?: string,
): CommercialIntentResult {
  if (NO_INTENT_REASON_CODES.has(decision.reason_code)) {
    return { hasIntent: false, prospectStatus: "nouveau" };
  }

  if (decision.reason_code === "not_a_fit") {
    return { hasIntent: true, prospectStatus: "perdu" };
  }

  if (conversationStatus === "qualified" || conversationStatus === "booking_sent") {
    return { hasIntent: true, prospectStatus: "contacte" };
  }

  if (INTENT_ACTIONS.has(decision.action)) {
    return { hasIntent: true, prospectStatus: "nouveau" };
  }

  if (INTENT_REASON_CODES.has(decision.reason_code)) {
    return { hasIntent: true, prospectStatus: "nouveau" };
  }

  const hasExtractedInfo = Object.keys(extractedInfo).length > 0;
  if (hasExtractedInfo) {
    return { hasIntent: true, prospectStatus: "nouveau" };
  }

  if (messageText && hasPriceOrOfferIntent(messageText)) {
    return { hasIntent: true, prospectStatus: "nouveau" };
  }

  return { hasIntent: false, prospectStatus: "nouveau" };
}

function hasPriceOrOfferIntent(text: string): boolean {
  return PRICE_PATTERN.test(text) || OFFER_PATTERN.test(text);
}
