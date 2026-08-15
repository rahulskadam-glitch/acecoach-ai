"use client";

import { ArrowLeft, Download, Flag, LoaderCircle, MessageCircle, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { flagCoachingMessage, sendCoachingMessage } from "@/app/actions/coaching-actions";
import type { CoachingContextSummary, CoachingMessage } from "../domain/contracts";

const SUGGESTIONS = [
  "Explain my main correction more simply",
  "Show me the exact moment",
  "Why does this matter?",
  "How should I practise this?",
  "What mistake should I avoid?",
  "Is this appropriate for my level?",
  "Create my next practice session",
  "When should I record again?",
];

export default function CoachingConversation({ sessionId, context, initialMessages }: { sessionId: string; context: CoachingContextSummary; initialMessages: CoachingMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const opening = useMemo<CoachingMessage>(() => ({ id: "opening", role: "assistant", message: `I’ve reviewed your report. Your first priority is ${context.mainPriority.toLowerCase()}. What would you like help with?`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }], createdAt: new Date().toISOString() }), [context.mainPriority]);
  const visibleMessages = messages.length > 0 ? messages : [opening];

  async function submit(messageText?: string) {
    const message = (messageText ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    setSending(true);
    setError(null);
    const optimistic: CoachingMessage = { id: `temp-${crypto.randomUUID()}`, role: "user", message, references: [], createdAt: "" };
    setMessages((current) => [...(current.length ? current : [opening]), optimistic]);
    try {
      const result = await sendCoachingMessage(sessionId, message);
      setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), result.userMessage as CoachingMessage, result.assistantMessage as CoachingMessage]);
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (cause) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(cause instanceof Error ? cause.message : "Unable to send the coaching question.");
    } finally {
      setSending(false);
    }
  }

  function exportConversation() {
    const content = visibleMessages.map((message) => `${message.role === "assistant" ? "Athlentra" : "You"}: ${message.message}`).join("\n\n");
    const blob = new Blob([`Athlentra coaching conversation\n\n${content}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `acecoach-conversation-${sessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function flag(messageId: string) {
    if (messageId === "opening") return;
    await flagCoachingMessage(sessionId, messageId);
    setMessages((current) => current.map((item) => item.id === messageId ? { ...item, moderationStatus: "flagged" } : item));
  }

  return (
    <div className="grid min-h-[68vh] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">Coaching context</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-slate-950">{context.sportName} · {context.movementName}</h1>
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Active correction</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{context.mainPriority}</p></div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Cue</p><p className="mt-2 text-base font-semibold text-slate-950">“{context.cue}”</p></div>
          {context.drillName ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Current drill</p><p className="mt-2 text-sm font-semibold text-slate-950">{context.drillName}</p><p className="mt-1 text-sm leading-6 text-slate-600">{context.drillDosage}</p></div> : null}
        </div>
        <div className="mt-6 grid gap-2"><Link href={`/report/${sessionId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Back to report</Link><button type="button" onClick={exportConversation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Export conversation</button></div>
      </aside>

      <section className="flex min-h-[68vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071b2d] text-white"><MessageCircle className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-950">Your Athlentra conversation</h2><p className="mt-0.5 text-xs text-slate-500">Grounded in this report. Unsupported conclusions are refused.</p></div></div></header>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7">
          {visibleMessages.map((message) => <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[76%] ${message.role === "user" ? "bg-[#071b2d] text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{message.role === "assistant" ? <><Sparkles className="h-3.5 w-3.5" />Athlentra</> : "You"}</div><p className="mt-2 whitespace-pre-wrap">{message.message}</p>{message.references.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{message.references.map((reference, index) => <span key={`${reference.label}-${index}`} className={`rounded-full px-2.5 py-1 text-[0.68rem] font-medium ${message.role === "user" ? "bg-white/10 text-white/80" : "bg-white text-slate-600"}`}>{reference.label}{reference.type === "timestamp" && typeof reference.value === "number" ? ` · ${reference.value.toFixed(2)} s` : ""}</span>)}</div> : null}{message.role === "assistant" && message.id !== "opening" ? <button type="button" onClick={() => flag(message.id)} disabled={message.moderationStatus === "flagged"} className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-700 disabled:text-rose-700"><Flag className="h-3.5 w-3.5" />{message.moderationStatus === "flagged" ? "Flagged for review" : "Flag incorrect advice"}</button> : null}</div></article>)}
          {sending ? <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Checking the stored report…</div> : null}
          <div ref={endRef} />
        </div>
        <div className="border-t border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => submit(suggestion)} disabled={sending} className="min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50">{suggestion}</button>)}</div>
          {error ? <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="flex items-end gap-3"><label className="sr-only" htmlFor="coaching-question">Ask Athlentra</label><textarea id="coaching-question" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={2} maxLength={1200} placeholder="Ask about the correction, cue, drill, or reassessment…" className="max-h-40 min-h-14 flex-1 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /><button type="submit" disabled={!draft.trim() || sending} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#071b2d] text-white hover:bg-[#0d2b42] disabled:bg-slate-300" aria-label="Send coaching question"><Send className="h-4 w-4" /></button></form>
          <p className="mt-3 text-xs leading-5 text-slate-500">Athlentra can explain this report and approved drills. It cannot diagnose injury or invent measurements that are not in the stored analysis.</p>
        </div>
      </section>
    </div>
  );
}
