import { Clock, EyeOff, UserMinus, RefreshCw } from "lucide-react";
import { AnimateIn } from "./animate-in";

const problems = [
  {
    icon: Clock,
    title: "Réponses trop lentes",
    text: "Tes prospects envoient un DM et attendent... parfois trop longtemps.",
  },
  {
    icon: EyeOff,
    title: "Conversations oubliées",
    text: "Des leads prometteurs se perdent dans ta boîte de réception.",
  },
  {
    icon: UserMinus,
    title: "Prospects qui disparaissent",
    text: "Sans relance, le prospect passe à autre chose.",
  },
  {
    icon: RefreshCw,
    title: "Questions répétitives",
    text: "Tu poses toujours les mêmes questions pour qualifier tes leads.",
  },
];

export function Problem() {
  return (
    <section className="bg-gray-50/70 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Tes meilleurs prospects sont peut-être déjà dans tes DM.
          </h2>
        </AnimateIn>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((item, i) => {
            const Icon = item.icon;
            return (
              <AnimateIn key={item.title} delay={i * 100}>
                <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                    <Icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {item.text}
                  </p>
                </div>
              </AnimateIn>
            );
          })}
        </div>

        <AnimateIn delay={500}>
          <p className="mt-14 text-center text-lg font-medium text-gray-700">
            Kairos s'occupe de la conversation pendant que tu te
            concentres sur ton coaching.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
