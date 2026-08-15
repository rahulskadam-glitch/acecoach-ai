"use client";

type Props = {
  label: string;
  score: number | null;
  status?: "strength" | "developing" | "priority";
  detail?: string;
  onShow?: () => void;
};

const STATUS_COLOR = { strength: "#10b981", developing: "#3b82f6", priority: "#f59e0b" } as const;
const STATUS_LABEL = { strength: "Keep", developing: "Develop", priority: "Improve" } as const;

function inferStatus(score: number): keyof typeof STATUS_COLOR {
  if (score >= 75) return "strength";
  if (score >= 55) return "developing";
  return "priority";
}

/**
 * Horizontal target-band gauge for 0-100 engine scores.
 * The shaded band marks the engine's own strength threshold (>= 75), so the
 * visualization only re-expresses classifications the engine already made.
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
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{label}</p>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide" style={{ backgroundColor: `${color}1a`, color }}>{STATUS_LABEL[resolved]}</span>
          <span className="text-sm font-semibold tabular-nums text-slate-950">{Math.round(clamped)}</span>
        </span>
      </div>
      <div className="relative mt-2.5 h-2.5 rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} aria-label={`${label} score`}>
        <div className="absolute inset-y-0 left-[75%] right-0 rounded-r-full bg-emerald-100" title="Strength zone (engine threshold)" />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${clamped}%`, backgroundColor: color, opacity: 0.9 }} />
        <div className="absolute -inset-y-1 w-0.5 bg-slate-300" style={{ left: "75%" }} aria-hidden="true" />
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
      {onShow ? <button type="button" onClick={onShow} className="mt-2 text-xs font-semibold text-blue-800 hover:text-blue-950">Show on video →</button> : null}
    </div>
  );
}
