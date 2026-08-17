"use client";

import { useRef, useState, useTransition } from "react";
import { AnimateIn } from "./animate-in";
import { submitPilotApplication } from "../pilot-actions";
import { trackEvent } from "@/lib/analytics/posthog-client";

const coachingTypes = [
  "Nutrition / Perte de poids",
  "Prise de masse / Musculation",
  "Sport / Fitness",
  "Bien-être / Santé globale",
  "Autre",
];

export function PilotForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const hasTrackedStart = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFirstFocus() {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackEvent("pilot_form_started", {});
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const data = {
        first_name: formData.get("first_name") as string,
        email: formData.get("email") as string,
        instagram_handle: formData.get("instagram_handle") as string,
        coaching_type: formData.get("coaching_type") as string,
        price_range: formData.get("price_range") as string,
        weekly_dms: formData.get("weekly_dms") as string,
        current_process: formData.get("current_process") as string,
      };

      const res = await submitPilotApplication(data);
      setResult(res);

      if (res.success) {
        trackEvent("pilot_form_submitted", {});
        formRef.current?.reset();
      } else {
        trackEvent("pilot_form_error", {});
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  if (result?.success) {
    return (
      <section id="candidature" className="bg-gray-950 py-20 md:py-28">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <AnimateIn>
            <div className="rounded-xl border border-green-800/40 bg-green-950/30 p-8 text-center">
              <h2 className="text-2xl font-bold text-white">
                Candidature envoyée
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Merci pour votre candidature. Nous vous recontacterons très vite
                par email pour la suite.
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>
    );
  }

  return (
    <section id="candidature" className="bg-gray-950 py-20 md:py-28">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <AnimateIn>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Candidater au programme pilote
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-sm text-gray-400">
            10 places disponibles. Remplissez le formulaire ci-dessous et nous
            reviendrons vers vous rapidement.
          </p>
        </AnimateIn>

        <AnimateIn delay={150}>
          <form
            ref={formRef}
            action={handleSubmit}
            onFocus={handleFirstFocus}
            className="mt-10 space-y-5"
          >
            <div>
              <label
                htmlFor="first_name"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Prénom <span className="text-violet-400">*</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                className={inputClass}
                placeholder="Votre prénom"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Email <span className="text-violet-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label
                htmlFor="instagram_handle"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Compte Instagram <span className="text-violet-400">*</span>
              </label>
              <input
                id="instagram_handle"
                name="instagram_handle"
                type="text"
                required
                className={inputClass}
                placeholder="@votre_compte"
              />
            </div>

            <div>
              <label
                htmlFor="coaching_type"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Type de coaching <span className="text-violet-400">*</span>
              </label>
              <select
                id="coaching_type"
                name="coaching_type"
                required
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Sélectionnez
                </option>
                {coachingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="price_range"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Prix de votre accompagnement
              </label>
              <input
                id="price_range"
                name="price_range"
                type="text"
                className={inputClass}
                placeholder="ex: 200-500€"
              />
            </div>

            <div>
              <label
                htmlFor="weekly_dms"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Nombre de DM reçus par semaine
              </label>
              <input
                id="weekly_dms"
                name="weekly_dms"
                type="text"
                className={inputClass}
                placeholder="ex: 10-20"
              />
            </div>

            <div>
              <label
                htmlFor="current_process"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Comment gérez-vous vos prospects aujourd'hui ?
              </label>
              <textarea
                id="current_process"
                name="current_process"
                rows={3}
                className={inputClass}
                placeholder="Décrivez brièvement votre processus actuel"
              />
            </div>

            {result?.error && (
              <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                {result.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50"
            >
              {isPending ? "Envoi en cours…" : "Envoyer ma candidature"}
            </button>
          </form>
        </AnimateIn>
      </div>
    </section>
  );
}
