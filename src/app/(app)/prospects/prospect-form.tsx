"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProspect, updateProspect } from "./actions";
import type { Prospect } from "@/lib/supabase/types";

const STATUS_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacte" },
  { value: "a_relancer", label: "A relancer" },
  { value: "gagne", label: "Gagne" },
  { value: "perdu", label: "Perdu" },
] as const;

export function ProspectForm({
  prospect,
  onClose,
}: {
  prospect?: Prospect;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isEdit = !!prospect;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateProspect(prospect.id, formData)
        : await createProspect(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => onClose(), 400);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Modifier le prospect" : "Nouveau prospect"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Prenom"
              name="first_name"
              defaultValue={prospect?.first_name}
              required
            />
            <Field
              label="Nom"
              name="last_name"
              defaultValue={prospect?.last_name}
              required
            />
          </div>

          <Field
            label="Entreprise"
            name="company"
            defaultValue={prospect?.company}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={prospect?.email}
            />
            <Field
              label="Telephone"
              name="phone"
              type="tel"
              defaultValue={prospect?.phone}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                name="status"
                defaultValue={prospect?.status ?? "nouveau"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Prochaine relance"
              name="next_followup_at"
              type="date"
              defaultValue={prospect?.next_followup_at ?? ""}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={prospect?.notes}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              {isEdit ? "Prospect mis a jour." : "Prospect cree."}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white",
                isPending
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700",
              )}
            >
              {isPending
                ? "Enregistrement..."
                : isEdit
                  ? "Enregistrer"
                  : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
