"use client";

import { Activity, BadgeCheck, Play, Repeat2 } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

function seek(time: number) {
  window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time } }));
  document.getElementById("synchronized-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function BestRepLab({ report }: { report: AnalysisReport }) {
  const insights = report.repetitionInsights;
  if (!insights || insights.repetitions.length === 0) return null;

  return (
    <section id="repetition-lab" className="scroll-mt-24 rounded-[1.75rem] border border-violet-500/20 bg-violet-500/[0.06] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-violet-200"><Repeat2 className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Your repetition lab</p></div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Copy your clearest pattern before copying a professional</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{insights.explanation}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Self-consistency</p>
          <p className="mt-1 text-3xl font-semibold text-white">{insights.consistencyScore ?? "—"}</p>
          <p className="mt-1 text-xs text-violet-200">{insights.consistencyLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.repetitions.map((rep) => {
          const clearest = rep.index === insights.clearestReferenceRepetition;
          return (
            <button
              key={rep.index}
              type="button"
              onClick={() => seek(rep.timestampSeconds)}
              className={`rounded-2xl border p-4 text-left transition ${clearest ? "border-violet-400/45 bg-violet-400/10" : "border-white/10 bg-slate-950/60 hover:border-violet-400/30"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {clearest ? <BadgeCheck className="h-4 w-4 text-violet-200" /> : <Activity className="h-4 w-4 text-slate-500" />}
                  <p className="font-semibold text-white">Rep {rep.index + 1}</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">Review {rep.reviewScore}</span>
              </div>
              <p className="mt-2 text-sm text-violet-200">{rep.label}</p>
              {rep.strengths[0] ? <p className="mt-3 text-xs leading-5 text-emerald-200">Keep: {rep.strengths[0]}</p> : null}
              {rep.watchouts[0] ? <p className="mt-2 text-xs leading-5 text-amber-200">Watch: {rep.watchouts[0]}</p> : null}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Play className="h-3.5 w-3.5" />Jump to {rep.timestampSeconds.toFixed(2)} s</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
