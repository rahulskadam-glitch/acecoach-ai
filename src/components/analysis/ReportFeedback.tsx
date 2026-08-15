"use client";

import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { useState, useTransition } from "react";

export type ExistingFeedback = {
  movementAccuracy: string;
  coachingClarity: number | null;
  drillRelevance: number | null;
  reportUsefulness: number | null;
  visualClarity: number | null;
  referenceHelpfulness: number | null;
  priorityFit: number | null;
  issueCategory: string | null;
  comment: string | null;
} | null;

function Rating({ name, defaultValue }: { name: string; defaultValue?: number | null }) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((value) => (
        <label key={value} className="cursor-pointer">
          <input type="radio" name={name} value={value} defaultChecked={defaultValue === value} className="peer sr-only" />
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-slate-400 transition peer-checked:border-emerald-400/50 peer-checked:bg-emerald-400/15 peer-checked:text-emerald-100 hover:bg-white/10">{value}</span>
        </label>
      ))}
    </div>
  );
}

export default function ReportFeedback({ existing, onSubmit }: { existing: ExistingFeedback; onSubmit: (formData: FormData) => Promise<void> }) {
  const [saved, setSaved] = useState(Boolean(existing));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(() => {
      void onSubmit(formData)
        .then(() => setSaved(true))
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to save feedback."));
    });
  }

  return (
    <section id="report-feedback" className="scroll-mt-24 rounded-[1.75rem] border border-sky-500/20 bg-sky-500/[0.05] p-6 print:hidden">
      <div className="flex items-start gap-3"><MessageSquareText className="mt-1 h-5 w-5 text-sky-300" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Help improve your coaching</p><h2 className="mt-2 text-2xl font-semibold text-white">Was this report accurate and useful?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Tell us if the movement, coaching, visuals, or drills did not fit your video.</p></div></div>
      <form action={submit} className="mt-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-white">Did Athlentra identify the movement correctly?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[["accurate", "Yes"], ["incorrect", "No"], ["unsure", "Not sure"]].map(([value, label]) => (
              <label key={value} className="cursor-pointer"><input type="radio" name="movementAccuracy" value={value} defaultChecked={(existing?.movementAccuracy ?? "unsure") === value} className="peer sr-only" /><span className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 peer-checked:border-sky-400/50 peer-checked:bg-sky-400/15 peer-checked:text-sky-100">{label}</span></label>
            ))}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div><p className="mb-2 text-sm text-slate-300">Coaching clarity</p><Rating name="coachingClarity" defaultValue={existing?.coachingClarity} /></div>
          <div><p className="mb-2 text-sm text-slate-300">Visual clarity</p><Rating name="visualClarity" defaultValue={existing?.visualClarity} /></div>
          <div><p className="mb-2 text-sm text-slate-300">Reference comparison</p><Rating name="referenceHelpfulness" defaultValue={existing?.referenceHelpfulness} /></div>
          <div><p className="mb-2 text-sm text-slate-300">First-priority fit</p><Rating name="priorityFit" defaultValue={existing?.priorityFit} /></div>
          <div><p className="mb-2 text-sm text-slate-300">Drill relevance</p><Rating name="drillRelevance" defaultValue={existing?.drillRelevance} /></div>
          <div><p className="mb-2 text-sm text-slate-300">Overall usefulness</p><Rating name="reportUsefulness" defaultValue={existing?.reportUsefulness} /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="text-sm text-slate-300">Main issue<select name="issueCategory" defaultValue={existing?.issueCategory ?? ""} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-white"><option value="">No issue</option><option value="movement_detection">Wrong movement</option><option value="video_timing">Wrong frame or phase</option><option value="insight_quality">Insight not convincing</option><option value="too_technical">Too technical</option><option value="visual_confusion">Visuals did not explain it</option><option value="reference_mismatch">Reference did not fit</option><option value="priority_mismatch">Wrong first priority</option><option value="not_actionable">Not actionable</option><option value="drill_fit">Drill does not fit</option><option value="technical_problem">App or playback problem</option></select></label>
          <label className="text-sm text-slate-300">Tell us what happened<textarea name="comment" defaultValue={existing?.comment ?? ""} maxLength={2000} rows={4} placeholder="Example: this is a two-handed backhand, but the report describes a forehand finish..." className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-white placeholder:text-slate-600" /></label>
        </div>
        {error ? <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
        <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50">{saved ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}{pending ? "Saving..." : saved ? "Update feedback" : "Send feedback"}</button>
      </form>
    </section>
  );
}
