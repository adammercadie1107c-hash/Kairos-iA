import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import type { AgentConfig } from "@/lib/supabase/types";

const BASE_CONFIG: AgentConfig = {
  id: "test",
  user_id: "user1",
  business_name: "Coach Test",
  business_description: "Coaching sportif",
  offer: "Programme 3 mois",
  tone: "Professionnel et chaleureux",
  faq: [],
  qualification_questions: ["Quel est votre objectif ?", "Quel est votre budget ?"],
  required_qualification_fields: ["objectif", "budget", "timing"],
  qualification_rules: {},
  booking_link: "https://calendly.com/test",
  booking_message: "Voici mon lien :",
  max_followups: 2,
  created_at: "",
  updated_at: "",
};

describe("buildSystemPrompt with qualification context", () => {
  it("shows missing fields when nothing collected", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Champs déjà collectés (0/3)");
    expect(prompt).toContain("Champs encore manquants");
    expect(prompt).toContain("- objectif");
    expect(prompt).toContain("- budget");
    expect(prompt).toContain("- timing");
  });

  it("shows partial progress when some fields collected", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Champs déjà collectés (1/3)");
    expect(prompt).toContain('objectif : "perdre 10kg"');
    expect(prompt).toContain("- budget");
    expect(prompt).toContain("- timing");
    expect(prompt).not.toContain("Champs encore manquants :\n(tous collectés)");
  });

  it("shows all collected when complete", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg", budget: "500€", timing: "3 mois" },
      conversationStatus: "qualified",
    });
    expect(prompt).toContain("Champs déjà collectés (3/3)");
    expect(prompt).toContain("(tous collectés)");
  });

  it("includes existing info block", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("INFORMATIONS DÉJÀ COLLECTÉES");
    expect(prompt).toContain('objectif : "perdre 10kg"');
  });

  it("prevents re-asking answered questions", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Ne repose PAS une question dont la réponse est déjà dans les champs collectés");
  });

  it("prevents premature qualification", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg" },
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Ne passe PAS à qualified/booking_sent tant qu'il reste des champs manquants");
  });

  it("marks booking as already sent", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perdre 10kg", budget: "500€", timing: "3 mois" },
      conversationStatus: "booking_sent",
    });
    expect(prompt).toContain("Le lien de réservation a DÉJÀ ÉTÉ ENVOYÉ");
  });

  it("works without context (backward compatible)", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG);
    expect(prompt).toContain("Coach Test");
    expect(prompt).toContain("CHAMPS REQUIS POUR QUALIFIER");
  });
});
