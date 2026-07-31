"use client";

import { useState, useTransition, useId } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProspect, updateProspect } from "./actions";
import type { Prospect } from "@/lib/supabase/types";

const STATUS_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "a_relancer", label: "À relancer" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
] as const;

const todayStr = () => new Date().toISOString().split("T")[0];

export function ProspectForm({
  prospect,
  onClose,
}: {
  prospect?: Prospect;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notesLen, setNotesLen] = useState(prospect?.notes?.length ?? 0);
  const [actionLen, setActionLen] = useState(prospect?.next_action?.length ?? 0);
  const isEdit = !!prospect;
  const formId = useId();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGlobalError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateProspect(prospect.id, formData)
        : await createProspect(formData);

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      } else if (result.error) {
        setGlobalError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => onClose(), 400);
      }
    });
  }

  function errId(name: string) {
    return `${formId}-err-${name}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
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

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Prénom"
              name="first_name"
              defaultValue={prospect?.first_name}
              error={fieldErrors.first_name}
              errId={errId("first_name")}
              required
            />
            <FormField
              label="Nom"
              name="last_name"
              defaultValue={prospect?.last_name}
              errId={errId("last_name")}
            />
          </div>

          <FormField
            label="Entreprise"
            name="company"
            defaultValue={prospect?.company}
            errId={errId("company")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              defaultValue={prospect?.email ?? undefined}
              error={fieldErrors.email}
              errId={errId("email")}
            />
            <FormField
              label="Téléphone"
              name="phone"
              type="tel"
              defaultValue={prospect?.phone ?? undefined}
              errId={errId("phone")}
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
                aria-invalid={!!fieldErrors.status}
                aria-describedby={fieldErrors.status ? errId("status") : undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError id={errId("status")} message={fieldErrors.status} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prochaine relance
              </label>
              <input
                type="date"
                name="next_followup_at"
                defaultValue={prospect?.next_followup_at ?? ""}
                min={todayStr()}
                aria-invalid={!!fieldErrors.next_followup_at}
                aria-describedby={fieldErrors.next_followup_at ? errId("next_followup_at") : undefined}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
                  fieldErrors.next_followup_at
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                )}
              />
              <FieldError id={errId("next_followup_at")} message={fieldErrors.next_followup_at} />
            </div>
          </div>

          {/* Next action */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Prochaine action
              </label>
              <span className={cn("text-xs", actionLen > 200 ? "text-red-500" : "text-gray-400")}>
                {actionLen} / 200
              </span>
            </div>
            <input
              type="text"
              name="next_action"
              defaultValue={prospect?.next_action ?? ""}
              maxLength={200}
              onChange={(e) => setActionLen(e.target.value.length)}
              aria-invalid={!!fieldErrors.next_action}
              aria-describedby={fieldErrors.next_action ? errId("next_action") : undefined}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
                fieldErrors.next_action
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
              )}
            />
            <FieldError id={errId("next_action")} message={fieldErrors.next_action} />
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <span className={cn("text-xs", notesLen > 1000 ? "text-red-500" : "text-gray-400")}>
                {notesLen} / 1000
              </span>
            </div>
            <textarea
              name="notes"
              rows={3}
              defaultValue={prospect?.notes}
              maxLength={1000}
              onChange={(e) => setNotesLen(e.target.value.length)}
              aria-invalid={!!fieldErrors.notes}
              aria-describedby={fieldErrors.notes ? errId("notes") : undefined}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1",
                fieldErrors.notes
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
              )}
            />
            <FieldError id={errId("notes")} message={fieldErrors.notes} />
          </div>

          {globalError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {globalError}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              {isEdit ? "Prospect mis à jour." : "Prospect créé."}
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
                  : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  error,
  errId,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  errId: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
        )}
      />
      <FieldError id={errId} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
