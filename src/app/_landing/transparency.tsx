import { AnimateIn } from "./animate-in";

type Status = "ready" | "testing" | "development";

const features: { name: string; status: Status }[] = [
  { name: "CRM prospects", status: "ready" },
  { name: "Relances", status: "ready" },
  { name: "Dashboard", status: "ready" },
  { name: "Inbox", status: "ready" },
  { name: "Analyse IA", status: "testing" },
  { name: "Intégration Instagram", status: "development" },
];

const statusConfig: Record<Status, { label: string; dotColor: string; textColor: string }> = {
  ready: { label: "Fonctionnel", dotColor: "bg-green-400", textColor: "text-green-400" },
  testing: { label: "En test", dotColor: "bg-amber-400", textColor: "text-amber-400" },
  development: { label: "En développement", dotColor: "bg-blue-400", textColor: "text-blue-400" },
};

export function Transparency() {
  return (
    <section className="bg-gray-950 py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Où en est le produit
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-gray-400">
            Kairos est en cours de construction. Voici ce qui fonctionne
            aujourd'hui et ce qui arrive bientôt.
          </p>
        </AnimateIn>

        <AnimateIn delay={150}>
          <div className="mt-10 overflow-hidden rounded-xl border border-gray-800">
            {features.map((feature, i) => {
              const config = statusConfig[feature.status];
              return (
                <div
                  key={feature.name}
                  className={`flex items-center justify-between px-5 py-3.5 ${i !== features.length - 1 ? "border-b border-gray-800/60" : ""}`}
                >
                  <span className="text-sm font-medium text-gray-300">
                    {feature.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                    <span className={`text-xs font-medium ${config.textColor}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
