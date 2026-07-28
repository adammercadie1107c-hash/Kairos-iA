"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { updateContactInfo } from "../actions";

export function EditInfoForm({
  contactId,
  currentInfo,
}: {
  contactId: string;
  currentInfo: Record<string, string>;
}) {
  const [entries, setEntries] = useState(
    Object.entries(currentInfo).map(([key, value]) => ({ key, value })),
  );
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleAdd() {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k || !v) return;
    if (entries.some((e) => e.key === k)) return;
    setEntries((prev) => [...prev, { key: k, value: v }]);
    setNewKey("");
    setNewValue("");
    setSaved(false);
  }

  function handleRemove(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setSaved(false);
  }

  function handleChange(index: number, value: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, value } : e)),
    );
    setSaved(false);
  }

  function handleSave() {
    const info: Record<string, string> = {};
    for (const e of entries) {
      if (e.key.trim()) info[e.key.trim()] = e.value.trim();
    }
    startTransition(async () => {
      await updateContactInfo(contactId, info);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-gray-400">
          Aucune information. Ajoutez un champ ci-dessous.
        </p>
      )}

      {entries.map((entry, i) => (
        <div key={entry.key} className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 min-w-[100px]">
            {entry.key}
          </span>
          <input
            type="text"
            value={entry.value}
            onChange={(e) => handleChange(i, e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => handleRemove(entry.key)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Champ"
          className="w-[100px] rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Valeur"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKey.trim() || !newValue.trim()}
          className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="h-3 w-3" />
        {isPending ? "Enregistrement..." : saved ? "Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}
