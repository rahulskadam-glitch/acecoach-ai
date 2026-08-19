"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import type { MotionStage } from "../motion/motion-model";
import { computePlayerBiomechanicalProfile, type PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { AnalysisReport } from "@/modules/analysis/types";

type Props = {
  currentStage?: MotionStage;
  onSeekToStage?: (stage: MotionStage) => void;
  actionType?: string;
  profile?: PlayerBiomechanicalProfile;
};

type WaterfallStep = {
  id: string;
  name: string;
  category: "gain" | "leak" | "total";
  joules: number;
  cumulativeJoules: number;
  benchmarkJoules: number;
  stage: MotionStage;
  description: string;
  coachingFix: string;
  color: string;
};

function getWaterfallStepsForAction(actionType: string, profile?: PlayerBiomechanicalProfile): WaterfallStep[] {
  const isServe = actionType.toLowerCase().includes("serve");
  const p = profile ?? computePlayerBiomechanicalProfile({} as AnalysisReport, actionType);

  const w = p.waterfallJoules;
  const leakJoules = Math.max(12, Math.round((p.proKineticEfficiencyPct - p.estimatedKineticEfficiencyPct) * 1.6));
  const hipEnergy = Math.max(25, w.torso - w.legs);
  const armEnergy = Math.max(30, w.racket - (w.torso - leakJoules));

  return [
    {
      id: "ground_reaction",
      name: isServe ? "1. Trophy Leg Push" : "1. Ground Leg Drive",
      category: "gain",
      joules: w.legs,
      cumulativeJoules: w.legs,
      benchmarkJoules: isServe ? 420 : 95,
      stage: "backswing",
      description: `Ground reaction force from knee loading (${p.measuredKneeFlexionDeg}° flexion).`,
      coachingFix: p.kneeStatus === "optimal"
        ? "Knee loading depth is synchronized with unit turn."
        : "Bend knees deeper during setup for higher kinetic energy generation.",
      color: "#10b981",
    },
    {
      id: "hip_transfer",
      name: "2. Pelvis & Torso Coil",
      category: "gain",
      joules: hipEnergy,
      cumulativeJoules: w.torso,
      benchmarkJoules: isServe ? 620 : 245,
      stage: "forward_swing_contact",
      description: `Rotational energy stored in shoulder-pelvis separation (${p.measuredTorsoCoilDeg}° coil).`,
      coachingFix: p.coilStatus === "optimal"
        ? "Torso coil and stretch-shortening cycle are on track."
        : "Create full shoulder turn past the ball line to eliminate rotational power leak.",
      color: "#06b6d4",
    },
    {
      id: "kinetic_leak",
      name: "3. Kinetic Transfer Leak",
      category: "leak",
      joules: -leakJoules,
      cumulativeJoules: Math.max(20, w.torso - leakJoules),
      benchmarkJoules: isServe ? 600 : 240,
      stage: "forward_swing_contact",
      description: p.timingLagStatus === "optimal"
        ? "Clean proximal-to-distal sequencing from hips to arm."
        : `Early uncoil reduces kinetic transfer efficiency to ${p.estimatedKineticEfficiencyPct}%.`,
      coachingFix: `Timing lag measured at ${p.measuredTimingLagMs}ms. Lead with the hips before releasing the arm.`,
      color: "#ef4444",
    },
    {
      id: "arm_whip",
      name: "4. Arm & Racket Acceleration",
      category: "gain",
      joules: armEnergy,
      cumulativeJoules: w.racket,
      benchmarkJoules: isServe ? 920 : 320,
      stage: "forward_swing_contact",
      description: `Final kinetic delivery into stringbed velocity (+${p.estimatedRecoverableMph} MPH potential).`,
      coachingFix: "Maintain loose grip tension through impact to maximize terminal racket whip.",
      color: "#d7e022",
    },
    {
      id: "terminal_energy",
      name: "5. Total Impact Energy",
      category: "total",
      joules: w.racket,
      cumulativeJoules: w.racket,
      benchmarkJoules: isServe ? 920 : 320,
      stage: "forward_swing_contact",
      description: `Total deliverable kinetic energy: ${w.racket} Joules at ${p.estimatedKineticEfficiencyPct}% efficiency.`,
      coachingFix: `Fixing the primary leak unlocks an estimated +${p.estimatedRecoverableMph} MPH on your stroke.`,
      color: "#38bdf8",
    },
  ];
}

export default function KineticPowerWaterfallChart({
  onSeekToStage,
  actionType = "forehand",
  profile,
}: Props) {
  const steps = useMemo(() => getWaterfallStepsForAction(actionType, profile), [actionType, profile]);
  const [selectedStepId, setSelectedStepId] = useState<string>(steps[1]?.id ?? "hip_transfer");

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? steps[1];
  const maxJoules = Math.max(100, Math.max(...steps.map((s) => Math.abs(s.cumulativeJoules))) * 1.25);

  const totalLeaked = Math.abs(steps.filter((s) => s.joules < 0).reduce((acc, s) => acc + s.joules, 0));
  const finalEnergy = steps.find((s) => s.category === "total")?.joules || (profile?.waterfallJoules.racket ?? 320);
  const potentialRecoverableMph = profile?.estimatedRecoverableMph
    ? profile.estimatedRecoverableMph.toFixed(1)
    : ((totalLeaked / Math.max(1, finalEnergy)) * 78 * 0.95).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-5 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Kinetic Energy Transfer Cascade
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-300">
              {actionType.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Kinetic Power Leak Waterfall
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Step-by-step energy generated along the body vs. power leaked before ball impact.
          </p>
        </div>

        {/* Recoverable Power KPI Pill */}
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-2.5 backdrop-blur">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
          <div>
            <span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-rose-300 block">
              Leaked Kinetic Energy
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-200">-{totalLeaked} Joules</span>
              <span className="text-xs font-bold text-rose-400">(+{potentialRecoverableMph} mph ball speed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Waterfall Chart Arena */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Energy Transfer Flow (Joules)
          </span>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
              Energy Generated
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" />
              Power Leak
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="h-2.5 w-2.5 rounded bg-sky-500" />
              Net Delivered
            </span>
          </div>
        </div>

        {/* SVG Waterfall Bars */}
        <div className="relative mt-5 aspect-[16/8] w-full min-h-[220px]">
          <svg viewBox="0 0 700 280" className="h-full w-full select-none">
            <defs>
              <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="leakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 250, 500, 750, 1000].filter((v) => v <= maxJoules).map((val) => {
              const y = 240 - (val / maxJoules) * 200;
              return (
                <g key={val}>
                  <line x1="40" y1={y} x2="680" y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <text x="32" y={y + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                    {val}J
                  </text>
                </g>
              );
            })}

            {/* Baseline Floor */}
            <line x1="40" y1="240" x2="680" y2="240" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

            {/* Step Bars */}
            {steps.map((step, idx) => {
              const barWidth = 72;
              const barX = 65 + idx * 102;
              const isSelected = step.id === selectedStepId;

              // Compute Y positions
              let barY: number;
              let barHeight: number;

              if (step.category === "gain") {
                const bottomY = 240 - ((step.cumulativeJoules - step.joules) / maxJoules) * 200;
                const topY = 240 - (step.cumulativeJoules / maxJoules) * 200;
                barY = topY;
                barHeight = bottomY - topY;
              } else if (step.category === "leak") {
                const topY = 240 - ((step.cumulativeJoules + Math.abs(step.joules)) / maxJoules) * 200;
                const bottomY = 240 - (step.cumulativeJoules / maxJoules) * 200;
                barY = topY;
                barHeight = bottomY - topY;
              } else {
                // Total
                const topY = 240 - (step.cumulativeJoules / maxJoules) * 200;
                barY = topY;
                barHeight = 240 - topY;
              }

              // Benchmark marker Y
              const benchY = 240 - (step.benchmarkJoules / maxJoules) * 200;

              return (
                <g
                  key={step.id}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => {
                    setSelectedStepId(step.id);
                    if (onSeekToStage) onSeekToStage(step.stage);
                  }}
                >
                  {/* Hover/Selection Halo */}
                  {isSelected && (
                    <rect
                      x={barX - 4}
                      y={Math.min(barY, benchY) - 8}
                      width={barWidth + 8}
                      height={240 - Math.min(barY, benchY) + 16}
                      rx="10"
                      fill="rgba(56,189,248,0.12)"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Waterfall Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(4, barHeight)}
                    rx="6"
                    fill={step.category === "gain" ? "url(#gainGrad)" : step.category === "leak" ? "url(#leakGrad)" : "url(#totalGrad)"}
                    stroke={isSelected ? "#ffffff" : "rgba(255,255,255,0.2)"}
                    strokeWidth={isSelected ? "2" : "1"}
                  />

                  {/* Pro Benchmark Target Marker Line */}
                  <line
                    x1={barX - 2}
                    y1={benchY}
                    x2={barX + barWidth + 2}
                    y2={benchY}
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />

                  {/* Value on Bar */}
                  <text
                    x={barX + barWidth / 2}
                    y={barY + barHeight / 2 + 4}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {step.joules > 0 ? `+${step.joules}J` : `${step.joules}J`}
                  </text>

                  {/* Cumulative Total Label Above */}
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 8}
                    fill={step.category === "leak" ? "#f43f5e" : "#e2e8f0"}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {step.cumulativeJoules}J
                  </text>

                  {/* Step Label Below Baseline */}
                  <text
                    x={barX + barWidth / 2}
                    y="256"
                    fill={isSelected ? "#38bdf8" : "#94a3b8"}
                    fontSize="8.5"
                    fontWeight={isSelected ? "800" : "600"}
                    textAnchor="middle"
                  >
                    {step.name.split(" ")[1]}
                  </text>
                  <text
                    x={barX + barWidth / 2}
                    y="268"
                    fill={isSelected ? "#38bdf8" : "#64748b"}
                    fontSize="7.5"
                    textAnchor="middle"
                  >
                    {step.name.split(" ")[2] || ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Step Detailed Diagnostic Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedStep.color }}
            />
            <h4 className="text-base font-bold text-white">{selectedStep.name}</h4>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                selectedStep.category === "gain"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : selectedStep.category === "leak"
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-sky-500/20 text-sky-300"
              }`}
            >
              {selectedStep.joules > 0 ? `+${selectedStep.joules} Joules Generated` : `${selectedStep.joules} Joules Lost`}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Pro Target: <span className="font-bold text-amber-300">{selectedStep.benchmarkJoules} Joules</span>
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
              Biomechanical Root Cause
            </span>
            <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
              {selectedStep.description}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 ring-1 ring-emerald-500/30">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-400 block">
              Actionable Coaching Fix
            </span>
            <p className="mt-1 text-xs text-emerald-100 leading-relaxed font-semibold">
              {selectedStep.coachingFix}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function normMaxJoules(actionType: string): number {
  if (actionType.toLowerCase().includes("serve")) return 1200;
  return 950;
}
