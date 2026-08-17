import { AnimateIn } from "./animate-in";

const prospects = [
  {
    initials: "T",
    name: "Thomas L.",
    status: "Qualifié",
    statusColor: "bg-green-100 text-green-700",
    info: "Perdre 8 kg · Cet été",
    nextAction: "RDV envoyé",
  },
  {
    initials: "J",
    name: "Julie M.",
    status: "En cours",
    statusColor: "bg-amber-100 text-amber-700",
    info: "Prise de masse · 3 mois",
    nextAction: "Relance dans 2h",
  },
  {
    initials: "M",
    name: "Marc D.",
    status: "Nouveau",
    statusColor: "bg-blue-100 text-blue-700",
    info: "Rééquilibrage alimentaire",
    nextAction: "Qualification",
  },
  {
    initials: "S",
    name: "Sophie R.",
    status: "Handoff",
    statusColor: "bg-violet-100 text-violet-700",
    info: "Question spécifique",
    nextAction: "À traiter",
  },
];

export function Crm() {
  return (
    <section className="bg-gray-50/70 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Chaque conversation devient exploitable.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-gray-600">
            Tous tes prospects centralisés avec leur statut, les infos
            extraites et la prochaine action.
          </p>
        </AnimateIn>

        <AnimateIn delay={200}>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-1 shadow-xl shadow-gray-200/60">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">
                Prospects
              </span>
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                4 actifs
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Prospect</th>
                    <th className="px-4 py-2.5 font-medium">Statut</th>
                    <th className="px-4 py-2.5 font-medium">Infos</th>
                    <th className="px-4 py-2.5 font-medium">
                      Prochaine action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {prospects.map((p) => (
                    <tr key={p.name}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                            {p.initials}
                          </div>
                          <span className="font-medium text-gray-900">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.statusColor}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.info}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.nextAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-50 sm:hidden">
              {prospects.map((p) => (
                <div key={p.name} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                        {p.initials}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {p.name}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.statusColor}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1.5 ml-9 text-xs text-gray-500">
                    {p.info} · {p.nextAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
