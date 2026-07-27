"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Bot, User } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "contact" | "agent";
  content: string;
  metadata?: {
    action?: string;
    reason_code?: string;
    confidence?: number;
  };
  createdAt: Date;
}

interface AgentResponse {
  conversationId: string;
  decision?: {
    action: string;
    message: string;
    reason_code: string;
    handoff_reason: string | null;
    new_status: string | null;
    confidence: number;
    extracted_info?: Record<string, string>;
  };
  aiEnabled?: boolean;
  error?: string;
}

export function SimulatorChat({ agentName }: { agentName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [externalId] = useState(() => `demo_${nanoid(10)}`);
  const [status, setStatus] = useState("new");
  const [extractedInfo, setExtractedInfo] = useState<Record<string, string>>(
    {},
  );
  const [aiEnabled, setAiEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: "contact",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          conversationId,
          externalId,
          displayName: "Prospect (démo)",
        }),
      });

      const data: AgentResponse = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "agent",
            content: `Erreur : ${data.error}`,
            createdAt: new Date(),
          },
        ]);
        return;
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.aiEnabled === false) {
        setAiEnabled(false);
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "agent",
            content:
              "L'IA est désactivée sur cette conversation. Un humain prendra le relais.",
            createdAt: new Date(),
          },
        ]);
        return;
      }

      if (data.decision) {
        const agentMsg: ChatMessage = {
          id: nanoid(),
          role: "agent",
          content: data.decision.message,
          metadata: {
            action: data.decision.action,
            reason_code: data.decision.reason_code,
            confidence: data.decision.confidence,
          },
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);

        if (data.decision.new_status) {
          setStatus(data.decision.new_status);
        }
        if (data.decision.action === "escalate") {
          setAiEnabled(false);
        }
        if (data.decision.extracted_info) {
          setExtractedInfo((prev) => ({
            ...prev,
            ...data.decision!.extracted_info,
          }));
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "agent",
          content: "Erreur de connexion. Réessayez.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setConversationId(null);
    setStatus("new");
    setExtractedInfo({});
    setAiEnabled(true);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat */}
      <div className="flex flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">
                Écrivez un message pour commencer la conversation avec{" "}
                {agentName}.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "contact" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "agent" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === "contact"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "contact" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500">
                En train d&apos;écrire...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Nouvelle conversation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                aiEnabled
                  ? "Écrivez un message..."
                  : "IA désactivée — un humain prendra le relais"
              }
              disabled={!aiEnabled || loading}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading || !aiEnabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar — infos prospect */}
      <div className="hidden w-64 shrink-0 border-l border-gray-200 bg-white p-4 lg:block">
        <h3 className="text-sm font-semibold text-gray-900">
          Infos prospect
        </h3>

        <div className="mt-4 space-y-3">
          <InfoRow label="Statut">
            <StatusBadge status={status} />
          </InfoRow>

          <InfoRow label="IA">
            <span
              className={cn(
                "text-xs font-medium",
                aiEnabled ? "text-green-600" : "text-red-500",
              )}
            >
              {aiEnabled ? "Active" : "Désactivée"}
            </span>
          </InfoRow>

          {Object.keys(extractedInfo).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500">
                Infos collectées
              </p>
              <div className="mt-1 space-y-1">
                {Object.entries(extractedInfo).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium text-gray-700">{key} :</span>{" "}
                    <span className="text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <InfoRow label="Messages">{messages.length}</InfoRow>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-900">{children}</span>
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  qualifying: "bg-blue-100 text-blue-700",
  qualified: "bg-green-100 text-green-700",
  booking_sent: "bg-purple-100 text-purple-700",
  handoff: "bg-orange-100 text-orange-700",
  disqualified: "bg-red-100 text-red-600",
  closed: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  qualifying: "Qualification",
  qualified: "Qualifié",
  booking_sent: "Lien envoyé",
  handoff: "Humain",
  disqualified: "Disqualifié",
  closed: "Fermé",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        statusColors[status] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
