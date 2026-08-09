import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import type { AgentConfig } from "@/lib/supabase/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhookSource = readFileSync(
  join(__dirname, "../../app/api/webhooks/instagram/route.ts"),
  "utf-8",
);

const FIT_CONFIG: AgentConfig = {
  id: "test",
  user_id: "user1",
  business_name: "Coach Fit",
  business_description: "Coaching perte de poids",
  offer: "Programme 3 mois — perte de poids durable — suivi hebdomadaire",
  tone: "Professionnel et chaleureux",
  faq: [],
  qualification_questions: ["Quel est votre objectif ?"],
  required_qualification_fields: ["objectif", "budget"],
  qualification_rules: {
    accepted_goals: ["perte de poids", "perdre du poids", "perte de gras", "perdre du gras", "sèche", "mincir", "maigrir"],
    rejected_goals: ["prise de masse", "bodybuilding", "musculation"],
  },
  booking_link: "https://calendly.com/test",
  booking_message: "Voici mon lien :",
  max_followups: 2,
  created_at: "",
  updated_at: "",
};

const NO_RULES_CONFIG: AgentConfig = {
  ...FIT_CONFIG,
  qualification_rules: {},
};

describe("Prompt: fit check section", () => {
  it("A: compatible goal → prompt shows FIT", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: { objectif: "perdre 5 kg" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("COMPATIBILITÉ OFFRE / PROSPECT");
    expect(prompt).toContain("FIT ACTUEL DU PROSPECT : **FIT**");
  });

  it("B: incompatible goal → prompt shows NOT_A_FIT and blocks booking", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: { objectif: "prise de masse" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("FIT ACTUEL DU PROSPECT : **NOT_A_FIT**");
    expect(prompt).toContain("N'envoie JAMAIS le lien de réservation");
    expect(prompt).toContain('Ne dis JAMAIS "ton profil correspond"');
  });

  it("C: no goal yet → prompt shows UNCERTAIN", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("FIT ACTUEL DU PROSPECT : **UNCERTAIN**");
    expect(prompt).toContain("clarification");
  });

  it("E: NOT_A_FIT prompt forbids 'ton profil correspond'", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: { objectif: "prise de masse" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain('Ne dis JAMAIS "ton profil correspond"');
  });

  it("booking rules include fit gate", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("N'envoie JAMAIS le lien si le fit prospect est NOT_A_FIT ou UNCERTAIN");
  });

  it("no fit section when qualification_rules empty", () => {
    const prompt = buildSystemPrompt(NO_RULES_CONFIG, {
      extractedInfo: { objectif: "prise de masse" },
      conversationStatus: "qualifying",
    });
    expect(prompt).not.toContain("COMPATIBILITÉ OFFRE / PROSPECT");
  });

  it("accepted goals are listed from config, not hardcoded", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("perte de poids, perdre du poids, perte de gras, perdre du gras, sèche, mincir, maigrir");
  });

  it("coherence block references current fit", () => {
    const prompt = buildSystemPrompt(FIT_CONFIG, {
      extractedInfo: { objectif: "prise de masse" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("COHÉRENCE ABSOLUE");
    expect(prompt).toContain("source de vérité");
  });
});

describe("Webhook: deterministic booking gate", () => {
  it("imports checkProspectFit", () => {
    expect(webhookSource).toContain("checkProspectFit");
  });

  it("blocks send_booking when fit is not FIT", () => {
    expect(webhookSource).toContain('decision.action === "send_booking"');
    expect(webhookSource).toContain('prospectFit !== "FIT"');
  });

  it("overrides to not_a_fit reason_code", () => {
    const gateBlock = webhookSource.slice(
      webhookSource.indexOf("booking gate"),
      webhookSource.indexOf("booking gate") + 500,
    );
    expect(gateBlock).toContain('"not_a_fit"');
    expect(gateBlock).toContain('"disqualified"');
  });

  it("F: Calendly never sent when fit blocked", () => {
    const gateIndex = webhookSource.indexOf("booking gate");
    const sendIndex = webhookSource.indexOf("sendInstagramMessage", gateIndex);
    expect(gateIndex).toBeLessThan(sendIndex);
  });
});
