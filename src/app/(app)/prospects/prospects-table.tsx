"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prospect } from "@/lib/supabase/types";
import type { ProspectScore, ScoreLevel } from "@/lib/prospects/scoring";
import { ProspectForm } from "./prospect-form";
import { DeleteDialog } from "./delete-dialog";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  nouveau: { label: "Nouveau", className: "bg-gray-100 text-gray-700" },
  contacte: { label: "Contacté", className: "bg-blue-100 text-blue-700" },
  a_relancer: { label: "À relancer", className: "bg-yellow-100 text-yellow-700" },
  gagne: { label: "Gagné", className: "bg-green-100 text-green-700" },
  perdu: { label: "Perdu", className: "bg-red-100 text-red-600" },
};

const STATUS_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "a_relancer", label: "À relancer" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
] as const;

type SortKey = "name" | "company" | "status" | "score" | "next_followup_at" | "created_at";
type SortDir = "asc" | "desc";

const SCORE_COLORS: Record<ScoreLevel, { bg: string; text: string }> = {
  fort: { bg: "bg-green-100", text: "text-green-700" },
  moyen: { bg: "bg-yellow-100", text: "text-yellow-700" },
  faible: { bg: "bg-red-100", text: "text-red-600" },
};

function prospectDisplayName(p: { first_name: string; last_name: string }): string {
  const name = `${p.first_name} ${p.last_name}`.trim();
  return name || "Prospect Instagram";
}

function formatFollowup(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProspectsTable({
  prospects,
  scores,
  followupTimestamps,
  autoOpen,
}: {
  prospects: Prospect[];
  scores?: Record<string, ProspectScore>;
  followupTimestamps?: Record<string, string>;
  autoOpen?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [formOpen, setFormOpen] = useState(autoOpen === true);
  const [editingProspect, setEditingProspect] = useState<Prospect | undefined>();
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  let filtered = prospects;

  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q),
    );
  }

  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`,
        );
        break;
      case "company":
        cmp = a.company.localeCompare(b.company);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "next_followup_at": {
        const aFollowup = followupTimestamps?.[a.id] ?? a.next_followup_at ?? "9999";
        const bFollowup = followupTimestamps?.[b.id] ?? b.next_followup_at ?? "9999";
        cmp = aFollowup.localeCompare(bFollowup);
        break;
      }
      case "score":
        cmp = (scores?.[a.id]?.score ?? 0) - (scores?.[b.id]?.score ?? 0);
        break;
      case "created_at":
        cmp = a.created_at.localeCompare(b.created_at);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function openCreate() {
    setEditingProspect(undefined);
    setFormOpen(true);
  }

  function openEdit(p: Prospect) {
    setEditingProspect(p);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingProspect(undefined);
  }

  function sortIcon(col: SortKey) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:ml-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau prospect</span>
        </button>
      </div>

      {/* Count */}
      <p className="mt-3 text-sm text-gray-500">
        {filtered.length} prospect{filtered.length > 1 ? "s" : ""}
      </p>

      {/* Table / empty state */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center">
          <Users className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {prospects.length === 0
              ? "Aucun prospect. Cliquez sur « Nouveau prospect » pour commencer."
              : "Aucun prospect ne correspond aux filtres."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <Th onClick={() => toggleSort("name")}>
                    Nom {sortIcon("name")}
                  </Th>
                  <th className="px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Qualification</th>
                  <Th onClick={() => toggleSort("score")}>
                    Score {sortIcon("score")}
                  </Th>
                  <Th onClick={() => toggleSort("status")}>
                    Statut {sortIcon("status")}
                  </Th>
                  <Th onClick={() => toggleSort("next_followup_at")}>
                    Relance {sortIcon("next_followup_at")}
                  </Th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const st = STATUS_CONFIG[p.status] ?? {
                    label: p.status,
                    className: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/prospects/${p.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {prospectDisplayName(p)}
                        </Link>
                        {p.company && (
                          <div className="text-xs text-gray-400">{p.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600">{p.email || "—"}</div>
                        {p.phone && (
                          <div className="text-xs text-gray-400">{p.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.next_action && (
                          <div className="text-xs text-blue-600 truncate max-w-[250px]">
                            {p.next_action}
                          </div>
                        )}
                        {p.notes && (
                          <div className="text-xs text-gray-400 truncate max-w-[250px] mt-0.5">
                            {p.notes}
                          </div>
                        )}
                        {!p.next_action && !p.notes && "—"}
                      </td>
                      <td className="px-4 py-3">
                        {scores?.[p.id] ? (() => {
                          const s = scores[p.id];
                          const sc = SCORE_COLORS[s.level];
                          return (
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sc.bg, sc.text)}>
                              {s.score}
                            </span>
                          );
                        })() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {followupTimestamps?.[p.id]
                          ? formatFollowup(followupTimestamps[p.id])
                          : p.next_followup_at
                            ? new Date(p.next_followup_at).toLocaleDateString("fr-FR")
                            : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Link
                            href={`/prospects/${p.id}`}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title="Voir la fiche"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProspect(p)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="mt-4 space-y-3 sm:hidden">
            {filtered.map((p) => {
              const st = STATUS_CONFIG[p.status] ?? {
                label: p.status,
                className: "bg-gray-100 text-gray-600",
              };
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/prospects/${p.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {prospectDisplayName(p)}
                      </Link>
                      {p.company && (
                        <p className="text-sm text-gray-500">{p.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {scores?.[p.id] && (() => {
                        const s = scores[p.id];
                        const sc = SCORE_COLORS[s.level];
                        return (
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sc.bg, sc.text)}>
                            {s.score}
                          </span>
                        );
                      })()}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    {p.email && <p>{p.email}</p>}
                    {p.phone && <p>{p.phone}</p>}
                    {(followupTimestamps?.[p.id] || p.next_followup_at) && (
                      <p>
                        Relance :{" "}
                        {followupTimestamps?.[p.id]
                          ? formatFollowup(followupTimestamps[p.id])
                          : new Date(p.next_followup_at!).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>

                  {p.next_action && (
                    <p className="mt-1.5 text-xs text-blue-600 line-clamp-1">
                      → {p.next_action}
                    </p>
                  )}

                  {p.notes && (
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                      {p.notes}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProspect(p)}
                      className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      {formOpen && (
        <ProspectForm prospect={editingProspect} onClose={closeForm} />
      )}

      {deletingProspect && (
        <DeleteDialog
          prospectId={deletingProspect.id}
          prospectName={prospectDisplayName(deletingProspect)}
          onClose={() => setDeletingProspect(null)}
        />
      )}
    </>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 font-medium text-gray-600 hover:text-gray-900"
      onClick={onClick}
    >
      {children}
    </th>
  );
}
