import { AnimateIn } from "./animate-in";

function InboxMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">Inbox</span>
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
          3
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {[
          {
            name: "Thomas L.",
            msg: "Salut, j'aimerais perdre...",
            time: "8s",
            active: true,
          },
          {
            name: "Julie M.",
            msg: "Je cherche un coach pour...",
            time: "12s",
            active: false,
          },
          {
            name: "Marc D.",
            msg: "Bonjour, est-ce que vous...",
            time: "3s",
            active: false,
          },
        ].map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
              {item.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">
                  {item.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <span className="h-1 w-1 rounded-full bg-green-500" />
                  {item.time}
                </span>
              </div>
              <p className="truncate text-[11px] text-gray-500">{item.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowupMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <div className="border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">
          Relances prévues
        </span>
      </div>
      <div className="space-y-2.5 p-3">
        {[
          {
            name: "Thomas L.",
            time: "Dans 2h",
            status: "pending" as const,
          },
          {
            name: "Julie M.",
            time: "Demain 10h",
            status: "pending" as const,
          },
          {
            name: "Marc D.",
            time: "Jeu. 14h",
            status: "pending" as const,
          },
        ].map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-gray-800">
                {item.name}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">{item.time}</span>
          </div>
        ))}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-violet-600">
          <span className="font-semibold">12</span>
          <span className="text-gray-500">relances cette semaine</span>
        </div>
      </div>
    </div>
  );
}

function BookingMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <div className="border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">
          Qualification
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
            T
          </div>
          <div>
            <span className="text-xs font-medium text-gray-900">
              Thomas L.
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-green-600 font-medium">
                Qualifié
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Objectif</span>
            <span className="font-medium text-gray-800">Perdre 8 kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Deadline</span>
            <span className="font-medium text-gray-800">Cet été</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Budget</span>
            <span className="font-medium text-gray-800">Flexible</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-center text-[11px] font-medium text-violet-700">
          Lien de rendez-vous envoyé
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Une réponse pendant que tu coaches.",
    text: "Kairos échange automatiquement avec les nouveaux prospects en respectant ton offre, ton ton et tes règles.",
    mockup: InboxMockup,
  },
  {
    title: "Les prospects oubliés n'existent plus.",
    text: "Quand un prospect arrête de répondre, Kairos programme et envoie automatiquement une relance contextualisée.",
    mockup: FollowupMockup,
  },
  {
    title: "Du DM au rendez-vous.",
    text: "Quand le prospect est suffisamment qualifié, Kairos lui propose ton lien de prise de rendez-vous.",
    mockup: BookingMockup,
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="bg-gray-50/70 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Tout ce qu'il faut pour convertir tes DM.
          </h2>
        </AnimateIn>

        <div className="mt-16 space-y-20">
          {features.map((feature, i) => {
            const Mockup = feature.mockup;
            const reversed = i % 2 !== 0;
            return (
              <AnimateIn key={feature.title}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reversed ? "lg:direction-rtl" : ""}`}
                >
                  <div className={reversed ? "lg:order-2" : ""}>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600">
                      {feature.text}
                    </p>
                  </div>
                  <div
                    className={`mx-auto w-full max-w-sm ${reversed ? "lg:order-1" : ""}`}
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
