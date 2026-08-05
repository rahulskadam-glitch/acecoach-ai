"use client";

import { Activity, CalendarDays, CheckCircle2, LineChart as LineChartIcon, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export default function ProgressAnalyticsDashboard({ points, completedPractice, totalPractice }: { points: ProgressPoint[]; completedPractice: number; totalPractice: number }) {
  const groups = useMemo(() => Array.from(new Set(points.map((point) => `${point.sportId}:${point.movement}`))), [points]);
  const [selectedGroup, setSelectedGroup] = useState(() => groups.at(-1) ?? "");
  const comparablePoints = points.filter((point) => `${point.sportId}:${point.movement}` === selectedGroup);
  const reliable = comparablePoints.filter((point) => point.score !== null);
  const latest = comparablePoints.at(-1) ?? null;
  const earliest = reliable[0] ?? null;
  const latestReliable = reliable.at(-1) ?? null;
  const scoreDelta = earliest && latestReliable && earliest !== latestReliable && earliest.score !== null && latestReliable.score !== null ? latestReliable.score - earliest.score : null;
  const practicePercent = totalPractice > 0 ? Math.round((completedPractice / totalPractice) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(15,23,42,0.82)_48%,rgba(2,6,23,0.94))] p-7">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3 text-emerald-300"><LineChartIcon className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Progress intelligence</p></div>{groups.length > 0 ? <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Comparable movement<select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="ml-3 rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white">{groups.map((group) => { const [, movement] = group.split(":"); return <option key={group} value={group}>{movement.replaceAll("_", " ")}</option>; })}</select></label> : null}</div>
        <h1 className="mt-4 text-4xl font-semibold text-white">Is the movement becoming more repeatable?</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Only reliability-gated reports should be compared. Engine versions, capture quality, and movement context still matter before interpreting a score change.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><Activity className="h-5 w-5 text-sky-300" /><p className="mt-4 text-sm text-slate-400">Reliable reports</p><p className="mt-1 text-3xl font-bold text-white">{reliable.length}</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><Target className="h-5 w-5 text-emerald-300" /><p className="mt-4 text-sm text-slate-400">Comparable-session change</p><p className={`mt-1 text-3xl font-bold ${scoreDelta === null ? "text-slate-400" : scoreDelta >= 0 ? "text-emerald-300" : "text-amber-300"}`}>{scoreDelta === null ? "—" : `${scoreDelta > 0 ? "+" : ""}${scoreDelta}`}</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><CheckCircle2 className="h-5 w-5 text-violet-300" /><p className="mt-4 text-sm text-slate-400">Practice completion</p><p className="mt-1 text-3xl font-bold text-white">{practicePercent}%</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><CalendarDays className="h-5 w-5 text-amber-300" /><p className="mt-4 text-sm text-slate-400">Latest movement</p><p className="mt-1 text-lg font-semibold capitalize text-white">{latest?.movement.replaceAll("_", " ") ?? "No report yet"}</p></div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-semibold text-white">Technique and consistency trend</h2>
        <p className="mt-2 text-sm text-slate-400">Score and repeatability are displayed together so a single higher score is not mistaken for stable learning.</p>
        <div className="mt-6 h-[360px]">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={comparablePoints}><CartesianGrid stroke="rgba(148,163,184,0.14)" /><XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} /><YAxis domain={[0,100]} tick={{ fill: "#94a3b8", fontSize: 12 }} /><Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} /><Line type="monotone" dataKey="score" name="Execution index" stroke="#34d399" strokeWidth={3} connectNulls={false} /><Line type="monotone" dataKey="consistency" name="Repeatability" stroke="#a78bfa" strokeWidth={2} connectNulls={false} /></LineChart></ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-semibold text-white">Session evidence</h2>
        <div className="mt-5 space-y-3">{points.length === 0 ? <p className="text-sm text-slate-400">Analyze a clip to create your first progress baseline.</p> : points.slice().reverse().map((point) => <a key={point.sessionId} href={`/report/${point.sessionId}`} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-emerald-500/30 md:grid-cols-[1fr_auto_auto_auto]"><div><p className="font-semibold capitalize text-white">{point.movement.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{point.date}</p></div><p className="text-sm text-slate-400">Score <span className="font-semibold text-white">{point.score ?? "withheld"}</span></p><p className="text-sm text-slate-400">Consistency <span className="font-semibold text-white">{point.consistency ?? "—"}</span></p><p className="text-sm text-slate-400">Capture <span className="font-semibold text-white">{point.capture}</span></p></a>)}</div>
      </section>
    </div>
  );
}
