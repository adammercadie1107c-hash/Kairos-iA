import { Check } from "lucide-react";
import { AnimateIn } from "./animate-in";
import { CtaButton } from "./cta-button";

const benefits = [
  "30 jours d'utilisation gratuite à partir de l'activation réelle",
  "Configuration personnalisée de votre compte",
  "Accès prioritaire aux nouvelles fonctionnalités",
  "Accompagnement par messages ou Loom",
  "Tarif fondateur lorsque la version payante sera lancée",
  "Aucune carte bancaire demandée",
];

const expectations = [
  "Utiliser réellement Kairos au quotidien",
  "Signaler les bugs ou incompréhensions",
  "Transmettre des retours honnêtes sur le produit",
  "Accepter quelques échanges pour nous aider à améliorer Kairos",
];

export function PilotProgram() {
  return (
    <section className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Rejoignez les 10 premiers coachs à tester Kairos
          </h2>
        </AnimateIn>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <AnimateIn delay={100}>
            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-6">
              <h3 className="text-lg font-semibold text-white">
                Ce que vous recevez
              </h3>
              <div className="mt-5 space-y-3">
                {benefits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                      <Check className="h-3 w-3 text-violet-400" />
                    </div>
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={200}>
            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-6">
              <h3 className="text-lg font-semibold text-white">
                Ce que nous demandons
              </h3>
              <div className="mt-5 space-y-3">
                {expectations.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800">
                      <Check className="h-3 w-3 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>

        <AnimateIn delay={300}>
          <div className="mt-12 text-center">
            <CtaButton
              href="#candidature"
              location="pilot_section"
              className="px-7 py-3"
            >
              Candidater au programme pilote
            </CtaButton>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
