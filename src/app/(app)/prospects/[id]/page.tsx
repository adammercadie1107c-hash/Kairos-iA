import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  Bot,
  User,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { extractDisplayFields, buildAiSummary } from "@/lib/prospects/extract-display-fields";
import { ProspectQuickActions } from "./prospect-actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fiche prospect — Kairos iA" };

const PROSPECT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-gray-100 text-gray-700" },
  contacte: { label: "Contacté", className: "bg-blue-100 text-blue-700" },
  a_relancer: { label: "À relancer", className: "bg-yellow-100 text-yellow-700" },
  gagne: { label: "Gagné", className: "bg-green-100 text-green-700" },
  perdu: { label: "Perdu", className: "bg-red-100 text-red-600" },
};

const CONV_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!prospect) redirect("/prospects");

  let extractedInfo: Record<string, string> = {};
  let conversation: {
    id: string;
    status: string;
    ai_enabled: boolean;
    last_message_at: string | null;
    followup_count: number;
    created_at: string;
  } | null = null;
  let contactDisplayName: string | null = null;

  if (prospect.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, display_name, extracted_info")
      .eq("id", prospect.contact_id)
      .single();

    if (contact) {
      extractedInfo = contact.extracted_info ?? {};
      contactDisplayName = contact.display_name;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id, status, ai_enabled, last_message_at, followup_count, created_at")
        .eq("contact_id", contact.id)
        .eq("user_id", user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      conversation = conv;
    }
  }

  const displayFields = extractDisplayFields(
    extractedInfo,
    prospect.email,
    prospect.phone,
  );
  const aiSummary = buildAiSummary(extractedInfo);

  const status = PROSPECT_STATUS_CONFIG[prospect.status] ?? {
    label: prospect.status,
    className: "bg-gray-100 text-gray-600",
  };

  const convStatus = conversation
    ? CONV_STATUS_CONFIG[conversation.status] ?? {
        label: conversation.status,
        className: "bg-gray-100 text-gray-600",
      }
    : null;

  let timeline: Array<{
    id: string;
    type: "message" | "event";
    date: string;
    label: string;
    detail?: string;
    icon: "contact" | "agent" | "human" | "system" | "followup";
  }> = [];

  if (conversation) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("id, role, content, created_at, metadata")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(15);

    const { data: events } = await supabase
      .from("scheduled_events")
      .select("id, type, scheduled_at, executed_at, cancelled, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(10);

    for (const msg of recentMessages ?? []) {
      const roleLabels: Record<string, string> = {
        contact: "Message du prospect",
        agent: "Réponse IA",
        human: "Réponse du coach",
        system: "Système",
      };
      const iconMap: Record<string, "contact" | "agent" | "human" | "system"> = {
        contact: "contact",
        agent: "agent",
        human: "human",
        system: "system",
      };
      const meta = msg.metadata as Record<string, unknown> | null;
      const isFollowup = meta?.is_followup === true;
      timeline.push({
        id: msg.id,
        type: "message",
        date: msg.created_at,
        label: isFollowup
          ? `Relance n°${meta?.followup_number ?? "?"}`
          : roleLabels[msg.role] ?? msg.role,
        detail:
          msg.content.length > 80
            ? msg.content.slice(0, 80) + "..."
            : msg.content,
        icon: isFollowup ? "followup" : iconMap[msg.role] ?? "system",
      });
    }

    for (const evt of events ?? []) {
      let label = "Relance planifiée";
      if (evt.executed_at) label = "Relance exécutée";
      else if (evt.cancelled) label = "Relance annulée";

      timeline.push({
        id: evt.id,
        type: "event",
        date: evt.executed_at ?? evt.scheduled_at,
        label,
        icon: "followup",
      });
    }

    timeline.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    timeline = timeline.slice(0, 20);
  }

  const isTerminal = prospect.status === "gagne" || prospect.status === "perdu";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/prospects"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">
              {prospect.first_name} {prospect.last_name}
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                status.className,
              )}
            >
              {status.label}
            </span>
          </div>
          {prospect.company && (
            <p className="text-sm text-gray-500">{prospect.company}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — info + AI summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary */}
          {aiSummary && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h2 className="text-sm font-semibold text-blue-800 mb-2">
                Résumé IA
              </h2>
              <p className="text-sm text-blue-700">{aiSummary}</p>
            </section>
          )}

          {/* Qualification fields */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Informations de qualification
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Objectif principal" value={displayFields.objectif} />
              <InfoField label="Blocage principal" value={displayFields.blocage} />
              <InfoField label="Timing" value={displayFields.timing} />
              <InfoField label="Budget / Investissement" value={displayFields.budget} />
              <InfoField label="Motivation" value={displayFields.motivation} />
              <InfoField label="Expérience passée" value={displayFields.experience} />
            </div>

            {Object.keys(displayFields.extra).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Autres informations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(displayFields.extra).map(([key, val]) => (
                    <InfoField key={key} label={key} value={val} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Contact info */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Contact
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  {displayFields.email ?? "Non renseigné"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  {displayFields.phone ?? "Non renseigné"}
                </span>
              </div>
              {contactDisplayName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{contactDisplayName}</span>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          {prospect.notes && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Notes
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {prospect.notes}
              </p>
            </section>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                Historique récent
              </h2>
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <TimelineIcon icon={item.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {item.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(item.date)}
                        </span>
                      </div>
                      {item.detail && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column — dates + actions + conversation */}
        <div className="space-y-6">
          {/* Quick actions */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Actions rapides
            </h2>
            <div className="space-y-2">
              {conversation && (
                <Link
                  href={`/inbox/${conversation.id}`}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Ouvrir la conversation
                </Link>
              )}
              <ProspectQuickActions
                prospectId={id}
                isTerminal={isTerminal}
                conversationId={conversation?.id ?? null}
                aiEnabled={conversation?.ai_enabled ?? null}
              />
            </div>
          </section>

          {/* Dates */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Dates
            </h2>
            <div className="space-y-3">
              <DateField
                icon={<Clock className="h-4 w-4 text-gray-400" />}
                label="Dernière interaction"
                value={formatDate(conversation?.last_message_at ?? null)}
              />
              <DateField
                icon={<Calendar className="h-4 w-4 text-gray-400" />}
                label="Dernière relance"
                value={formatDate(prospect.last_followup_at)}
              />
              <DateField
                icon={<Calendar className="h-4 w-4 text-blue-400" />}
                label="Prochaine relance"
                value={formatDate(prospect.next_followup_at)}
                highlight={!!prospect.next_followup_at}
              />
              <DateField
                icon={<Clock className="h-4 w-4 text-gray-400" />}
                label="Créé le"
                value={formatDate(prospect.created_at)}
              />
            </div>
          </section>

          {/* Conversation info */}
          {conversation && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Conversation liée
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Statut</span>
                  {convStatus && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        convStatus.className,
                      )}
                    >
                      {convStatus.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">IA</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      conversation.ai_enabled
                        ? "text-green-600"
                        : "text-red-500",
                    )}
                  >
                    {conversation.ai_enabled ? "Active" : "Désactivée"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Relances envoyées</span>
                  <span className="text-xs text-gray-700">
                    {conversation.followup_count}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Next action from CRM */}
          {prospect.next_action && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h2 className="text-sm font-semibold text-blue-800 mb-1">
                Prochaine action
              </h2>
              <p className="text-sm text-blue-700">{prospect.next_action}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">
        {value ?? <span className="text-gray-400 italic">Non renseigné</span>}
      </p>
    </div>
  );
}

function DateField({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p
          className={cn(
            "text-sm",
            highlight ? "font-medium text-blue-700" : "text-gray-700",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function TimelineIcon({
  icon,
}: {
  icon: "contact" | "agent" | "human" | "system" | "followup";
}) {
  switch (icon) {
    case "contact":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200">
          <User className="h-3 w-3 text-gray-600" />
        </div>
      );
    case "agent":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
          <Bot className="h-3 w-3 text-blue-600" />
        </div>
      );
    case "human":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
          <User className="h-3 w-3 text-green-600" />
        </div>
      );
    case "followup":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
          <Calendar className="h-3 w-3 text-yellow-600" />
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
          <Clock className="h-3 w-3 text-gray-500" />
        </div>
      );
  }
}
