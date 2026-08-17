import { AnimateIn } from "./animate-in";

const steps = [
  {
    number: "1",
    title: "Vos conversations sont centralisées",
    text: "Tous vos échanges regroupés au même endroit pour ne plus rien perdre.",
  },
  {
    number: "2",
    title: "L'IA analyse et extrait les informations",
    text: "Objectif du prospect, contraintes, budget, motivation — tout est identifié automatiquement.",
  },
  {
    number: "3",
    title: "Le prospect est qualifié",
    text: "Niveau d'intérêt évalué et résumé de sa situation disponible en un coup d'œil.",
  },
  {
    number: "4",
    title: "Vous savez quoi faire ensuite",
    text: "Relance, prochaine action, priorité — chaque prospect a une suite claire.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            De la conversation à la prochaine action
          </h2>
        </AnimateIn>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {steps.map((step, i) => (
            <AnimateIn key={step.number} delay={i * 120}>
              <div className="flex gap-4 rounded-xl border border-gray-800 bg-gray-950/60 p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                    {step.text}
                  </p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
