"use client";

import { useState, useTransition } from "react";
import { Send, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleAi, sendHumanMessage, updateConversationStatus } from "../actions";

const statusOptions = [
  { value: "qualifying", label: "Qualification" },
  { value: "qualified", label: "Qualifié" },
  { value: "booking_sent", label: "Lien envoyé" },
  { value: "handoff", label: "Humain" },
  { value: "disqualified", label: "Disqualifié" },
  { value: "closed", label: "Fermé" },
];

export function ConversationControls({
  conversationId,
  aiEnabled: initialAiEnabled,
  currentStatus,
}: {
  conversationId: string;
  aiEnabled: boolean;
  currentStatus: string;
}) {
  const [input, setInput] = useState("");
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggleAi() {
    const next = !aiEnabled;
    setAiEnabled(next);
    startTransition(async () => {
      await toggleAi(conversationId, next);
    });
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    startTransition(async () => {
      await sendHumanMessage(conversationId, text);
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateConversationStatus(conversationId, status);
    });
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Status + AI toggle bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-gray-100 px-3 sm:px-4 py-2 overflow-x-auto">
        <button
          type="button"
          onClick={handleToggleAi}
          disabled={isPending}
          className={cn(
            "flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium transition-colors",
            aiEnabled
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-orange-100 text-orange-700 hover:bg-orange-200",
          )}
        >
          <Power className="h-3 w-3" />
          <span className="hidden sm:inline">{aiEnabled ? "IA active" : "IA désactivée"}</span>
          <span className="sm:hidden">{aiEnabled ? "IA" : "Off"}</span>
        </button>

        <div className="mx-1 sm:mx-2 h-4 w-px shrink-0 bg-gray-200" />

        <div className="flex gap-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              disabled={isPending || currentStatus === opt.value}
              className={cn(
                "whitespace-nowrap rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium transition-colors",
                currentStatus === opt.value
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reply form */}
      <div className="p-3">
        <div className="flex gap-2">
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
            placeholder="Répondre en tant qu'humain..."
            disabled={isPending}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Envoyer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
