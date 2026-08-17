"use client";

import {
  MessageSquare,
  Zap,
  CheckCircle,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { AnimateIn } from "./animate-in";

const steps = [
  {
    icon: MessageSquare,
    title: "DM reçu",
    text: "Un prospect t'envoie un message sur Instagram.",
  },
  {
    icon: Zap,
    title: "Kairos répond",
    text: "Réponse instantanée, naturelle et personnalisée.",
  },
  {
    icon: CheckCircle,
    title: "Qualification",
    text: "Questions progressives pour évaluer le prospect.",
  },
  {
    icon: RotateCcw,
    title: "Relance",
    text: "Si le prospect ne répond plus, Kairos relance.",
  },
  {
    icon: Calendar,
    title: "Rendez-vous",
    text: "Lien de prise de rendez-vous envoyé automatiquement.",
  },
];

export function Flow() {
  return (
    <section id="flow" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Du premier message au rendez-vous.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-gray-600">
            Kairos gère chaque étape du parcours prospect, sans que tu
            aies à intervenir.
          </p>
        </AnimateIn>

        {/* Desktop flow */}
        <div className="mt-16 hidden lg:block">
          <div className="relative flex items-start justify-between">
            {/* Connecting line */}
            <div className="absolute top-6 right-[10%] left-[10%] h-px bg-gradient-to-r from-violet-200 via-violet-300 to-violet-200" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <AnimateIn
                  key={step.title}
                  delay={i * 150}
                  className="relative flex w-1/5 flex-col items-center text-center"
                >
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-violet-200 bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                    {step.text}
                  </p>
                </AnimateIn>
              );
            })}
          </div>
        </div>

        {/* Mobile flow */}
        <div className="mt-12 lg:hidden">
          <div className="relative ml-6 border-l-2 border-violet-100 pl-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <AnimateIn
                  key={step.title}
                  delay={i * 100}
                  className="relative pb-10 last:pb-0"
                >
                  <div className="absolute -left-[calc(2rem+1.25rem+1px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-200 bg-white">
                    <Icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {step.text}
                  </p>
                </AnimateIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
