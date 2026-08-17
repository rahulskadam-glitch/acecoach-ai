"use client";

import { Bot, ExternalLink, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendCoachingMessage } from "@/app/actions/coaching-actions";
import type { AnalysisReport } from "@/modules/analysis/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  report: AnalysisReport;
  movementName: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  message: string;
  references?: Array<{ label: string; value?: string | number | null; type?: string }>;
  createdAt?: string;
};

const QUICK_PROMPTS = [
  "Explain my main correction simply",
  "How should I practice this tomorrow?",
  "What is the most common mistake to avoid?",
  "How will this increase my ball speed?",
];

export default function CoachAIDrawer({
  isOpen,
  onClose,
  sessionId,
  report,
  movementName,
}: Props) {
  const topPriority = report.priorities?.[0]?.title || "Deepen Racket Drop Lag by +12cm";

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      message: `Hi! I am your AI Tennis Coach. I have analyzed your ${movementName.toLowerCase()}. Your primary focus is to ${topPriority.toLowerCase()}. What questions can I answer about your stroke, feel cues, or drills?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    const optimistic: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      message: query,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await sendCoachingMessage(sessionId, query);
      setMessages((prev) => [
        ...prev,
        {
          id: response.assistantMessage.id,
          role: "assistant",
          message: response.assistantMessage.message,
          references: response.assistantMessage.references,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the AI Coach. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop overlay dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-in Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-gradient-to-b from-slate-950 via-[#0a1224] to-slate-950 shadow-2xl text-white">
        {/* Drawer Header */}
        <header className="flex items-center justify-between border-b border-white/10 p-5 bg-slate-900/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ath-lime text-ath-navy shadow-lg shadow-black/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Athlentra AI Coach</h3>
                <span className="flex h-2 w-2 rounded-full bg-ath-green animate-pulse" />
              </div>
              <p className="text-xs text-slate-400">Grounded in your 60fps biomechanical report</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/coach/${sessionId}`}
              className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Open full page"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed font-medium sm:text-sm ${
                  m.role === "user"
                    ? "bg-ath-navy text-white shadow-lg shadow-black/20"
                    : "border border-white/10 bg-slate-900/90 text-slate-200 backdrop-blur"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-ath-sky mb-1.5">
                    <Sparkles className="h-3 w-3" />
                    AI Coach
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.message}</p>

                {m.references && m.references.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                    {m.references.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-ath-sky"
                      >
                        {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-ath-sky" />
              AI Coach is analyzing your mechanics…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Quick Suggestion Chips & Input */}
        <div className="border-t border-white/10 bg-slate-950/80 p-4 backdrop-blur">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                disabled={sending}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 hover:border-ath-lime hover:bg-white/10 hover:text-white transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your stroke or drills…"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-ath-lime focus:ring-1 focus:ring-ath-lime sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ath-lime text-ath-navy shadow-lg shadow-black/20 hover:brightness-110 disabled:opacity-40 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
