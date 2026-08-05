"use client";

import { ArrowRight, Clock3, PlayCircle, Target } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";
import { buildPlayerReportView } from "../model/view-model";

export default function ThreeImprovementsSection({ report }: { report: AnalysisReport }) {
  const view = buildPlayerReportView(report);
  function showMoment(time: number | null) {
    if (time === null) return;
    window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time } }));
  }
  return (
    <section id="improvements" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-slate-900/72 p-6 lg:p-8">
      <div className="flex items-center gap-2 text-amber-300"><Target className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">3 · Your supporting improvements</p></div>
      <h2 className="mt-3 text-3xl font-semibold text-white">Add these only after the main correction starts to feel stable</h2>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">{view.improvements.length === 0 ? <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">AceCoach found one reliable priority in this recording. It is shown once in the Coach Summary rather than repeated here.</div> : null}
        {view.improvements.map((item) => (
          <article key={item.rank} className={`rounded-2xl border p-5 ${item.rank === 1 ? "border-amber-400/35 bg-amber-400/[0.08]" : "border-white/10 bg-slate-950/60"}`}>
            <div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${item.rank === 1 ? "bg-amber-300 text-slate-950" : "bg-white/10 text-white"}`}>{item.rank}</span>{item.timestampSeconds !== null ? <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{item.timestampSeconds.toFixed(2)} s</span> : null}</div>
            <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p className="text-slate-300"><span className="font-semibold text-white">What we saw:</span> {item.whatWeSaw}</p>
              <p className="text-slate-400"><span className="font-semibold text-white">Why:</span> {item.whyItMatters}</p>
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 text-emerald-100"><span className="font-semibold">Cue:</span> “{item.cue}”</p>
              <p className="text-slate-300"><span className="font-semibold text-white">Next:</span> {item.nextStep}</p>
            </div>
            {item.timestampSeconds !== null ? <button type="button" onClick={() => showMoment(item.timestampSeconds)} className="mt-5 flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/20"><PlayCircle className="h-4 w-4" />Show this moment<ArrowRight className="ml-auto h-4 w-4" /></button> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
