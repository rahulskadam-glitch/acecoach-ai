"use client";

import { CalendarCheck2, Check, Circle, Dumbbell, LoaderCircle, NotebookPen, RotateCcw, Target, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";

import type { PracticeCheckin, StoredPracticePlan } from "@/modules/analysis/progress";

function PracticeCheckinForm({ itemId, onSave }: { itemId: string; onSave: (itemId: string, formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(() => {
      void onSave(itemId, formData)
        .then(() => { setSaved(true); setOpen(false); })
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to save practice check-in."));
    });
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-3 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-400/15"><NotebookPen className="h-3.5 w-3.5" />{saved ? "Add another check-in" : "Log practice result"}</button>;
  }

  return (
    <form action={submit} className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4" onClick={(event) => event.stopPropagation()}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Practice result</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">Successful reps<input name="targetHits" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white" /></label>
        <label className="text-xs text-slate-400">Attempts<input name="attempts" type="number" min={0} defaultValue={10} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white" /></label>
        <label className="text-xs text-slate-400">Confidence before<select name="confidenceBefore" defaultValue="3" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white">{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v}/5</option>)}</select></label>
        <label className="text-xs text-slate-400">Confidence after<select name="confidenceAfter" defaultValue="3" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white">{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v}/5</option>)}</select></label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[180px_180px_1fr]">
        <label className="text-xs text-slate-400">Difficulty<select name="effort" defaultValue="just_right" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white"><option value="easy">Too easy</option><option value="just_right">Just right</option><option value="hard">Too hard</option></select></label>
        <label className="text-xs text-slate-400">Pain or unusual discomfort?<select name="discomfort" defaultValue="no" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white"><option value="no">No</option><option value="yes">Yes — stop session</option></select></label>
        <label className="text-xs text-slate-400">What did you notice?<input name="note" maxLength={1000} placeholder="Example: contact felt earlier when I used the cue..." className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-white placeholder:text-slate-600" /></label>
      </div>
      {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
      <div className="mt-3 flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{pending ? "Saving..." : "Save check-in"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Cancel</button></div>
    </form>
  );
}

export default function GuidedPracticePlan({ plan, onToggle, onReady, onCheckin, checkins = [] }: { plan: StoredPracticePlan; onToggle: (itemId: string, completed: boolean) => Promise<void>; onReady: () => Promise<void>; onCheckin: (itemId: string, formData: FormData) => Promise<void>; checkins?: PracticeCheckin[] }) {
  const [completion, setCompletion] = useState(plan.completion);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sessions = plan.plan.sessions ?? [];
  const completeCount = sessions.filter((item) => completion[item.id]).length;
  const percent = sessions.length ? Math.round((completeCount / sessions.length) * 100) : 0;
  const hasEvidenceForEveryBlock = sessions.every((item) => (checkinsByItem.get(item.id)?.length ?? 0) > 0);
  const ready = plan.status === "ready_for_reassessment" || (completeCount === sessions.length && hasEvidenceForEveryBlock);
  const nextSession = sessions.find((item) => !completion[item.id]) ?? sessions.at(-1);
  const checkinsByItem = (() => {
    const map = new Map<string, PracticeCheckin[]>();
    for (const checkin of checkins) map.set(checkin.session_item_id, [...(map.get(checkin.session_item_id) ?? []), checkin]);
    return map;
  })();
  const totalAttempts = checkins.reduce((sum, item) => sum + Number(item.attempts ?? 0), 0);
  const totalHits = checkins.reduce((sum, item) => sum + Number(item.target_hits ?? 0), 0);

  function toggle(itemId: string) {
    const previous = completion[itemId] === true;
    if (!previous && (checkinsByItem.get(itemId)?.length ?? 0) === 0) {
      setError("Log a practice result before marking this block complete.");
      return;
    }
    const next = !previous;
    setError(null);
    setCompletion((current) => ({ ...current, [itemId]: next }));
    setPendingItem(itemId);
    startTransition(() => void onToggle(itemId, next).catch((cause) => { setCompletion((current) => ({ ...current, [itemId]: previous })); setError(cause instanceof Error ? cause.message : "Unable to save practice progress."); }).finally(() => setPendingItem(null)));
  }

  function markReady() {
    setError(null);
    startTransition(() => void onReady().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to update reassessment status.")));
  }

  return (
    <section id="practice-plan" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(15,23,42,0.82)_42%,rgba(2,6,23,0.9))] shadow-xl shadow-black/20">
      <div className="grid gap-0 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r lg:p-7">
          <div className="flex items-center gap-3 text-emerald-300"><Target className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">4 · Practice and reassessment</p></div>
          <h2 className="mt-4 text-3xl font-semibold text-white">{plan.primaryGoal}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{plan.whyItMatters}</p>
          {plan.coachingCue ? <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">One cue only</p><p className="mt-2 text-lg font-semibold text-white">“{plan.coachingCue}”</p></div> : null}
          <div className="mt-6"><div className="flex items-center justify-between text-sm"><span className="text-slate-400">Plan progress</span><span className="font-semibold text-white">{completeCount}/{sessions.length} sessions</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} /></div></div>
          {nextSession ? <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Next</p><p className="mt-2 font-semibold text-white">{nextSession.day} · {nextSession.title}</p><p className="mt-1 text-sm text-slate-400">{nextSession.duration}</p></div> : null}
          {checkins.length > 0 ? <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4"><div className="flex items-center gap-2 text-sky-200"><TrendingUp className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Practice evidence</p></div><p className="mt-2 text-sm text-white">{totalHits}/{totalAttempts || 0} target reps across {checkins.length} check-in{checkins.length === 1 ? "" : "s"}</p></div> : null}
        </div>

        <div className="p-6 lg:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">7-day plan</p><p className="mt-2 text-sm text-slate-400">Log each block, then use a matched recording to test whether the change is becoming more repeatable.</p></div><CalendarCheck2 className="h-7 w-7 text-sky-300" /></div>
          <div className="mt-5 space-y-3">
            {sessions.map((item, index) => {
              const completed = completion[item.id] === true;
              const pending = isPending && pendingItem === item.id;
              const itemCheckins = checkinsByItem.get(item.id) ?? [];
              return <div key={item.id} className={`rounded-2xl border p-4 ${completed ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-slate-950/55"}`}><div className="flex items-start gap-4"><button type="button" onClick={() => toggle(item.id)} disabled={pending} aria-label={completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`} className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${completed ? "bg-emerald-400 text-slate-950" : "border border-white/15 bg-white/5 text-slate-400"}`}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : completed ? <Check className="h-4 w-4" /> : <span className="text-sm font-semibold">{index + 1}</span>}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-white">{item.day} · {item.title}</p><span className="text-xs text-sky-200">{item.duration}</span></div><p className="mt-2 text-sm leading-6 text-slate-300">{item.objective}</p><div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2"><p><span className="font-semibold text-slate-200">Drill:</span> {item.drillName}</p><p><span className="font-semibold text-slate-200">Dose:</span> {item.dosage}</p></div><p className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-slate-300"><span className="font-semibold text-emerald-200">Pass when:</span> {item.successMetric}</p>{itemCheckins[0] ? <p className="mt-3 text-xs text-sky-200">Latest: {itemCheckins[0].target_hits ?? 0}/{itemCheckins[0].attempts ?? 0} target reps · confidence {itemCheckins[0].confidence_after ?? "—"}/5</p> : null}<PracticeCheckinForm itemId={item.id} onSave={onCheckin} /></div>{completed ? <Check className="mt-1 h-5 w-5 text-emerald-300" /> : <Circle className="mt-1 h-5 w-5 text-slate-600" />}</div></div>;
            })}
          </div>
          {error ? <div role="alert" className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-center gap-3">{ready ? <RotateCcw className="h-5 w-5 text-emerald-300" /> : <Dumbbell className="h-5 w-5 text-sky-300" />}<div><p className="font-medium text-white">{ready ? "Ready to reassess" : "Build the change before chasing another correction"}</p><p className="mt-1 text-xs text-slate-500">Use the same camera, drill, intensity, and intended shot.</p></div></div>{!ready ? <button type="button" onClick={markReady} disabled={isPending || checkins.length === 0} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">I completed equivalent practice</button> : <a href={`/start?reassess=${plan.id}`} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Record matched reassessment</a>}</div>
        </div>
      </div>
    </section>
  );
}
