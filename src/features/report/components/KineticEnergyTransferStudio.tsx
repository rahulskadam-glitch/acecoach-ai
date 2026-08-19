"use client";

import {
  Flame,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { MOTION_STAGES, type MotionStage } from "../motion/motion-model";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import KineticPowerWaterfallChart from "./KineticPowerWaterfallChart";
import KineticTimingLagLadder from "./KineticTimingLagLadder";
import StagePhaseScrubber from "./StagePhaseScrubber";
import SweetSpotStrikeClusterChart from "./SweetSpotStrikeClusterChart";

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { AnalysisReport } from "@/modules/analysis/types";

type KineticEnergyTransferStudioProps = {
  currentStage: MotionStage;
  onSeekToStage: (stage: MotionStage) => void;
  actionType?: string;
  profile?: PlayerBiomechanicalProfile;
};

type ChartMode =
  | "waterfall"
  | "strike_cluster"
  | "timing_ladder"
  | "velocity_sequence";

const CHART_MODE_OPTIONS: Array<{ id: ChartMode; label: string }> = [
  { id: "waterfall", label: "Power Leak Waterfall" },
  { id: "strike_cluster", label: "Sweet-Spot Cluster" },
  { id: "timing_ladder", label: "Timing Lag Ladder" },
  { id: "velocity_sequence", label: "Body Speed Curves" },
];

export default function KineticEnergyTransferStudio({
  currentStage,
  onSeekToStage,
  actionType = "forehand",
  profile,
}: KineticEnergyTransferStudioProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("waterfall");
  const resolvedProfile = profile ?? computePlayerBiomechanicalProfile({} as AnalysisReport, actionType);
  const links = resolvedProfile.segments;
  const [selectedLinkId, setSelectedLinkId] = useState<string>(links[links.length - 1]?.id ?? "link_racket");
  const [comparisonMode, setComparisonMode] = useState<"both" | "athlete_only" | "pro_only">("both");

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? links[links.length - 1];
  const peakVelocityLink = links.reduce((max, l) => (l.athletePeakVelocity > max.athletePeakVelocity ? l : max), links[0]);

  const totalEfficiency = resolvedProfile.estimatedKineticEfficiencyPct;

  // SVG Chart Dimensions for Velocity Mode (600 x 260)
  const chartW = 600;
  const chartH = 260;
  const paddingL = 50;
  const paddingR = 30;
  const paddingT = 25;
  const paddingB = 35;
  const graphW = chartW - paddingL - paddingR;
  const graphH = chartH - paddingT - paddingB;
  const totalDuration = 1.80; // seconds

  const timeToX = (t: number) => paddingL + (t / totalDuration) * graphW;
  const velToY = (v: number) => paddingT + graphH - (v / 1700) * graphH;

  // Gaussian Curve Generator for smooth time-series velocity wave peaks
  const generateCurvePath = (peakT: number, peakV: number, width = 0.22) => {
    const points: Array<{ x: number; y: number }> = [];
    const steps = 45;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalDuration;
      const gaussian = Math.exp(-Math.pow((t - peakT) / width, 2));
      const v = peakV * gaussian;
      points.push({ x: timeToX(t), y: velToY(v) });
    }
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  };

  const stageZones = [
    { label: "Ready", start: 0.0, end: 0.25, stage: "ready" as MotionStage },
    { label: "Turn", start: 0.25, end: 0.65, stage: "unit_turn" as MotionStage },
    { label: "Leg Load", start: 0.65, end: 1.05, stage: "backswing" as MotionStage },
    { label: "Contact ⚡", start: 1.05, end: 1.35, stage: "forward_swing_contact" as MotionStage },
    { label: "Finish", start: 1.35, end: 1.60, stage: "follow_through" as MotionStage },
    { label: "Reset", start: 1.60, end: 1.80, stage: "recovery" as MotionStage },
  ];

  return (
    <div className="space-y-6 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-950 via-[#0a1224] to-[#08182b] p-6 text-white shadow-2xl backdrop-blur-2xl sm:p-8">
      {/* Header & Controls */}
      <div className="flex flex-wrap-reverse items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Energy & Trajectory Suite
            </h2>
            <span className="rounded-full bg-ath-sky/10 border border-ath-sky/20 px-2.5 py-0.5 text-[0.6rem] font-bold text-ath-sky">
              Estimated via Scientific Biomechanical Model
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Modeled from your measured torso coil and knee-load angles, scaled against tour benchmarks — not force-plate or EMG data.
          </p>
        </div>

        {/* Dynamic Power Flow Score */}
        <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur sm:w-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 block">
              Kinetic Flow Score
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-ath-green font-mono">{totalEfficiency}%</span>
              <span className="text-[0.68rem] font-medium text-slate-400">
                {totalEfficiency >= 85 ? "Optimal Energy Delivery" : "Power Leak Detected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Mode Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">Chart:</span>
          <select
            aria-label="Select chart mode"
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as ChartMode)}
            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
          >
            {CHART_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-900 text-white">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {chartMode === "velocity_sequence" ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-1 text-[0.68rem] font-bold uppercase">Show:</span>
            <button
              type="button"
              onClick={() => setComparisonMode("both")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                comparisonMode === "both" ? "bg-white text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              You vs Pro
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode("athlete_only")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                comparisonMode === "athlete_only" ? "bg-ath-green text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              You Only
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode("pro_only")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                comparisonMode === "pro_only" ? "bg-ath-sky text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              Pro Benchmark
            </button>
          </div>
        ) : null}
      </div>

      {/* VIEW 1: POWER LEAK WATERFALL */}
      {chartMode === "waterfall" ? (
        <KineticPowerWaterfallChart
          currentStage={currentStage}
          onSeekToStage={onSeekToStage}
          actionType={actionType}
          profile={profile}
        />
      ) : null}

      {/* VIEW 4: 🎯 SWEET-SPOT STRIKE CLUSTER (HAWK-EYE) */}
      {chartMode === "strike_cluster" ? (
        <SweetSpotStrikeClusterChart actionType={actionType} profile={profile} />
      ) : null}

      {/* VIEW 7: ⏱️ KINETIC TIMING LAG LADDER (K-VEST) */}
      {chartMode === "timing_ladder" ? (
        <KineticTimingLagLadder actionType={actionType} profile={profile} />
      ) : null}

      {/* VIEW 5: TIME-SERIES BODY SPEED CURVES (5 BODY PARTS) */}
      {chartMode === "velocity_sequence" ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Speed Waves (°/s) Through Stroke Time (0.0s ➔ 1.8s)
              </span>
              <span className="text-xs text-ath-sky font-mono">
                Whippy Peak: <strong className="text-white">{peakVelocityLink.athletePeakVelocity.toLocaleString()}°/s at {peakVelocityLink.peakTime.toFixed(2)}s</strong>
              </span>
            </div>

            {/* SVG Time-Series Chart Arena */}
            <div className="relative mt-4 aspect-[16/7] w-full">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-full w-full select-none">
                {/* Horizontal Velocity Gridlines */}
                {[0, 400, 800, 1200, 1600].map((v) => {
                  const y = velToY(v);
                  return (
                    <g key={v}>
                      <line x1={paddingL} y1={y} x2={chartW - paddingR} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <text x={paddingL - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                        {v}°
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Stage Transition Dividers */}
                {stageZones.map((zone) => {
                  const x = timeToX(zone.start);
                  return (
                    <g key={zone.label}>
                      <line x1={x} y1={paddingT} x2={x} y2={chartH - paddingB} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                      <text x={x + 4} y={paddingT + 12} fill="#94a3b8" fontSize="8.5" fontWeight="600">
                        {zone.label}
                      </text>
                    </g>
                  );
                })}

                {/* 5 Body Part Gaussian Speed Waves */}
                {links.map((link) => {
                  const athletePath = generateCurvePath(link.peakTime, link.athletePeakVelocity, 0.20);
                  const proPath = generateCurvePath(link.peakTime, link.proPeakVelocity, 0.20);
                  const isSelected = link.id === selectedLinkId;

                  return (
                    <g key={link.id} className="cursor-pointer" onClick={() => setSelectedLinkId(link.id)}>
                      {/* Pro Benchmark Curve (Dashed) */}
                      {(comparisonMode === "both" || comparisonMode === "pro_only") && (
                        <path
                          d={proPath}
                          fill="none"
                          stroke={link.color}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          strokeDasharray="4 3"
                          opacity={isSelected ? 0.9 : 0.4}
                        />
                      )}

                      {/* Athlete Measured Curve (Solid Glow) */}
                      {(comparisonMode === "both" || comparisonMode === "athlete_only") && (
                        <path
                          d={athletePath}
                          fill="none"
                          stroke={link.color}
                          strokeWidth={isSelected ? 3.5 : 2.2}
                          strokeLinecap="round"
                          opacity={isSelected ? 1.0 : 0.75}
                          style={{ filter: isSelected ? `drop-shadow(0 0 6px ${link.color})` : "none" }}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 5 Core Body Parts Summary & Simple Coaching Cues */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedLink.color }} />
                <h3 className="text-sm font-bold text-white">{selectedLink.name}</h3>
                <span className="text-xs text-slate-400">({selectedLink.simpleAction})</span>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-slate-300">
                Timing: {MOTION_STAGES.find((s) => s.id === selectedLink.peakStage)?.label}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <Flame className="h-3.5 w-3.5" />
                  What Happened
                </span>
                <p className="mt-1.5 text-xs text-rose-200 leading-relaxed">
                  {selectedLink.lossReason}
                </p>
              </div>

              <div className="rounded-xl border border-ath-green/30 bg-ath-green/20 p-3.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-ath-green">
                  <Sparkles className="h-3.5 w-3.5" />
                  Coach Tip
                </span>
                <p className="mt-1.5 text-xs text-ath-green leading-relaxed">
                  {selectedLink.coachingFix}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <StagePhaseScrubber currentStage={currentStage} onSeekToStage={onSeekToStage} />
    </div>
  );
}
