"use client";

import { Activity, CalendarDays, CheckCircle2, LineChart as LineChartIcon, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LoadPatternFlag } from "@/modules/analysis/load-pattern";
import { retryAnalysisPostprocessing } from "@/app/actions/analysis-actions";

export type ProgressPoint = {
  date: string;
  score: number | null;
  confidence: number;
  capture: number;
  consistency: number | null;
  movement: string;
  sessionId: string;
  sportId: string;
};

export type DevelopmentTrend = {
  sportId: string;
  movement: string;
  constructId: string;
  status: "active" | "improving" | "plateaued" | "regressed" | "solved" | "superseded";
  activeCue: string | null;
  reason: string | null;
  shift: number | null;
  points: Array<{ sessionId: string; date: string; median: number; lower: number; upper: number }>;
};

export type SharedRootSummary = {
  sportId: string;
  constructId: string;
  contextClass: string;
  actionTypes: string[];
  confidence: number;
  sharedCue: string | null;
  strokeSpecificCues: Record<string, string | null>;
  reason: string;
};

export default function ProgressAnalyticsDashboard({ points, developmentTrends = [], sharedRoots = [], loadFlags = [], completedPractice, totalPractice, dataWarnings = [], failedPostprocessing = [] }: { points: ProgressPoint[]; developmentTrends?: DevelopmentTrend[]; sharedRoots?: SharedRootSummary[]; loadFlags?: LoadPatternFlag[]; completedPractice: number; totalPractice: number; dataWarnings?: string[]; failedPostprocessing?: Array<{ sessionId: string; message: string }> }) {
  const groups = useMemo(() => Array.from(new Set(points.map((point) => `${point.sportId}:${point.movement}`))), [points]);
  const [selectedGroup, setSelectedGroup] = useState(() => groups.at(-1) ?? "");
  const comparablePoints = points.filter((point) => `${point.sportId}:${point.movement}` === selectedGroup);
  const reliable = comparablePoints.filter((point) => point.score !== null);
  const latest = comparablePoints.at(-1) ?? null;
  const earliest = reliable[0] ?? null;
  const latestReliable = reliable.at(-1) ?? null;
  const scoreDelta = earliest && latestReliable && earliest !== latestReliable && earliest.score !== null && latestReliable.score !== null ? latestReliable.score - earliest.score : null;
  const practicePercent = totalPractice > 0 ? Math.round((completedPractice / totalPractice) * 100) : 0;
  const activeTrend = developmentTrends.find((trend) => `${trend.sportId}:${trend.movement}` === selectedGroup) ?? null;
  const [selectedSport, selectedMovement] = selectedGroup.split(":");
  const sharedRoot = sharedRoots.find((item) => item.sportId === selectedSport && item.actionTypes.includes(selectedMovement)) ?? null;
  const loadFlag = loadFlags.find((item) => item.sportId === selectedSport && item.actionType === selectedMovement) ?? null;

  return (
    <div className="space-y-6">
      {dataWarnings.length > 0 ? <section role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-5 text-amber-800"><p className="font-semibold">Some progress information is temporarily unavailable.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800/80">{dataWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-3 text-xs text-amber-800/70">Refresh this page to retry. Existing reports and practice records have not been removed.</p></section> : null}
      {failedPostprocessing.length > 0 ? <section role="status" className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.08] p-5 text-blue-800"><p className="font-semibold">Development history needs another processing attempt.</p><div className="mt-3 space-y-3">{failedPostprocessing.map((job) => <form key={job.sessionId} action={retryAnalysisPostprocessing.bind(null, job.sessionId)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><p className="max-w-2xl text-xs text-blue-800/75">{job.message}</p><button type="submit" className="min-h-10 rounded-xl bg-sky-200 px-4 text-sm font-semibold text-slate-950 hover:bg-white">Retry processing</button></form>)}</div></section> : null}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3 text-emerald-700"><LineChartIcon className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Your progress</p></div>{groups.length > 0 ? <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Movement<select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="ml-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950">{groups.map((group) => { const [, movement] = group.split(":"); return <option key={group} value={group}>{movement.replaceAll("_", " ")}</option>; })}</select></label> : null}</div>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Is the movement becoming more repeatable?</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Athlentra compares reports only when the movement, video quality, and viewing angle are similar enough for a fair trend.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><Activity className="h-5 w-5 text-blue-700" /><p className="mt-4 text-sm text-slate-600">Reliable reports</p><p className="mt-1 text-3xl font-bold text-slate-950">{reliable.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><Target className="h-5 w-5 text-emerald-700" /><p className="mt-4 text-sm text-slate-600">Change from baseline</p><p className={`mt-1 text-3xl font-bold ${scoreDelta === null ? "text-slate-600" : scoreDelta >= 0 ? "text-emerald-700" : "text-amber-700"}`}>{scoreDelta === null ? "—" : `${scoreDelta > 0 ? "+" : ""}${scoreDelta}`}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><CheckCircle2 className="h-5 w-5 text-violet-700" /><p className="mt-4 text-sm text-slate-600">Practice completion</p><p className="mt-1 text-3xl font-bold text-slate-950">{practicePercent}%</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><CalendarDays className="h-5 w-5 text-amber-700" /><p className="mt-4 text-sm text-slate-600">Latest movement</p><p className="mt-1 text-lg font-semibold capitalize text-slate-950">{latest?.movement.replaceAll("_", " ") ?? "No report yet"}</p></div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-950">Technique and consistency trend</h2>
        <p className="mt-2 text-sm text-slate-600">Score and repeatability are displayed together so a single higher score is not mistaken for stable learning.</p>
        <div className="mt-6 h-[360px]">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={comparablePoints}><CartesianGrid stroke="rgba(148,163,184,0.14)" /><XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} /><YAxis domain={[0,100]} tick={{ fill: "#94a3b8", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} /><Line type="monotone" dataKey="score" name="Execution index" stroke="#34d399" strokeWidth={3} connectNulls={false} /><Line type="monotone" dataKey="consistency" name="Repeatability" stroke="#a78bfa" strokeWidth={2} connectNulls={false} /></LineChart></ResponsiveContainer>
        </div>
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-800">View technique trend as a table</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><caption className="sr-only">Technique and consistency measurements by session</caption><thead className="text-xs uppercase tracking-wide text-slate-600"><tr><th scope="col" className="px-3 py-2">Date</th><th scope="col" className="px-3 py-2">Movement</th><th scope="col" className="px-3 py-2">Execution index</th><th scope="col" className="px-3 py-2">Repeatability</th><th scope="col" className="px-3 py-2">Capture</th></tr></thead><tbody>{comparablePoints.map((point) => <tr key={point.sessionId} className="border-t border-slate-200 text-slate-800"><td className="px-3 py-2">{point.date}</td><td className="px-3 py-2 capitalize">{point.movement.replaceAll("_", " ")}</td><td className="px-3 py-2">{point.score ?? "Withheld"}</td><td className="px-3 py-2">{point.consistency ?? "Unavailable"}</td><td className="px-3 py-2">{point.capture}</td></tr>)}</tbody></table></div></details>
      </section>

      {sharedRoot ? <section className="rounded-[1.75rem] border border-violet-200 bg-violet-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Pattern across strokes</p>
        <h2 className="mt-2 text-2xl font-semibold capitalize text-slate-950">{sharedRoot.constructId.replaceAll("_", " ")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{sharedRoot.reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">{sharedRoot.actionTypes.map((action) => <span key={action} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold capitalize text-violet-800">{action.replaceAll("_", " ")}</span>)}</div>
        {sharedRoot.sharedCue ? <p className="mt-5 rounded-2xl border border-violet-400/20 bg-slate-50 p-4 text-sm text-slate-950"><span className="font-semibold text-violet-800">Shared cue:</span> {sharedRoot.sharedCue}</p> : <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Keep the stroke cues separate</p><div className="mt-3 grid gap-2 md:grid-cols-2">{sharedRoot.actionTypes.map((action) => <p key={action} className="text-sm text-slate-700"><span className="font-semibold capitalize text-slate-950">{action.replaceAll("_", " ")}:</span> {sharedRoot.strokeSpecificCues[action] ?? "Use the current stroke-specific cue."}</p>)}</div></div>}
        <p className="mt-3 text-xs text-slate-500">Matched context: {sharedRoot.contextClass.replaceAll("_", " ").replace(":", " · ")} · Evidence confidence {Math.round(sharedRoot.confidence * 100)}%</p>
      </section> : null}

      {loadFlag ? <section className="rounded-[1.75rem] border border-amber-500/25 bg-amber-500/[0.07] p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Practice workload</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Make the next block easier</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-800">{loadFlag.message}</p><div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800">Current log: {loadFlag.currentAttempts} attempts</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800">Recent median: {loadFlag.recentMedianAttempts}</span></div><p className="mt-4 text-xs text-amber-800/70">{loadFlag.clinicalBoundary} Pain, numbness, weakness, or persistent symptoms should be discussed with a qualified clinician.</p></section> : null}

      {activeTrend ? <section className="rounded-[1.75rem] border border-sky-500/20 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Current focus</p><h2 className="mt-2 text-2xl font-semibold capitalize text-slate-950">{activeTrend.constructId.replaceAll("_", " ")}</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">{activeTrend.reason ?? "Building a comparable multi-session baseline."}</p></div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${activeTrend.status === "improving" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : activeTrend.status === "regressed" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-sky-500/30 bg-sky-500/10 text-sky-200"}`}>{activeTrend.status}</span>
        </div>
        {activeTrend.activeCue ? <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"><span className="font-semibold text-slate-950">Keep this cue:</span> {activeTrend.activeCue}</p> : null}
        <div className="mt-6 h-[280px]">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={activeTrend.points}><CartesianGrid stroke="rgba(148,163,184,0.14)" /><XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} /><YAxis domain={[0,100]} tick={{ fill: "#94a3b8", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} /><Line type="monotone" dataKey="upper" name="Upper observed band" stroke="#334155" strokeDasharray="4 4" dot={false} /><Line type="monotone" dataKey="median" name="Construct distribution median" stroke="#38bdf8" strokeWidth={3} /><Line type="monotone" dataKey="lower" name="Lower observed band" stroke="#334155" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer>
        </div>
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-800">View development trend as a table</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><caption className="sr-only">Development construct distribution by session</caption><thead className="text-xs uppercase tracking-wide text-slate-600"><tr><th scope="col" className="px-3 py-2">Date</th><th scope="col" className="px-3 py-2">Lower band</th><th scope="col" className="px-3 py-2">Median</th><th scope="col" className="px-3 py-2">Upper band</th></tr></thead><tbody>{activeTrend.points.map((point) => <tr key={point.sessionId} className="border-t border-slate-200 text-slate-800"><td className="px-3 py-2">{point.date}</td><td className="px-3 py-2">{point.lower}</td><td className="px-3 py-2">{point.median}</td><td className="px-3 py-2">{point.upper}</td></tr>)}</tbody></table></div></details>
        <p className="mt-2 text-xs text-slate-500">The band shows variation within each session. A trend appears only after enough comparable, good-quality sessions.</p>
      </section> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-950">Analysis history</h2>
        <div className="mt-5 space-y-3">{points.length === 0 ? <p className="text-sm text-slate-600">Analyze a clip to create your first progress baseline.</p> : points.slice().reverse().map((point) => <a key={point.sessionId} href={`/report/${point.sessionId}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-500/30 md:grid-cols-[1fr_auto_auto_auto]"><div><p className="font-semibold capitalize text-slate-950">{point.movement.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{point.date}</p></div><p className="text-sm text-slate-600">Score <span className="font-semibold text-slate-950">{point.score ?? "withheld"}</span></p><p className="text-sm text-slate-600">Consistency <span className="font-semibold text-slate-950">{point.consistency ?? "—"}</span></p><p className="text-sm text-slate-600">Capture <span className="font-semibold text-slate-950">{point.capture}</span></p></a>)}</div>
      </section>
    </div>
  );
}
