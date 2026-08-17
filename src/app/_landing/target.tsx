import { Check } from "lucide-react";
import { AnimateIn } from "./animate-in";

const criteria = [
  "Vous vendez des accompagnements nutrition, fitness ou transformation physique.",
  "Vous générez des demandes via Instagram.",
  "Vous gérez encore beaucoup de conversations manuellement.",
  "Vous perdez du temps à organiser vos relances.",
  "Vous voulez mieux qualifier vos prospects sans déshumaniser la conversation.",
];

export function Target() {
  return (
    <section className="bg-gray-950 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Kairos est fait pour vous si…
          </h2>
        </AnimateIn>

        <div className="mt-12 space-y-4">
          {criteria.map((item, i) => (
            <AnimateIn key={i} delay={i * 80}>
              <div className="flex items-start gap-4 rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-4">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                  <Check className="h-3 w-3 text-violet-400" />
                </div>
                <p className="text-sm leading-relaxed text-gray-300">
                  {item}
                </p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
