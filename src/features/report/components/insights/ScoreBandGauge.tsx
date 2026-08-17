"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

type Props = {
  label: string;
  score: number | null;
  status?: "strength" | "developing" | "priority";
  detail?: string;
  onShow?: () => void;
};

const STATUS_COLOR = { strength: "#10b981", developing: "#3b82f6", priority: "#f59e0b" } as const;
const STATUS_LABEL = { strength: "Keep", developing: "Develop", priority: "Improve" } as const;
const STRENGTH_THRESHOLD = 75;

function inferStatus(score: number): keyof typeof STATUS_COLOR {
  if (score >= 75) return "strength";
  if (score >= 55) return "developing";
  return "priority";
}

/**
 * Compact radial gauge for 0-100 engine scores. The threshold tick marks the
 * engine's own strength cutoff (>= 75), so the visualization only
 * re-expresses classifications the engine already made.
 */
export default function ScoreBandGauge({ label, score, status, detail, onShow }: Props) {
  if (typeof score !== "number") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">{label}</p><span className="text-xs text-slate-400">not scored</span></div>
      </div>
    );
  }
  const clamped = Math.max(0, Math.min(100, score));
  const resolved = status ?? inferStatus(clamped);
  const color = STATUS_COLOR[resolved];
  const rounded = Math.round(clamped);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="relative h-16 w-16 shrink-0"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-label={`${label} score`}
        >
          <RadialBarChart
            width={64}
            height={64}
            data={[{ value: clamped, fill: color }]}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={6} />
          </RadialBarChart>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-slate-950">
            {rounded}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{label}</p>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${color}1a`, color }}>{STATUS_LABEL[resolved]}</span>
          </div>
          <p className="mt-1 text-[0.68rem] text-slate-500">Strength threshold: {STRENGTH_THRESHOLD}/100</p>
          {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
          {onShow ? <button type="button" onClick={onShow} className="mt-1.5 text-xs font-semibold text-blue-800 hover:text-blue-950">Show on video →</button> : null}
        </div>
      </div>
    </div>
  );
}
