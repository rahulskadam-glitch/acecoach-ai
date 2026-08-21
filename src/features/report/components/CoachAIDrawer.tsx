"use client";

import {
  Bot,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendCoachingMessage } from "@/app/actions/coaching-actions";
import {
  COACH_QUESTIONS_TAXONOMY,
  type CoachQuestionCategory,
} from "@/lib/ai/coach-engine";
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

const CATEGORIES: Array<{ id: CoachQuestionCategory; label: string }> = [
  { id: "all", label: "🌟 All Topics" },
  { id: "fix", label: "🎯 My Fix" },
  { id: "charts", label: "📈 Charts" },
  { id: "power", label: "⚡ Power" },
  { id: "drills", label: "🏋️ Drills" },
  { id: "safety", label: "🛡️ Safety" },
  { id: "tactics", label: "🎾 Tactics" },
];

export default function CoachAIDrawer({
  isOpen,
  onClose,
  sessionId,
  report,
  movementName,
}: Props) {
  const topPriority = report.priorities?.[0]?.title || "Deepen Racket Drop Lag by +12cm";

  const [selectedCategory, setSelectedCategory] = useState<CoachQuestionCategory>("all");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      message: `Hi! I am your AI Tennis Coach. I have analyzed your 60fps ${movementName.toLowerCase()} video. Your primary mechanical focus is to ${topPriority.toLowerCase()}. Pick a category below or ask me any question about your technique, charts, or practice drills!`,
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

  const filteredQuestions = selectedCategory === "all"
    ? COACH_QUESTIONS_TAXONOMY
    : COACH_QUESTIONS_TAXONOMY.filter((q) => q.category === selectedCategory);

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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-md transition-all duration-300">
      {/* Backdrop overlay dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-in Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-ath-navy shadow-2xl text-white">
        {/* Drawer Header */}
        <header className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ath-lime text-ath-navy shadow-lg shadow-ath-lime/20 ring-1 ring-ath-lime/40">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base tracking-tight">Athlentra AI Coach</h3>
                <span className="flex h-2 w-2 rounded-full bg-ath-green animate-pulse" />
              </div>
              <p className="text-[0.7rem] text-slate-400 font-medium">Grounded in your 60fps video & biomechanics</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/coach/${sessionId}`}
              className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Open full coach room"
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

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="border-b border-white/10 bg-white/5 px-4 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-ath-lime text-ath-navy shadow-md shadow-ath-lime/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed font-medium sm:text-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-ath-navy to-[#182642] border border-white/15 text-white shadow-xl"
                    : "border border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-ath-sky mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-ath-lime" />
                    <span>AI Tennis Coach</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>

                {/* Grounded References & Cue Pills */}
                {m.references && m.references.length > 0 && (
                  <div className="mt-3.5 space-y-1.5 border-t border-white/10 pt-3">
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block">
                      Video Evidence & Prescriptions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.references.map((ref, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] font-bold text-ath-lime"
                        >
                          <span>{ref.label}</span>
                          {ref.value && <span className="text-white font-normal">· {ref.value}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2.5 text-xs text-ath-sky font-semibold bg-ath-sky/10 border border-ath-sky/20 rounded-2xl p-3.5 max-w-[80%] animate-pulse">
              <LoaderCircle className="h-4 w-4 animate-spin text-ath-lime" />
              <span>Analyzing biomechanical evidence & formulating answer...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Quick Question Selector for Current Category */}
        <div className="border-t border-white/10 bg-white/5 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.64rem] font-bold uppercase tracking-wider text-slate-400">
              Suggested Questions ({filteredQuestions.length})
            </span>
            <span className="text-[0.6rem] text-slate-500 font-mono">Tap to ask</span>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filteredQuestions.slice(0, 6).map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={sending}
                onClick={() => handleSend(q.question)}
                className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-ath-lime/40 hover:bg-white/10 hover:text-white transition whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <span>{q.icon}</span>
                <span>{q.shortLabel}</span>
                <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-ath-lime transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom Question Input Form */}
        <footer className="border-t border-white/10 p-4 bg-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your stroke or charts..."
              disabled={sending}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-ath-lime focus:ring-1 focus:ring-ath-lime transition sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ath-lime text-ath-navy shadow-lg shadow-ath-lime/20 font-bold hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
