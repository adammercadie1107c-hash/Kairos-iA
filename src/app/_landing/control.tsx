import { Shield, Bell, ToggleRight, AlertTriangle } from "lucide-react";
import { AnimateIn } from "./animate-in";

const points = [
  {
    icon: Bell,
    title: "Alertes coach",
    text: "Quand une question nécessite ton expertise, Kairos te notifie et te transmet la conversation.",
  },
  {
    icon: ToggleRight,
    title: "IA désactivable",
    text: "Tu peux désactiver l'IA sur n'importe quelle conversation et reprendre la main à tout moment.",
  },
  {
    icon: AlertTriangle,
    title: "Aucune invention",
    text: "Kairos ne fabrique pas d'informations commerciales. S'il ne sait pas, il remonte la question.",
  },
  {
    icon: Shield,
    title: "Handoff humain",
    text: "Les demandes sensibles ou complexes sont automatiquement transmises au coach.",
  },
];

export function Control() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Tu gardes toujours le contrôle.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-gray-600">
            Kairos t'assiste, il ne te remplace pas. Chaque décision
            importante reste entre tes mains.
          </p>
        </AnimateIn>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {points.map((item, i) => {
            const Icon = item.icon;
            return (
              <AnimateIn key={item.title} delay={i * 100}>
                <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                    <Icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                      {item.text}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
