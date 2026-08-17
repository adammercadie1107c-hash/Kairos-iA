import {
  Target,
  AlertTriangle,
  BarChart3,
  BookOpen,
  ArrowRight,
  Clock,
} from "lucide-react";
import { AnimateIn } from "./animate-in";

const capabilities = [
  {
    icon: Target,
    text: "Identifier l'objectif du prospect",
  },
  {
    icon: AlertTriangle,
    text: "Repérer ses freins et objections",
  },
  {
    icon: BarChart3,
    text: "Estimer son niveau d'intérêt",
  },
  {
    icon: BookOpen,
    text: "Conserver les informations importantes",
  },
  {
    icon: ArrowRight,
    text: "Suggérer la prochaine action",
  },
  {
    icon: Clock,
    text: "Détecter le bon moment pour relancer",
  },
];

export function AiSection() {
  return (
    <section className="bg-gray-950 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ce que l'IA fait concrètement
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
            Pas de promesses vagues. Voici précisément ce que Kairos
            analyse dans chaque conversation.
          </p>
        </AnimateIn>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, i) => {
            const Icon = item.icon;
            return (
              <AnimateIn key={item.text} delay={i * 80}>
                <div className="flex items-center gap-3.5 rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                    <Icon className="h-4 w-4 text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {item.text}
                  </span>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
