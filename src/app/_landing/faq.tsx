"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimateIn } from "./animate-in";

const items = [
  {
    q: "Est-ce que Kairos répond vraiment directement sur Instagram ?",
    a: "Oui. Kairos se connecte à ton compte Instagram professionnel via l'API officielle Meta et envoie les réponses directement en DM, comme si tu répondais toi-même.",
  },
  {
    q: "Puis-je reprendre la main sur une conversation ?",
    a: "Absolument. Tu peux désactiver l'IA sur n'importe quelle conversation depuis l'Inbox et répondre toi-même. Kairos peut aussi te transmettre automatiquement les conversations qui nécessitent ton intervention.",
  },
  {
    q: "Est-ce que Kairos remplace complètement un setter ?",
    a: "Kairos gère la première prise de contact, la qualification et les relances. Pour les échanges complexes ou sensibles, il transmet la conversation au coach. C'est un assistant, pas un remplaçant.",
  },
  {
    q: "Que se passe-t-il si Kairos ne connaît pas une réponse ?",
    a: "Kairos ne fabrique jamais d'information. S'il ne peut pas répondre avec certitude, il te remonte la question via une alerte pour que tu puisses intervenir.",
  },
  {
    q: "Combien de temps dure l'accès bêta ?",
    a: "L'accès bêta est gratuit pendant 60 jours. Aucune carte bancaire n'est demandée. Tu peux tester Kairos sur tes vrais DM sans engagement.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Questions fréquentes
          </h2>
        </AnimateIn>

        <div className="mt-12 divide-y divide-gray-200">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <AnimateIn key={i} delay={i * 80}>
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-start justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold text-gray-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 text-sm leading-relaxed text-gray-600">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
