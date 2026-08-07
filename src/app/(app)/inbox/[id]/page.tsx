import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft, Bot, User, UserCircle } from "lucide-react";
import Link from "next/link";
import { ConversationControls } from "./controls";
import { ReactivateAiButton } from "./reactivate-ai-button";
import { DeleteConversationButton } from "./delete-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversation — Kairos iA" };

const REASON_LABELS: Record<string, string> = {
  greeting: "Accueil",
  faq_answer: "FAQ",
  qualification_progress: "Qualification",
  all_fields_collected: "Qualifié",
  objection_handled: "Objection",
  booking_ready: "Réservation",
  low_confidence: "Confiance faible",
  human_requested: "Humain demandé",
  off_topic: "Hors sujet",
  sensitive_topic: "Sensible",
  followup_needed: "Relance",
  not_a_fit: "Non qualifié",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-gray-100 text-gray-600" },
  qualifying: { label: "Qualification", className: "bg-blue-100 text-blue-700" },
  qualified: { label: "Qualifié", className: "bg-green-100 text-green-700" },
  booking_sent: { label: "Lien envoyé", className: "bg-purple-100 text-purple-700" },
  handoff: { label: "Humain", className: "bg-orange-100 text-orange-700" },
  disqualified: { label: "Disqualifié", className: "bg-red-100 text-red-600" },
  closed: { label: "Fermé", className: "bg-gray-100 text-gray-600" },
};

export default async function ConversationPage({
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

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contacts(id, display_name, extracted_info, external_id), channels(type)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conversation) redirect("/inbox");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const contact = conversation.contacts as unknown as {
    id: string;
    display_name: string | null;
    extracted_info: Record<string, string>;
    external_id: string;
  } | null;

  const channel = conversation.channels as unknown as {
    type: string;
  } | null;

  const { data: linkedProspect } = contact
    ? await supabase
        .from("prospects")
        .select("id, first_name, last_name")
        .eq("contact_id", contact.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  // Get handoff reason from the most recent message that has one in metadata
  let handoffReason: string | null = null;
  if (conversation.status === "handoff" || !conversation.ai_enabled) {
    const { data: recentMsgs } = await supabase
      .from("messages")
      .select("metadata")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (recentMsgs) {
      for (const msg of recentMsgs) {
        const meta = msg.metadata as Record<string, unknown> | null;
        if (meta?.handoff_reason && typeof meta.handoff_reason === "string") {
          handoffReason = meta.handoff_reason;
          break;
        }
      }
    }
  }

  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("required_qualification_fields")
    .eq("user_id", user.id)
    .single();

  const requiredFields: string[] = agentConfig?.required_qualification_fields ?? [];
  const extractedInfo: Record<string, string> = contact?.extracted_info ?? {};

  const filledFields: string[] = [];
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    const key = field.toLowerCase().trim();
    const match = Object.entries(extractedInfo).find(
      ([k]) => k.toLowerCase().trim() === key,
    );
    if (match && match[1]?.trim()) {
      filledFields.push(field);
    } else {
      missingFields.push(field);
    }
  }
  const qualificationProgress = requiredFields.length > 0
    ? Math.round((filledFields.length / requiredFields.length) * 100)
    : null;

  const status = statusLabels[conversation.status] ?? {
    label: conversation.status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <Link
            href="/inbox"
            aria-label="Retour à l'inbox"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {(contact?.display_name ?? "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {contact?.display_name ?? "Contact"}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  status.className,
                )}
              >
                {status.label}
              </span>
              {!conversation.ai_enabled && (
                <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                  IA off
                </span>
              )}
            </div>
            {channel && (
              <p className="text-xs text-gray-400">{channel.type}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {linkedProspect && (
              <Link
                href={`/prospects?highlight=${linkedProspect.id}`}
                className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Prospect CRM
              </Link>
            )}
            <DeleteConversationButton conversationId={id} />
          </div>
        </div>

        {/* Handoff banner */}
        {!conversation.ai_enabled && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-orange-800">
                Reprise humaine recommandée
                {handoffReason && (
                  <span className="font-normal text-orange-600">
                    {" "}— {handoffReason}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-orange-500">
                L&apos;IA est désactivée. Les messages entrants ne déclencheront pas de réponse automatique.
              </p>
            </div>
            <ReactivateAiButton conversationId={id} />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(messages ?? []).map((msg) => {
            const isContact = msg.role === "contact";
            const isAgent = msg.role === "agent";
            const isHuman = msg.role === "human";

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  isContact ? "justify-end" : "justify-start",
                )}
              >
                {!isContact && (
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isAgent ? "bg-blue-100" : "bg-green-100",
                    )}
                  >
                    {isAgent ? (
                      <Bot className="h-4 w-4 text-blue-600" />
                    ) : (
                      <UserCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                )}
                <div className="max-w-[85%] sm:max-w-[75%]">
                  {isHuman && (
                    <p className="mb-0.5 text-xs text-green-600 font-medium">
                      Vous (humain)
                    </p>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      isContact
                        ? "bg-blue-600 text-white"
                        : isAgent
                          ? "bg-gray-100 text-gray-900"
                          : "bg-green-50 text-gray-900 ring-1 ring-green-200",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {isAgent && msg.metadata && (() => {
                    const meta = msg.metadata as Record<string, unknown>;
                    const reasonCode = meta.reason_code as string | undefined;
                    const confidence = typeof meta.confidence === "number" ? meta.confidence : undefined;
                    return (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {reasonCode && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {REASON_LABELS[reasonCode] ?? reasonCode}
                        </span>
                      )}
                      {confidence !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            confidence >= 0.7
                              ? "bg-green-50 text-green-700"
                              : confidence >= 0.4
                                ? "bg-orange-50 text-orange-600"
                                : "bg-red-50 text-red-600",
                          )}
                        >
                          {Math.round(confidence * 100)}%
                        </span>
                      )}
                    </div>
                    );
                  })()}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
                {isContact && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controls: reply form + AI toggle + status */}
        <ConversationControls
          conversationId={id}
          aiEnabled={conversation.ai_enabled}
          currentStatus={conversation.status}
        />
      </div>

      {/* Right sidebar — contact info */}
      <div className="hidden w-72 shrink-0 border-l border-gray-200 bg-white p-5 lg:block overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900">
          Infos prospect
        </h3>

        <div className="mt-4 space-y-4">
          <InfoSection label="Nom">
            {contact?.display_name ?? "Inconnu"}
          </InfoSection>

          <InfoSection label="ID externe">
            <span className="font-mono text-xs">{contact?.external_id ?? "—"}</span>
          </InfoSection>

          <InfoSection label="Canal">
            {channel?.type ?? "—"}
          </InfoSection>

          <InfoSection label="Statut">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
              {status.label}
            </span>
          </InfoSection>

          <InfoSection label="IA">
            <span className={cn("text-xs font-medium", conversation.ai_enabled ? "text-green-600" : "text-red-500")}>
              {conversation.ai_enabled ? "Active" : "Désactivée"}
            </span>
          </InfoSection>

          <InfoSection label="Messages">
            {(messages ?? []).length}
          </InfoSection>

          <InfoSection label="Créée le">
            {new Date(conversation.created_at).toLocaleDateString("fr-FR")}
          </InfoSection>

          {qualificationProgress !== null && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Qualification ({filledFields.length}/{requiredFields.length})
              </p>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    qualificationProgress === 100 ? "bg-green-500" : "bg-blue-500",
                  )}
                  style={{ width: `${qualificationProgress}%` }}
                />
              </div>
              {missingFields.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] text-gray-400 mb-1">Manquants :</p>
                  <div className="flex flex-wrap gap-1">
                    {missingFields.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {contact?.extracted_info && Object.keys(contact.extracted_info).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Infos collectées
              </p>
              <div className="space-y-1.5">
                {Object.entries(contact.extracted_info).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium text-gray-700">{key} :</span>{" "}
                    <span className="text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{children}</p>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
