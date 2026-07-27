"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { saveAgentConfig, type AgentConfigFormState } from "./actions";
import type { AgentConfig } from "@/lib/supabase/types";

export function AgentConfigForm({ config }: { config: AgentConfig | null }) {
  const [faq, setFaq] = useState<Array<{ q: string; a: string }>>(
    config?.faq ?? [],
  );
  const [questions, setQuestions] = useState<string[]>(
    config?.qualification_questions ?? [],
  );
  const [requiredFields, setRequiredFields] = useState<string[]>(
    config?.required_qualification_fields ?? [],
  );

  const [state, formAction, pending] = useActionState<
    AgentConfigFormState,
    FormData
  >(saveAgentConfig, {});

  return (
    <form action={formAction} className="space-y-8">
      {/* Activité */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Votre activité</h2>
        <Field
          label="Nom de l'activité"
          name="business_name"
          defaultValue={config?.business_name}
          placeholder="Ex : Marie Dupont Coaching"
        />
        <Field
          label="Description de l'activité"
          name="business_description"
          defaultValue={config?.business_description}
          placeholder="Ex : J'accompagne les entrepreneurs à développer leur leadership..."
          textarea
        />
        <Field
          label="Offre principale"
          name="offer"
          defaultValue={config?.offer}
          placeholder="Ex : Programme d'accompagnement de 3 mois - 1500€"
          textarea
        />
        <Field
          label="Ton de l'agent"
          name="tone"
          defaultValue={config?.tone}
          placeholder="Ex : professionnel et chaleureux"
        />
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">FAQ</h2>
          <button
            type="button"
            onClick={() => setFaq([...faq, { q: "", a: "" }])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Questions fréquentes que l&apos;agent saura traiter automatiquement.
        </p>
        {faq.length === 0 && (
          <p className="text-sm text-gray-400 italic">Aucune FAQ ajoutée.</p>
        )}
        {faq.map((item, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.q}
                onChange={(e) => {
                  const next = [...faq];
                  next[i] = { ...next[i], q: e.target.value };
                  setFaq(next);
                }}
                placeholder="Question"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={item.a}
                onChange={(e) => {
                  const next = [...faq];
                  next[i] = { ...next[i], a: e.target.value };
                  setFaq(next);
                }}
                placeholder="Réponse"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setFaq(faq.filter((_, j) => j !== i))}
              className="self-start p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <input type="hidden" name="faq" value={JSON.stringify(faq)} />
      </section>

      {/* Questions de qualification */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Questions de qualification
          </h2>
          <button
            type="button"
            onClick={() => setQuestions([...questions, ""])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Questions que l&apos;agent posera pour qualifier le prospect.
        </p>
        {questions.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            Aucune question ajoutée.
          </p>
        )}
        {questions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => {
                const next = [...questions];
                next[i] = e.target.value;
                setQuestions(next);
              }}
              placeholder={`Question ${i + 1}`}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
              className="p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <input
          type="hidden"
          name="qualification_questions"
          value={JSON.stringify(questions)}
        />
      </section>

      {/* Champs de qualification requis */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Champs requis pour qualifier
          </h2>
          <button
            type="button"
            onClick={() => setRequiredFields([...requiredFields, ""])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Informations que l&apos;agent doit absolument collecter avant de
          considérer un prospect comme qualifié.
        </p>
        {requiredFields.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            Aucun champ requis. L&apos;agent qualifiera selon son jugement.
          </p>
        )}
        {requiredFields.map((f, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={f}
              onChange={(e) => {
                const next = [...requiredFields];
                next[i] = e.target.value;
                setRequiredFields(next);
              }}
              placeholder="Ex : budget, objectif, délai..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() =>
                setRequiredFields(requiredFields.filter((_, j) => j !== i))
              }
              className="p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <input
          type="hidden"
          name="required_qualification_fields"
          value={JSON.stringify(requiredFields)}
        />
      </section>

      {/* Règles de qualification (JSON libre pour l'alpha) */}
      <input
        type="hidden"
        name="qualification_rules"
        value={JSON.stringify({})}
      />

      {/* Réservation */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Réservation</h2>
        <Field
          label="Lien Calendly ou Cal.com"
          name="booking_link"
          defaultValue={config?.booking_link}
          placeholder="https://calendly.com/votre-lien"
        />
        <Field
          label="Message accompagnant le lien"
          name="booking_message"
          defaultValue={config?.booking_message}
          placeholder="Ex : Voici mon lien pour réserver un appel découverte :"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Relances maximum
          </label>
          <select
            name="max_followups"
            defaultValue={config?.max_followups ?? 2}
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Nombre maximum de relances automatiques par conversation.
          </p>
        </div>
      </section>

      {/* Feedback + Submit */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" /> Configuration sauvegardée
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {pending ? "Sauvegarde..." : "Sauvegarder"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  const className =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          className={className}
        />
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={className}
        />
      )}
    </div>
  );
}
