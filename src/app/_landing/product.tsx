import { AnimateIn } from "./animate-in";

function WindowFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-black/30">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
        <span className="ml-2 text-xs font-medium text-gray-500">
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function InboxMockup() {
  const conversations = [
    { name: "Thomas L.", preview: "Salut, j'aimerais perdre 8 kg...", time: "14:32", unread: true },
    { name: "Julie M.", preview: "Je cherche un coach nutrition", time: "13:15", unread: true },
    { name: "Marc D.", preview: "Bonjour, vous proposez quoi comme...", time: "11:40", unread: false },
    { name: "Sophie R.", preview: "Merci pour les infos !", time: "Hier", unread: false },
  ];
  const messages = [
    { role: "contact" as const, text: "Salut, j'aimerais perdre 8 kg mais j'ai du mal à tenir seul" },
    { role: "agent" as const, text: "Bonjour Thomas ! Je suis l'assistant de Coach Marie. Tu cherches un accompagnement nutrition ?" },
    { role: "contact" as const, text: "Oui exactement, j'ai essayé plusieurs régimes sans résultat" },
    { role: "agent" as const, text: "Je comprends. As-tu un objectif de timing en tête ?" },
  ];
  return (
    <WindowFrame title="Inbox — Kairos">
      <div className="flex min-h-[320px]">
        <div className="hidden w-52 shrink-0 border-r border-gray-100 sm:block">
          {conversations.map((c) => (
            <div key={c.name} className={`border-b border-gray-50 px-3 py-2.5 ${c.name === "Thomas L." ? "bg-violet-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${c.name === "Thomas L." ? "text-violet-700" : "text-gray-900"}`}>{c.name}</span>
                <span className="text-[10px] text-gray-400">{c.time}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">{c.preview}</p>
              {c.unread && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">T</div>
            <div>
              <span className="text-xs font-semibold text-gray-900">Thomas L.</span>
              <span className="ml-2 text-[10px] text-gray-400">via Instagram</span>
            </div>
          </div>
          <div className="space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "contact" ? "flex justify-start" : "flex justify-end"}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] ${m.role === "contact" ? "bg-gray-100 text-gray-800" : "bg-violet-600 text-white"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function ProspectsMockup() {
  const rows = [
    { name: "Thomas L.", status: "Qualifié", statusColor: "bg-green-100 text-green-700", info: "Perdre 8 kg", action: "RDV à planifier" },
    { name: "Julie M.", status: "En cours", statusColor: "bg-amber-100 text-amber-700", info: "Prise de masse", action: "Relance dans 2h" },
    { name: "Marc D.", status: "Nouveau", statusColor: "bg-blue-100 text-blue-700", info: "Rééquilibrage", action: "Qualification" },
    { name: "Sophie R.", status: "Gagné", statusColor: "bg-green-100 text-green-700", info: "Programme 12 sem.", action: "Accompagnement" },
  ];
  return (
    <WindowFrame title="Prospects — Kairos">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Prospect</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Objectif</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{r.name[0]}</div>
                    <span className="text-xs font-medium text-gray-900">{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.statusColor}`}>{r.status}</span></td>
                <td className="hidden px-4 py-3 text-xs text-gray-600 sm:table-cell">{r.info}</td>
                <td className="hidden px-4 py-3 text-xs text-gray-600 md:table-cell">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WindowFrame>
  );
}

function RelancesMockup() {
  const items = [
    { name: "Thomas L.", time: "Aujourd'hui 16:00", type: "Relance 1", context: "N'a pas répondu depuis 24h" },
    { name: "Julie M.", time: "Demain 10:00", type: "Relance 1", context: "En attente de confirmation budget" },
    { name: "Marc D.", time: "Jeu. 14:00", type: "Relance 2", context: "Intéressé mais hésitant" },
  ];
  return (
    <WindowFrame title="Relances — Kairos">
      <div className="divide-y divide-gray-50 p-1">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">{item.name[0]}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{item.name}</span>
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">{item.type}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500">{item.context}</p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{item.time}</span>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

function DashboardMockup() {
  const stats = [
    { label: "Prospects actifs", value: "24", change: "+6 cette semaine" },
    { label: "Taux de qualification", value: "68%", change: "+12% vs mois dernier" },
    { label: "Relances prévues", value: "8", change: "3 aujourd'hui" },
    { label: "RDV générés", value: "11", change: "ce mois" },
  ];
  return (
    <WindowFrame title="Dashboard — Kairos">
      <div className="grid grid-cols-2 gap-3 p-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">{s.change}</p>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

const sections = [
  {
    title: "Inbox",
    subtitle: "Toutes vos conversations au même endroit",
    text: "Retrouvez chaque échange avec vos prospects, avec le contexte complet et l'historique des messages.",
    mockup: InboxMockup,
  },
  {
    title: "CRM Prospects",
    subtitle: "Chaque prospect a une fiche claire",
    text: "Statut, informations extraites, objectif, prochaine action — tout est accessible en un coup d'œil.",
    mockup: ProspectsMockup,
  },
  {
    title: "Relances",
    subtitle: "Ne laissez plus un prospect sans suite",
    text: "Les relances sont planifiées et contextualisées. Vous savez toujours qui relancer et pourquoi.",
    mockup: RelancesMockup,
  },
  {
    title: "Dashboard",
    subtitle: "Votre vue d'ensemble",
    text: "Suivez vos prospects actifs, votre taux de qualification et les actions à venir.",
    mockup: DashboardMockup,
  },
];

export function Product() {
  return (
    <section className="bg-gray-900 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Voilà concrètement ce que vous obtenez
          </h2>
        </AnimateIn>

        <div className="mt-16 space-y-24">
          {sections.map((section, i) => {
            const Mockup = section.mockup;
            const reversed = i % 2 !== 0;
            return (
              <AnimateIn key={section.title}>
                <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-14">
                  <div
                    className={`lg:col-span-2 ${reversed ? "lg:order-2" : ""}`}
                  >
                    <p className="text-xs font-semibold tracking-wider text-violet-400 uppercase">
                      {section.title}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">
                      {section.subtitle}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">
                      {section.text}
                    </p>
                  </div>
                  <div
                    className={`lg:col-span-3 ${reversed ? "lg:order-1" : ""}`}
                  >
                    <Mockup />
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
