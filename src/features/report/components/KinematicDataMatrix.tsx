"use client";

import { Info, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";
import { computePlayerBiomechanicalProfile, type PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

type KinematicMetric = {
  id: string;
  label: string;
  value: string;
  unit: string;
  tourBenchmark: string;
  delta: string;
  status: "optimal" | "warning" | "alert";
  category: "racket" | "body_3dma" | "ball_flight";
  definition: string;
  coachingCue: string;
};

type Props = {
  actionType?: string;
  onSelectMetric?: (metricId: string) => void;
  profile?: PlayerBiomechanicalProfile;
  report?: AnalysisReport;
};

export default function KinematicDataMatrix({ actionType = "forehand", onSelectMetric, profile, report }: Props) {
  const [activeCategory, setActiveCategory] = useState<"all" | "racket" | "body_3dma" | "ball_flight">("all");
  const [inspectedMetric, setInspectedMetric] = useState<KinematicMetric | null>(null);

  // Dynamic stroke-aware Kinematic Telemetry parameters derived from video frames
  // Dynamic stroke-aware Kinematic Telemetry parameters derived from video frames
  const metrics: KinematicMetric[] = useMemo(() => {
    const resolvedProfile = profile ?? computePlayerBiomechanicalProfile(report ?? ({} as AnalysisReport), actionType);
    return resolvedProfile.telemetryMetrics.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.measuredValue,
      unit: item.unit,
      tourBenchmark: item.tourBenchmark,
      delta: item.deltaLabel,
      status: item.status,
      category: item.category,
      definition: item.definition,
      coachingCue: item.coachingCue,
    }));
  }, [profile, report, actionType]);

  const filteredMetrics = useMemo(() => {
    if (activeCategory === "all") return metrics;
    return metrics.filter((m) => m.category === activeCategory);
  }, [metrics, activeCategory]);

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-ath-navy p-5 sm:p-7">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <p className="text-xs text-slate-400">Derived from 3D joint velocity models & tour reference benchmarks.</p>

        {/* Category Filters (iOS Segmented Pills) */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          {[
            { id: "all", label: `All (${metrics.length})` },
            { id: "racket", label: "Racket" },
            { id: "body_3dma", label: "Body" },
            { id: "ball_flight", label: "Ball" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
              className={`rounded-lg px-3 py-1.5 font-bold transition text-xs ${
                activeCategory === cat.id
                  ? "bg-ath-lime text-ath-navy shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Apple Watch Style Telemetry Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filteredMetrics.map((m) => {
          const isInspected = inspectedMetric?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setInspectedMetric(isInspected ? null : m);
                onSelectMetric?.(m.id);
              }}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                isInspected
                  ? "border-ath-lime bg-ath-lime/10 shadow-lg shadow-ath-lime/10 ring-1 ring-ath-lime"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {/* Top Row: Metric Label & Status Dot */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 truncate pr-1">
                  {m.label}
                </span>
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    m.status === "optimal"
                      ? "bg-ath-green shadow-sm shadow-ath-green/80"
                      : m.status === "warning"
                      ? "bg-ath-warn shadow-sm shadow-ath-warn/80"
                      : "bg-rose-400 shadow-sm shadow-rose-400/80"
                  }`}
                />
              </div>

              {/* Center: Large Value */}
              <div className="my-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {m.value}
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">{m.unit}</span>
              </div>

              {/* Bottom: Benchmark Info */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[0.65rem]">
                <span className="text-slate-400">Tour Benchmark:</span>
                <span className="font-mono font-bold text-slate-200">{m.tourBenchmark}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Metric Inspector Drawer */}
      {inspectedMetric && (
        <div className="mt-4 rounded-2xl border border-ath-lime/30 bg-ath-lime/5 p-4 text-xs backdrop-blur-md animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-ath-lime p-2 text-ath-navy font-black">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-black text-white text-sm">{inspectedMetric.label}</h4>
                <p className="text-slate-300 mt-0.5">{inspectedMetric.definition}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedMetric(null)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/20"
            >
              Done
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-ath-green/10 border border-ath-green/20 p-3 text-emerald-100">
            <Sparkles className="h-4 w-4 shrink-0 text-ath-green mt-0.5" />
            <div>
              <strong className="font-bold text-white">Biomechanical Feel Cue: </strong>
              <span>{inspectedMetric.coachingCue}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
