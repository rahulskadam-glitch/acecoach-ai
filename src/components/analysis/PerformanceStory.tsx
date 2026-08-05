"use client";

import { ArrowRight, Eye, Gauge, Lightbulb, Route, Target } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

function seek(timestampSeconds?: number | null) {
  if (timestampSeconds === undefined || timestampSeconds === null) return;
  window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time: timestampSeconds } }));
  document.getElementById("synchronized-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PerformanceStory({ report }: { report: AnalysisReport }) {
  const story = report.performanceStory;
  const moments = report.visualMoments ?? [];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/20 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-violet-300">
            <Route className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Your movement story</p>
          </div>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white">{story.identity}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">{story.rootCauseHypothesis}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          One constraint at a time
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center gap-2 text-sky-300"><Lightbulb className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Why this shows up</p></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{story.rootCauseHypothesis}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center gap-2 text-amber-300"><Gauge className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Under pressure</p></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{story.transferRisk}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center gap-2 text-emerald-300"><Target className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Next milestone</p></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{story.nextMilestone}</p>
        </div>
      </div>

      {moments.length > 0 ? (
        <div className="mt-6">
          <div className="flex items-center gap-2 text-slate-300"><Eye className="h-4 w-4" /><p className="text-sm font-semibold">Show me in the video</p></div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {moments.map((moment) => (
              <button
                key={moment.id}
                type="button"
                onClick={() => seek(moment.timestampSeconds)}
                disabled={moment.timestampSeconds === null || moment.timestampSeconds === undefined}
                className={`group rounded-2xl border p-4 text-left transition ${moment.kind === "strength" ? "border-emerald-500/25 bg-emerald-500/[0.07] hover:bg-emerald-500/12" : moment.kind === "priority" ? "border-amber-500/25 bg-amber-500/[0.07] hover:bg-amber-500/12" : "border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/10"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">{moment.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
                </div>
                <p className="mt-3 font-semibold text-white">{moment.title}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{moment.explanation}</p>
                {moment.timestampSeconds !== null && moment.timestampSeconds !== undefined ? <p className="mt-3 text-xs text-slate-500">Jump to {moment.timestampSeconds.toFixed(2)} s</p> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
        <span className="font-semibold text-white">Coach principle:</span> {story.coachPrinciple}
      </p>
    </section>
  );
}
