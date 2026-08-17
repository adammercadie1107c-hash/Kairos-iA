"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimateIn } from "./animate-in";

const items = [
  {
    q: "L'intégration Instagram est-elle déjà fonctionnelle ?",
    a: "L'intégration Instagram est en cours de développement. Le CRM, les relances, le dashboard et l'inbox sont opérationnels. L'analyse IA est en phase de test. Nous sommes transparents sur l'avancement — consultez la section « Où en est le produit » sur cette page.",
  },
  {
    q: "Quand commence le programme pilote ?",
    a: "Le programme pilote démarre dès que votre candidature est acceptée. Vous aurez 30 jours d'utilisation gratuite à compter de l'activation réelle de votre compte, pas de la date de candidature.",
  },
  {
    q: "Faut-il déjà recevoir des DM pour utiliser Kairos ?",
    a: "Pas nécessairement. Kairos inclut un CRM prospects que vous pouvez utiliser indépendamment des DM Instagram. C'est un outil complet de gestion de vos prospects, pas uniquement un assistant de messagerie.",
  },
  {
    q: "Combien coûtera Kairos après les 30 jours ?",
    a: "Le tarif n'est pas encore fixé. Les participants au programme pilote bénéficieront d'un tarif fondateur préférentiel lorsque la version payante sera lancée. Aucune carte bancaire n'est demandée pendant le pilote.",
  },
  {
    q: "Que se passe-t-il à la fin des 30 jours ?",
    a: "Nous vous préviendrons avant la fin de la période. Vous pourrez choisir de continuer avec le tarif fondateur ou d'arrêter sans engagement. Vos données restent accessibles.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Questions fréquentes
          </h2>
        </AnimateIn>

        <div className="mt-12 divide-y divide-gray-800">
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
                    <span className="text-sm font-semibold text-white">
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
                      <p className="pb-5 text-sm leading-relaxed text-gray-400">
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
