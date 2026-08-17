import { AnimateIn } from "./animate-in";
import { CtaButton } from "./cta-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gray-950 pt-16 pb-24 md:pt-28 md:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <AnimateIn>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Programme pilote — 10 places
          </span>
        </AnimateIn>

        <AnimateIn delay={100}>
          <h1 className="mt-8 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ne perdez plus vos prospects dans vos{" "}
            <span className="text-violet-400">DM Instagram</span>.
          </h1>
        </AnimateIn>

        <AnimateIn delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            Kairos centralise vos conversations, qualifie les demandes
            et vous indique qui relancer et quand, pour que chaque
            échange puisse avancer vers un accompagnement.
          </p>
        </AnimateIn>

        <AnimateIn delay={300}>
          <div className="mt-10">
            <CtaButton href="#candidature" location="hero" className="px-7 py-3 text-base">
              Rejoindre le programme pilote
            </CtaButton>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>10 places seulement</span>
            <span className="hidden sm:inline">·</span>
            <span>30 jours gratuits</span>
            <span className="hidden sm:inline">·</span>
            <span>Sans carte bancaire</span>
          </div>
        </AnimateIn>

        <AnimateIn delay={400}>
          <div className="mx-auto mt-10 max-w-lg rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90">
            L'intégration Instagram est en cours de développement et
            sera déployée progressivement auprès des participants du
            programme pilote.
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
