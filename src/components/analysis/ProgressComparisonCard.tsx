import { ArrowDownRight, ArrowRight, ArrowUpRight, History, ShieldAlert, TrendingUp } from "lucide-react";

import type { ProgressComparison } from "@/modules/analysis/progress";

function deltaCopy(delta: number) {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export default function ProgressComparisonCard({ comparison }: { comparison: ProgressComparison }) {
  const date = new Date(comparison.previousDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <section className={`rounded-[1.75rem] border p-6 ${comparison.comparable ? "border-sky-500/25 bg-sky-500/[0.06]" : "border-amber-500/25 bg-amber-500/[0.06]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {comparison.comparable ? <TrendingUp className="h-5 w-5 text-sky-300" /> : <ShieldAlert className="h-5 w-5 text-amber-300" />}
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Progress since {date}</p>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {comparison.comparable
              ? comparison.scoreDelta !== null && comparison.scoreDelta > 0
                ? "Your movement is trending in the right direction"
                : "Use this session to reset the next improvement target"
              : "Previous session available, but not directly comparable"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{comparison.reason}</p>
        </div>
        {comparison.comparable && comparison.scoreDelta !== null ? (
          <div className={`rounded-2xl border px-5 py-4 text-center ${comparison.scoreDelta > 0 ? "border-emerald-500/25 bg-emerald-500/10" : comparison.scoreDelta < 0 ? "border-rose-500/25 bg-rose-500/10" : "border-white/10 bg-white/5"}`}>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Execution change</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-3xl font-semibold text-white">
              {comparison.scoreDelta > 0 ? <ArrowUpRight className="h-6 w-6 text-emerald-300" /> : comparison.scoreDelta < 0 ? <ArrowDownRight className="h-6 w-6 text-rose-300" /> : <ArrowRight className="h-6 w-6 text-slate-400" />}
              {deltaCopy(comparison.scoreDelta)}
            </div>
          </div>
        ) : <History className="h-8 w-8 text-amber-300" />}
      </div>

      {comparison.comparable && comparison.areaDeltas.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {comparison.areaDeltas.slice(0, 4).map((area) => (
            <div key={area.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-sm text-slate-400">{area.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-white">{area.current}</p>
                <span className={`text-sm font-semibold ${area.delta > 0 ? "text-emerald-300" : area.delta < 0 ? "text-rose-300" : "text-slate-400"}`}>{deltaCopy(area.delta)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">Previous {area.previous}</p>
            </div>
          ))}
        </div>
      ) : null}

      {comparison.strongestGain ? (
        <p className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <span className="font-semibold">Best gain:</span> {comparison.strongestGain.label} improved by {comparison.strongestGain.delta} points under the comparable scoring model.
        </p>
      ) : null}
    </section>
  );
}
