import { AnimateIn } from "./animate-in";

const steps = [
  {
    number: "1",
    title: "Crée ton compte",
    text: "Inscription en 30 secondes. Aucune carte bancaire requise.",
  },
  {
    number: "2",
    title: "Connecte Instagram",
    text: "Relie ton compte professionnel et configure ton offre, ton ton et tes règles.",
  },
  {
    number: "3",
    title: "Kairos travaille",
    text: "Chaque nouveau DM est pris en charge automatiquement. Tu suis tout depuis ton tableau de bord.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Prêt en 5 minutes.
          </h2>
        </AnimateIn>

        <div className="mx-auto mt-14 grid max-w-3xl gap-8 md:grid-cols-3 md:gap-12">
          {steps.map((step, i) => (
            <AnimateIn
              key={step.number}
              delay={i * 150}
              className="text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                {step.number}
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {step.text}
              </p>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
