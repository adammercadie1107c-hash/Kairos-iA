import { AnimateIn } from "./animate-in";
import { CtaButton } from "./cta-button";

const messages = [
  {
    role: "prospect" as const,
    text: "Salut, j’aimerais perdre 8 kg mais j’ai du mal à tenir seul",
  },
  {
    role: "kairos" as const,
    text: "Salut ! Je suis l’assistant de Coach Marie. Tu cherches un accompagnement nutrition ? Depuis combien de temps tu essaies ?",
  },
  {
    role: "prospect" as const,
    text: "6 mois environ, j’ai essayé plusieurs régimes",
  },
  {
    role: "kairos" as const,
    text: "Je comprends. As-tu un objectif de timing en tête ?",
  },
  {
    role: "prospect" as const,
    text: "J’aimerais être en forme pour cet été",
  },
];

export function Hero() {
  return (
    <section className="overflow-hidden bg-white pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <AnimateIn>
              <p className="mb-4 inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-violet-700 uppercase">
                Conçu pour les coachs en nutrition
              </p>
            </AnimateIn>
            <AnimateIn delay={100}>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
                Transforme tes DM Instagram en{" "}
                <span className="text-violet-600">clients</span>.
              </h1>
            </AnimateIn>
            <AnimateIn delay={200}>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600">
                Kairos répond à tes prospects, les qualifie, les
                relance et les accompagne jusqu’à la prise de
                rendez-vous&nbsp;— automatiquement.
              </p>
            </AnimateIn>
            <AnimateIn delay={300}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <CtaButton href="/signup" location="hero">
                  Tester Kairos gratuitement
                </CtaButton>
                <CtaButton href="#flow" location="hero" variant="secondary">
                  Voir comment ça marche
                </CtaButton>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Accès bêta gratuit pendant 60&nbsp;jours&nbsp;·
                Aucune carte bancaire
              </p>
            </AnimateIn>
          </div>

          <AnimateIn delay={400} className="relative">
            <div className="rounded-2xl border border-gray-200 bg-white p-1 shadow-xl shadow-gray-200/60">
              <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                </div>
                <span className="ml-2 text-xs font-medium text-gray-500">
                  Inbox Kairos
                </span>
              </div>
              <div className="space-y-3 p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={
                      msg.role === "prospect"
                        ? "flex justify-start"
                        : "flex justify-end"
                    }
                  >
                    <div
                      className={
                        msg.role === "prospect"
                          ? "max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-800"
                          : "max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2.5 text-sm text-white"
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Prospect qualifié
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2.5 text-sm text-white">
                    Super ! Coach Marie propose un programme adapté. Voici
                    son lien pour réserver un appel découverte&nbsp;:
                    <span className="mt-1 block text-violet-200 underline">
                      calendly.com/coach-marie
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
