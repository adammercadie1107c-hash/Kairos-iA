import { AnimateIn } from "./animate-in";
import { CtaButton } from "./cta-button";

export function BetaCta() {
  return (
    <section className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Teste Kairos sur tes vrais DM.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-400">
              Nous ouvrons actuellement Kairos à quelques coachs en
              nutrition afin d'améliorer le produit avec leurs retours.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-400">
              <span>60&nbsp;jours gratuits pendant la bêta</span>
              <span className="hidden sm:inline">·</span>
              <span>Aucune carte bancaire</span>
            </div>
            <div className="mt-8">
              <CtaButton
                href="/signup"
                location="final_cta"
                className="bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-white"
              >
                Créer mon compte gratuitement
              </CtaButton>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
