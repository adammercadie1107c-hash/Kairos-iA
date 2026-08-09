import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import type { AgentConfig } from "@/lib/supabase/types";

const BASE_CONFIG: AgentConfig = {
  id: "test",
  user_id: "user1",
  business_name: "Coach Test",
  business_description: "Coaching sportif personnalisé",
  offer: "Programme 3 mois — suivi hebdomadaire — plan alimentaire — 500€",
  tone: "Professionnel et chaleureux",
  faq: [
    { q: "Combien ça coûte ?", a: "Le programme est à 500€ pour 3 mois." },
  ],
  qualification_questions: ["Quel est votre objectif ?", "Quel est votre budget ?"],
  required_qualification_fields: ["objectif", "budget", "timing"],
  qualification_rules: {},
  booking_link: "https://calendly.com/test",
  booking_message: "Voici mon lien :",
  max_followups: 2,
  created_at: "",
  updated_at: "",
};

describe("Scénario A: paiement en plusieurs fois (non configuré)", () => {
  it("prompt interdit d'inventer des conditions de paiement", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Paiement en plusieurs fois");
    expect(prompt).toContain("ANTI-HALLUCINATION COMMERCIALE");
    expect(prompt).toContain("request_human_confirmation");
    expect(prompt).toContain("commercial_unknown");
  });

  it("prompt dit de ne pas affirmer 'nous ne proposons pas'", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain('NE RÉPONDS PAS "nous ne proposons pas..."');
  });

  it("prompt dit de créer une alerte coach", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("request_human_confirmation");
    expect(prompt).toContain("le coach pourra te la confirmer");
  });
});

describe("Scénario B: réductions (non configurées)", () => {
  it("réductions sont dans la liste interdite", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Réductions / promotions");
  });

  it("garanties sont dans la liste interdite", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Garanties / remboursement");
  });
});

describe("Scénario C: demande humaine explicite", () => {
  it("escalade immédiate pour demande humaine", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("demande explicitement à parler à un humain, escalade immédiatement");
    expect(prompt).toContain('"human_requested"');
  });

  it("ne coupe PAS l'IA pour question commerciale inconnue", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("NE PAS couper l'IA (escalade) pour");
    expect(prompt).toContain("Question commerciale sans réponse configurée");
  });
});

describe("Scénario D: anti-répétition", () => {
  it("inclut les questions récentes quand fournies", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
      recentAgentQuestions: [
        "Qu'est-ce qui te bloque le plus aujourd'hui ?",
        "Quel est ton budget approximatif ?",
      ],
    });
    expect(prompt).toContain("QUESTIONS RÉCEMMENT POSÉES PAR L'IA");
    expect(prompt).toContain("Qu'est-ce qui te bloque le plus aujourd'hui ?");
    expect(prompt).toContain("RÈGLE ANTI-RÉPÉTITION");
    expect(prompt).toContain("NE repose PAS ces questions");
  });

  it("adapte le flow si prospect refuse de répondre", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
      recentAgentQuestions: ["Quel budget ?"],
    });
    expect(prompt).toContain("prospect dit qu'il ne veut pas répondre");
    expect(prompt).toContain("réponds à SA demande d'abord");
  });

  it("n'inclut pas le bloc sans questions récentes", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).not.toContain("QUESTIONS RÉCEMMENT POSÉES PAR L'IA");
  });
});

describe("Scénario E: différenciation sans invention", () => {
  it("interdit d'inventer des avantages", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("N'invente PAS de méthode propriétaire");
    expect(prompt).toContain("résultats moyens");
    expect(prompt).toContain("avantages inexistants");
  });

  it("utilise uniquement les éléments configurés", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("UNIQUEMENT les éléments configurés");
    expect(prompt).toContain("accompagnement");
    expect(prompt).toContain("personnalisation");
  });
});

describe("Scénario F: refus / hésitation", () => {
  it("respecte le refus sans pousser booking", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Respecte la décision. NE pousse PAS vers le booking");
    expect(prompt).toContain("laisse la conversation ouverte");
  });

  it("distingue les 4 types de situations", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("QUESTION INFORMATIVE");
    expect(prompt).toContain("OBJECTION RÉELLE");
    expect(prompt).toContain("REFUS / HÉSITATION");
    expect(prompt).toContain("DEMANDE HUMAINE");
  });
});

describe("Scénario G: question posée 2 fois", () => {
  it("abandonne après 2 refus", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
      recentAgentQuestions: [
        "Quel est ton budget ?",
        "Tu as une idée de budget ?",
      ],
    });
    expect(prompt).toContain("ignoré ou refusé de répondre à une question 2 fois, ABANDONNE");
  });
});

describe("Scénario H: intention de booking explicite", () => {
  it("booking uniquement sur intention claire", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: { objectif: "perte de poids", budget: "500€", timing: "3 mois" },
      conversationStatus: "qualified",
    });
    expect(prompt).toContain("intention claire");
    expect(prompt).toContain('"je veux me lancer"');
    expect(prompt).toContain('"je veux réserver"');
  });

  it("ne pousse pas booking après 2-3 infos seulement", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("Ne l'envoie PAS après seulement 2-3 informations");
  });
});

describe("Promesses humaines", () => {
  it("interdit les phrases de promesse humaine", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("INTERDIT de dire");
    expect(prompt).toContain('"Je vais vérifier avec le coach"');
    expect(prompt).toContain('"Un membre de l\'équipe reviendra vers toi"');
    expect(prompt).toContain('"Je transmets ta demande"');
    expect(prompt).toContain('"Alex va te répondre"');
  });

  it("donne les formulations autorisées", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("le coach pourra te la confirmer");
    expect(prompt).toContain("le coach sera le mieux placé");
  });
});

describe("Format de réponse", () => {
  it("inclut request_human_confirmation dans les actions", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain('"request_human_confirmation"');
  });

  it("inclut commercial_unknown dans les reason_codes", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain('"commercial_unknown"');
  });

  it("inclut alert_reason dans le format JSON", () => {
    const prompt = buildSystemPrompt(BASE_CONFIG, {
      extractedInfo: {},
      conversationStatus: "qualifying",
    });
    expect(prompt).toContain("alert_reason");
  });
});
