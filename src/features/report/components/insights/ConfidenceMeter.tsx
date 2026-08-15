"use client";

const ZONES = [
  { until: 0.42, label: "limited", color: "#f59e0b" },
  { until: 0.65, label: "usable", color: "#3b82f6" },
  { until: 1, label: "clear", color: "#10b981" },
] as const;

export function confidenceZone(value: number) {
  if (value >= 0.65) return ZONES[2];
  if (value >= 0.42) return ZONES[1];
  return ZONES[0];
}

/**
 * Visual confidence band. The zone thresholds (0.42 / 0.65) are the same
 * boundaries the report already uses for its "limited / usable / clear"
 * confidence language — no new precision is claimed.
 */
export default function ConfidenceMeter({ value, className = "" }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const zone = confidenceZone(clamped);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} title={`${zone.label} confidence · ${Math.round(clamped * 100)}%`}>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-[42%] bg-amber-200/70" />
        <span className="absolute inset-y-0 left-[42%] w-[23%] bg-blue-200/70" />
        <span className="absolute inset-y-0 left-[65%] right-0 bg-emerald-200/70" />
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${clamped * 100}%`, backgroundColor: zone.color, opacity: 0.85 }} />
      </span>
      <span className="text-[0.65rem] font-medium text-slate-500">{zone.label} · {Math.round(clamped * 100)}%</span>
    </span>
  );
}
