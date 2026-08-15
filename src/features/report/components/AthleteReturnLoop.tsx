"use client";

import { Award, CalendarCheck2, Check, ChevronDown, Flag, History, PlayCircle, Sparkles, Target, Trophy } from "lucide-react";

type HistoryPoint = { sessionId: string; recordedAt: string; score: number | null };
type PreviousRecording = { videoUrl: string; recordedAt: string; score: number | null; contactSeconds: number };
type Checkin = { id: string; created_at: string };

export default function AthleteReturnLoop({
  movement, currentVideoUrl, currentContactSeconds, currentScore, scoreJump, history, previousRecording, activeFocus, nextGoal, practiceItemId, onPracticeCheckin, checkins,
}: {
  movement: string; currentVideoUrl: string; currentContactSeconds: number; currentScore: number | null; scoreJump: number; history: HistoryPoint[]; previousRecording: PreviousRecording | null; activeFocus: string; nextGoal: string; practiceItemId: string | null; onPracticeCheckin: (itemId: string, formData: FormData) => Promise<void>; checkins: Checkin[];
}) {
  const scored = history.flatMap((item) => typeof item.score === "number" ? [item.score] : []);
  const personalBest = scored.length ? Math.max(...scored) : currentScore;
  const currentIsBest = currentScore !== null && personalBest !== null && currentScore >= personalBest;
  const practisedToday = checkins.some((item) => new Date(item.created_at).toDateString() === new Date().toDateString());
  const milestones = [
    { label: "First recording", earned: history.length >= 1 },
    { label: "First improvement", earned: scoreJump > 0 },
    { label: "Three stroke reviews", earned: history.length >= 3 },
    { label: "New personal best", earned: currentIsBest && history.length > 1 },
  ];
  const videoFragment = (url: string, seconds: number) => `${url}#t=${Math.max(0, seconds).toFixed(2)}`;

  return (
    <section aria-labelledby="progress-loop-title" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-800">Progress</p><h2 id="progress-loop-title" className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Make the next recording better</h2></div>
        <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">{scoreJump > 0 ? "+" : ""}{scoreJump} since last {movement.toLowerCase()}</div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"><PlayCircle className="h-4 w-4 text-blue-800" />Progress Moment</div>
        <div className="grid md:grid-cols-2">
          <article className="border-b border-slate-200 p-3 md:border-b-0 md:border-r"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Then</span><span className="text-slate-500">{previousRecording ? new Date(previousRecording.recordedAt).toLocaleDateString() : "First recording"}</span></div>{previousRecording ? <video src={videoFragment(previousRecording.videoUrl, previousRecording.contactSeconds)} muted playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black object-contain" /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 px-6 text-center text-sm text-slate-500">Your next matching recording will appear here.</div>}<p className="mt-2 text-sm font-semibold text-slate-900">Score {previousRecording?.score ?? 0}</p></article>
          <article className="p-3"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-blue-800">Now</span><span className="text-slate-500">Current</span></div><video src={videoFragment(currentVideoUrl, currentContactSeconds)} muted playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black object-contain" /><p className="mt-2 text-sm font-semibold text-slate-900">Score {currentScore ?? "—"}</p></article>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-800"><Target className="h-4 w-4" />Active Focus</p><p className="mt-2 text-base font-semibold leading-6 text-slate-950">{activeFocus}</p><p className="mt-2 text-xs leading-5 text-slate-600">Keep this cue until the next matching recording shows a reliable change.</p></article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800"><CalendarCheck2 className="h-4 w-4" />Practice Check-in</p><p className="mt-2 text-sm leading-6 text-slate-700">{practisedToday ? "Practice logged today." : "One tap. No training diary."}</p>{practiceItemId && !practisedToday ? <form action={onPracticeCheckin.bind(null, practiceItemId)} className="mt-3"><input type="hidden" name="attempts" value="1" /><input type="hidden" name="targetHits" value="1" /><input type="hidden" name="effort" value="just_right" /><input type="hidden" name="confidenceBefore" value="3" /><input type="hidden" name="confidenceAfter" value="3" /><input type="hidden" name="discomfort" value="no" /><button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-800 px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" />Practised today</button></form> : null}</article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-800"><Flag className="h-4 w-4" />Next Recording Goal</p><p className="mt-2 text-base font-semibold leading-6 text-slate-950">{nextGoal}</p></article>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Trophy className="h-4 w-4" />Personal Best</p><div className="mt-2 flex items-end gap-2"><span className="text-3xl font-bold text-slate-950">{personalBest ?? "—"}</span><span className="pb-1 text-sm text-slate-600">best {movement.toLowerCase()} score</span></div></article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700"><Sparkles className="h-4 w-4" />This Week</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{practisedToday ? "You practised the active focus today." : "Your next win is simple: practise the active focus once."}</p><p className="mt-1 text-xs leading-5 text-slate-600">{scoreJump > 0 ? `Your matched stroke improved by ${scoreJump} points.` : "Record again after practice to reveal the next change."}</p></article>
      </div>

      <details className="group mt-4 rounded-2xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between p-4"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4 text-blue-800" />Stroke Journey</span><ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" /></summary><div className="border-t border-slate-200 p-4"><div className="flex gap-3 overflow-x-auto pb-2">{history.map((item, index) => <div key={item.sessionId} className="min-w-32 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{new Date(item.recordedAt).toLocaleDateString()}</p><p className="mt-1 text-xl font-bold text-slate-950">{item.score ?? "—"}</p><p className="text-[0.65rem] text-slate-500">Recording {index + 1}</p></div>)}</div></div></details>

      <div className="mt-4 flex flex-wrap gap-2">{milestones.map((item) => <span key={item.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${item.earned ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-400"}`}><Award className="h-3.5 w-3.5" />{item.label}</span>)}</div>
    </section>
  );
}
