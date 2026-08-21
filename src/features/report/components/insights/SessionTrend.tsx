"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SessionTrendPoint = {
  sessionId: string;
  date: string;
  /** Reliability-gated execution index; null when the score was withheld. */
  score: number | null;
  consistency: number | null;
  capture: number;
};

/**
 * Multi-session trend for the same sport + movement. Scores appear only when
 * the reliability gate passed for that session (nulls break the line), so the
 * chart never manufactures comparability the engine did not assert.
 */
export default function SessionTrend({ points, currentSessionId }: { points: SessionTrendPoint[]; currentSessionId: string }) {
  if (points.length < 2) return null;
  const reliable = points.filter((point) => point.score !== null);
  const current = points.find((point) => point.sessionId === currentSessionId);
  const first = reliable[0];
  const last = reliable.at(-1);
  const delta = first && last && first !== last && first.score !== null && last.score !== null ? last.score - first.score : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-ath-navy p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><TrendingUp className="h-4 w-4 text-ath-green" />Your trend for this movement</div>
          <p className="mt-1 text-xs leading-5 text-slate-400">Only sessions of the same movement are plotted. Gaps mean the score was withheld by the reliability gate.</p>
        </div>
        {delta !== null ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ${delta >= 0 ? "bg-ath-green/20 text-ath-green" : "bg-ath-warn/20 text-ath-warn"}`}>{delta > 0 ? "+" : ""}{delta} since first reliable session</span> : null}
      </div>

      <div className="mt-4 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#ffffff", fontSize: 12 }} formatter={(value, name) => [value ?? "withheld", name === "score" ? "Execution index" : "Repeatability"]} />
            <Line type="monotone" dataKey="score" name="score" stroke="var(--color-ath-green)" strokeWidth={2.5} connectNulls={false} dot={{ r: 3.5, fill: "var(--color-ath-green)" }} isAnimationActive={false} />
            <Line type="monotone" dataKey="consistency" name="consistency" stroke="var(--color-ath-sky)" strokeWidth={1.75} strokeDasharray="5 4" connectNulls={false} dot={{ r: 2.5, fill: "var(--color-ath-sky)" }} isAnimationActive={false} />
            {current && current.score !== null ? <ReferenceDot x={current.date} y={current.score} r={7} fill="var(--color-ath-green)" fillOpacity={0.15} stroke="var(--color-ath-green)" strokeWidth={2} label={{ value: "this session", fill: "var(--color-ath-green)", fontSize: 10, position: "top" }} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[0.65rem] font-medium text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-ath-green" />Execution index</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded border-t-2 border-dashed border-ath-sky" />Repeatability</span>
      </div>
    </div>
  );
}
