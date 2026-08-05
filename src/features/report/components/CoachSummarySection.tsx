import { BadgeCheck, Eye, Gauge, Sparkles, Target, Trophy } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";
import { buildPlayerReportView } from "../model/view-model";

export default function CoachSummarySection({ report, sportName, movement, fileName }: { report: AnalysisReport; sportName: string; movement: string; fileName: string }) {
  const view = buildPlayerReportView(report);
  return (
    <section id="coach-summary" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 shadow-2xl shadow-black/25">
      <div className="grid gap-0 xl:grid-cols-[1.35fr_.65fr]">
        <div className="p-7 lg:p-9">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300"><Sparkles className="h-4 w-4" />1 · Coach summary</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white lg:text-5xl">{sportName} · {movement}</h1>
          <p className="mt-2 text-sm text-slate-500">{fileName}</p>
          <h2 className="mt-7 text-2xl font-semibold text-white">{view.headline}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5">
              <div className="flex items-center gap-2 text-emerald-300"><Trophy className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">What you do well</p></div>
              <p className="mt-3 text-base leading-7 text-slate-100">{view.strongestQuality}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
              <div className="flex items-center gap-2 text-amber-300"><Target className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Fix this first</p></div>
              <p className="mt-3 text-base leading-7 text-slate-100">{view.mainPriority}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-300"><span className="font-semibold text-white">Why it matters:</span> {view.whyItMatters}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]"><div className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.08] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">One cue to remember</p><p className="mt-2 text-xl font-semibold text-white">“{view.coachingCue}”</p></div><a href="#watch-compare" className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white hover:bg-white/10"><Eye className="h-4 w-4 text-violet-300" />Show me</a></div>
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">How you will know it improved</p><p className="mt-2 text-base leading-7 text-slate-100">{view.successTarget}</p></div>
        </div>
        <aside className="border-t border-white/10 bg-slate-950/55 p-7 xl:border-l xl:border-t-0 lg:p-9">
          <p className="text-sm text-slate-400">{view.scoreLabel}</p>
          <p className="mt-2 text-7xl font-bold tracking-tight text-white">{view.score ?? "—"}{view.score !== null ? <span className="text-2xl text-slate-500">/100</span> : null}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">A video-based movement score, not an age percentile, medical rating, or professional-equivalence score.</p>
          <div className="mt-7 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><span className="flex items-center gap-2 text-sm text-slate-400"><Gauge className="h-4 w-4" />Analysis confidence</span><span className="font-semibold text-white">{view.confidence}%</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><span className="flex items-center gap-2 text-sm text-slate-400"><BadgeCheck className="h-4 w-4" />Capture quality</span><span className="font-semibold capitalize text-white">{view.captureQuality}</span></div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"><span className="text-sm text-slate-400">Swings found</span><span className="font-semibold text-white">{report.repetitions?.length ?? 0}</span></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
