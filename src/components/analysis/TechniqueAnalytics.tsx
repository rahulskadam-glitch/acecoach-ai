"use client";

import { Activity, BarChart3, TimerReset } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AnalysisReport } from "@/modules/analysis/types";

function formatSeconds(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(2)} s` : "—";
}

export default function TechniqueAnalytics({ report }: { report: AnalysisReport }) {
  const areas = (report.coachingAreas ?? []).slice(0, 10).map((area) => ({ label: area.label, score: area.score }));
  const insights = report.repetitionInsights;
  const rhythm = insights?.rhythmProfile;
  const phase = insights?.phaseTiming;
  if (areas.length === 0 && !insights) return null;

  return (
    <section className="rounded-[1.75rem] border border-violet-500/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),rgba(15,23,42,0.78))] p-6">
      <div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-violet-300" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Performance analytics lab</p><h2 className="mt-1 text-2xl font-semibold text-white">Movement-chain balance, rhythm, and repeatability</h2></div></div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">These analytics summarize the current clip. They are not force measurements, medical findings, or age-group percentiles.</p>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-sm font-semibold text-white">Movement-chain radar</p>
          <div className="mt-3 h-[320px]">
            <ResponsiveContainer width="100%" height="100%"><RadarChart data={areas}><PolarGrid stroke="rgba(148,163,184,0.25)" /><PolarAngleAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} /><Radar dataKey="score" stroke="#a78bfa" fill="#8b5cf6" fillOpacity={0.28} /><Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} /></RadarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><div className="flex items-center gap-2 text-sky-300"><Activity className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Repeatability</p></div><p className="mt-3 text-4xl font-bold text-white">{insights?.consistencyScore ?? "—"}<span className="text-base text-slate-500">/100</span></p><p className="mt-2 text-sm text-slate-300">{insights?.consistencyLabel ?? "Insufficient repetitions"}</p><p className="mt-2 text-xs leading-5 text-slate-500">{insights?.explanation}</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><div className="flex items-center gap-2 text-amber-300"><TimerReset className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Rhythm profile</p></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-slate-500">Median duration</p><p className="mt-1 font-semibold text-white">{formatSeconds(rhythm?.medianDurationSeconds)}</p></div><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-slate-500">Duration spread</p><p className="mt-1 font-semibold text-white">{formatSeconds(rhythm?.durationIqrSeconds)}</p></div><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-slate-500">Outlier reps</p><p className="mt-1 font-semibold text-white">{insights?.outlierRepetitions?.length ?? 0}</p></div><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-slate-500">Peak variability</p><p className="mt-1 font-semibold text-white">{typeof rhythm?.peakMotionCv === "number" ? `${Math.round(rhythm.peakMotionCv * 100)}%` : "—"}</p></div></div></div>
          {phase ? <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Phase timing</p><div className="mt-3 space-y-2">{phase.map((item) => <div key={item.phase} className="flex items-center justify-between text-sm"><span className="capitalize text-slate-400">{item.phase.replaceAll("_", " ")}</span><span className="font-semibold text-white">{Math.round(item.share * 100)}%</span></div>)}</div></div> : null}
        </div>
      </div>
    </section>
  );
}
