"use client";

import { Repeat2, Timer } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

const PHASE_COLORS = ["#1d4ed8", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777"];

function phaseLabel(phase: string) {
  return phase.replaceAll("_", " ").replace("proxy", "").trim();
}

/**
 * Visualizes repetition rhythm evidence that previously existed only as text:
 * - a stacked phase-timing bar (share of stroke time per phase)
 * - a per-repetition consistency strip with outliers highlighted
 * Both read directly from repetitionInsights / repetitions with no new claims.
 */
export default function RepetitionRhythmPanel({ report, onSeek }: { report: AnalysisReport; onSeek?: (seconds: number) => void }) {
  const insights = report.repetitionInsights;
  const reps = report.repetitions ?? [];
  const phaseTiming = (insights?.phaseTiming ?? []).filter((item) => item.share > 0);
  const scoredReps = insights?.repetitions ?? [];
  const outliers = new Set(insights?.outlierRepetitions ?? []);
  const clearest = insights?.clearestReferenceRepetition ?? null;
  const durations = reps.map((rep) => rep.durationSeconds).filter((value) => value > 0);
  const maxDuration = durations.length ? Math.max(...durations) : 0;

  if (phaseTiming.length === 0 && scoredReps.length === 0 && reps.length <= 1) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Timer className="h-4 w-4 text-blue-800" />Rhythm & repeatability</div>
        {typeof insights?.consistencyScore === "number" ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">Consistency {Math.round(insights.consistencyScore)} · {insights.consistencyLabel}</span> : null}
      </div>

      {phaseTiming.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Where your stroke time goes</p>
          <div className="mt-2 flex h-7 w-full overflow-hidden rounded-lg" role="img" aria-label="Share of stroke time per phase">
            {phaseTiming.map((item, index) => (
              <div key={item.phase} className="flex items-center justify-center overflow-hidden" style={{ width: `${Math.max(item.share * 100, 2)}%`, backgroundColor: PHASE_COLORS[index % PHASE_COLORS.length] }} title={`${phaseLabel(item.phase)} · ${Math.round(item.share * 100)}%`}>
                {item.share >= 0.12 ? <span className="truncate px-1 text-[0.6rem] font-semibold uppercase tracking-wide text-white">{Math.round(item.share * 100)}%</span> : null}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {phaseTiming.map((item, index) => (
              <span key={item.phase} className="inline-flex items-center gap-1.5 text-[0.65rem] font-medium capitalize text-slate-600"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PHASE_COLORS[index % PHASE_COLORS.length] }} />{phaseLabel(item.phase)}</span>
            ))}
          </div>
        </div>
      ) : null}

      {reps.length > 1 || scoredReps.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Repeat2 className="h-3.5 w-3.5" />Repetition by repetition</div>
          <div className="mt-3 grid gap-2">
            {reps.map((rep) => {
              const scored = scoredReps.find((item) => item.index === rep.index);
              const isOutlier = outliers.has(rep.index);
              const isClearest = clearest === rep.index;
              const widthPercent = maxDuration > 0 ? (rep.durationSeconds / maxDuration) * 100 : 100;
              return (
                <button
                  key={rep.index}
                  type="button"
                  onClick={onSeek ? () => onSeek(rep.startSeconds) : undefined}
                  disabled={!onSeek}
                  className={`group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${isOutlier ? "border-amber-300 bg-amber-50" : isClearest ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"} ${onSeek ? "hover:border-blue-300 hover:bg-white" : "cursor-default"}`}
                >
                  <span className="text-xs font-semibold text-slate-700">Rep {rep.index + 1}</span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-white">
                    <span className={`absolute inset-y-0 left-0 rounded-full ${isOutlier ? "bg-amber-400" : isClearest ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${widthPercent}%` }} />
                  </span>
                  <span className="flex items-center gap-2 text-[0.65rem] font-medium text-slate-500">
                    <span className="tabular-nums">{rep.durationSeconds.toFixed(2)}s</span>
                    {typeof scored?.reviewScore === "number" ? <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-700">{Math.round(scored.reviewScore)}</span> : null}
                    {isClearest ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-semibold uppercase text-white">clearest</span> : null}
                    {isOutlier ? <span className="rounded-full bg-amber-500 px-2 py-0.5 font-semibold uppercase text-white">outlier</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {insights?.rhythmProfile ? <p className="mt-3 text-[0.68rem] leading-5 text-slate-500">Median stroke {insights.rhythmProfile.medianDurationSeconds.toFixed(2)}s · duration spread ±{insights.rhythmProfile.durationIqrSeconds.toFixed(2)}s. Bars compare durations within this session only.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
