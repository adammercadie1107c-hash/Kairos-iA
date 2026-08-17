import {
  MessageSquare,
  Clock,
  Search,
  HelpCircle,
  TrendingUp,
  List,
} from "lucide-react";
import { AnimateIn } from "./animate-in";

const problems = [
  {
    icon: MessageSquare,
    title: "Des prospects dispersés",
    text: "DM, commentaires, réponses stories… vos demandes arrivent de partout et se perdent.",
  },
  {
    icon: Clock,
    title: "Des relances oubliées",
    text: "Un prospect intéressé ne répond plus, puis tombe dans l'oubli faute de suivi.",
  },
  {
    icon: Search,
    title: "Le contexte perdu",
    text: "Impossible de retrouver rapidement l'objectif, le budget ou la situation d'un prospect.",
  },
  {
    icon: HelpCircle,
    title: "Curieux ou intéressé ?",
    text: "Difficile de distinguer les prospects sérieux de ceux qui posent juste une question.",
  },
  {
    icon: TrendingUp,
    title: "Des pics de messages",
    text: "Un contenu fonctionne et beaucoup de demandes arrivent en même temps.",
  },
  {
    icon: List,
    title: "Aucune priorité claire",
    text: "Impossible de savoir quel prospect traiter en premier quand tout s'accumule.",
  },
];

export function Problems() {
  return (
    <section className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ce que vivent les coachs chaque jour
          </h2>
        </AnimateIn>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((item, i) => {
            const Icon = item.icon;
            return (
              <AnimateIn key={item.title} delay={i * 80}>
                <div className="h-full rounded-xl border border-gray-800 bg-gray-950/60 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {item.text}
                  </p>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
