"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import type { MotionStage } from "../motion/motion-model";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

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
  const norm = actionType.toLowerCase();
  const isServe = norm.includes("serve");

  if (profile) {
    const w = profile.waterfallJoules;
    const leakJoules = Math.round((profile.proKineticEfficiencyPct - profile.estimatedKineticEfficiencyPct) * 1.5);

    return [
      {
        id: "ground_reaction",
        name: isServe ? "1. Trophy Leg Push" : "1. Ground Leg Drive",
        category: "gain",
        joules: w.legs,
        cumulativeJoules: w.legs,
        benchmarkJoules: isServe ? 420 : 95,
        stage: "backswing",
        description: `Ground reaction force from knee loading (${profile.measuredKneeFlexionDeg}° flexion).`,
        coachingFix: profile.kneeStatus === "optimal"
          ? "Knee loading depth is synchronized with unit turn."
          : `Bend knees deeper during setup for higher kinetic energy generation.`,
        color: "#10b981",
      },
      {
        id: "hip_transfer",
        name: "2. Pelvis & Torso Coil",
        category: "gain",
        joules: w.torso - w.legs,
        cumulativeJoules: w.torso,
        benchmarkJoules: isServe ? 620 : 245,
        stage: "forward_swing_contact",
        description: `Rotational energy stored in shoulder-pelvis separation (${profile.measuredTorsoCoilDeg}° coil).`,
        coachingFix: profile.coilStatus === "optimal"
          ? "Torso coil and stretch-shortening cycle are on track."
          : `Create full shoulder turn past the ball line to eliminate rotational power leak.`,
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
        description: profile.timingLagStatus === "optimal"
          ? "Clean proximal-to-distal sequencing from hips to arm."
          : `Early uncoil reduces kinetic transfer efficiency to ${profile.estimatedKineticEfficiencyPct}%.`,
        coachingFix: `Timing lag measured at ${profile.measuredTimingLagMs}ms. Lead with the hips before releasing the arm.`,
        color: "#ef4444",
      },
      {
        id: "arm_whip",
        name: "4. Arm & Racket Acceleration",
        category: "gain",
        joules: w.racket - (w.torso - leakJoules),
        cumulativeJoules: w.racket,
        benchmarkJoules: isServe ? 920 : 320,
        stage: "forward_swing_contact",
        description: `Final kinetic delivery into stringbed velocity (+${profile.estimatedRecoverableMph} MPH potential).`,
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
        description: `Total deliverable kinetic energy: ${w.racket} Joules at ${profile.estimatedKineticEfficiencyPct}% efficiency.`,
        coachingFix: `Fixing the primary leak unlocks an estimated +${profile.estimatedRecoverableMph} MPH on your stroke.`,
        color: "#38bdf8",
      },
    ];
  }

  if (norm.includes("serve")) {
    return [
      {
        id: "ground_reaction",
        name: "1. Trophy Leg Push",
        category: "gain",
        joules: 450,
        cumulativeJoules: 450,
        benchmarkJoules: 510,
        stage: "backswing",
        description: "Explosive vertical jump loading out of deep knee bend.",
        coachingFix: "Bend knees 8° deeper in trophy stance for +60 Joules of upward launch.",
        color: "#10b981",
      },
      {
        id: "toss_leak",
        name: "2. Shoulder Dip Leak",
        category: "leak",
        joules: -55,
        cumulativeJoules: 395,
        benchmarkJoules: 500,
        stage: "forward_swing_contact",
        description: "Left tossing arm dropped too quickly, collapsing the shoulder cartwheel axis.",
        coachingFix: "Keep tossing arm extended up toward the sky until the racket starts ascending.",
        color: "#f43f5e",
      },
      {
        id: "torso_cartwheel",
        name: "3. Torso Cartwheel Arch",
        category: "gain",
        joules: 240,
        cumulativeJoules: 635,
        benchmarkJoules: 760,
        stage: "forward_swing_contact",
        description: "Vertical-to-forward spinal arch uncoiling through ball launch.",
        coachingFix: "Drive right shoulder up and over your left shoulder for cleaner vertical leverage.",
        color: "#06b6d4",
      },
      {
        id: "scratch_leak",
        name: "4. Shallow Racket Drop",
        category: "leak",
        joules: -35,
        cumulativeJoules: 600,
        benchmarkJoules: 750,
        stage: "forward_swing_contact",
        description: "Racket head did not drop fully down the back scratch position.",
        coachingFix: "Relax grip completely at the top of the loop to allow full vertical drop.",
        color: "#f43f5e",
      },
      {
        id: "pronation_whip",
        name: "5. Forearm Pronation Whip",
        category: "gain",
        joules: 290,
        cumulativeJoules: 890,
        benchmarkJoules: 1050,
        stage: "forward_swing_contact",
        description: "Internal shoulder rotation and outward pronation through the ball peak.",
        coachingFix: "Pronate wrist outward past contact so the racket face finishes facing right.",
        color: "#8b5cf6",
      },
      {
        id: "final_ball_energy",
        name: "6. Ball Launch Energy",
        category: "total",
        joules: 890,
        cumulativeJoules: 890,
        benchmarkJoules: 1050,
        stage: "forward_swing_contact",
        description: "Total kinetic launch energy delivered into the serve.",
        coachingFix: "Fixing shoulder dip + racket drop recovers +90 Joules = +11.8 mph serve speed.",
        color: "#38bdf8",
      },
    ];
  }

  if (norm.includes("backhand")) {
    return [
      {
        id: "ground_reaction",
        name: "1. Back Leg Loading",
        category: "gain",
        joules: 350,
        cumulativeJoules: 350,
        benchmarkJoules: 390,
        stage: "backswing",
        description: "Firm linear loading onto the outside foot during unit turn.",
        coachingFix: "Load 75% bodyweight onto back foot before stepping into the line of the ball.",
        color: "#10b981",
      },
      {
        id: "hip_leak",
        name: "2. Hip Over-Rotation Leak",
        category: "leak",
        joules: -40,
        cumulativeJoules: 310,
        benchmarkJoules: 380,
        stage: "forward_swing_contact",
        description: "Hips squared up too early, pulling the racket across instead of through the ball.",
        coachingFix: "Keep back hip closed sideways until after ball contact.",
        color: "#f43f5e",
      },
      {
        id: "torso_uncoil",
        name: "3. Core Rotational Drive",
        category: "gain",
        joules: 200,
        cumulativeJoules: 510,
        benchmarkJoules: 600,
        stage: "forward_swing_contact",
        description: "Elastic rotational thrust of the core and non-dominant side.",
        coachingFix: "Drive dominant and non-dominant obliques together through contact.",
        color: "#06b6d4",
      },
      {
        id: "extension_leak",
        name: "4. Cramped Extension Drag",
        category: "leak",
        joules: -25,
        cumulativeJoules: 485,
        benchmarkJoules: 590,
        stage: "forward_swing_contact",
        description: "Hitting arms pulled inward 5cm too close to chest at contact.",
        coachingFix: "Extend arms through an 18-inch hitting zone toward your target.",
        color: "#f43f5e",
      },
      {
        id: "whip_finish",
        name: "5. Racket Acceleration Whip",
        category: "gain",
        joules: 195,
        cumulativeJoules: 680,
        benchmarkJoules: 810,
        stage: "forward_swing_contact",
        description: "Clean upward-and-through kinetic whip into the ball strike.",
        coachingFix: "Finish high over opposite shoulder with fluid deceleration.",
        color: "#8b5cf6",
      },
      {
        id: "final_ball_energy",
        name: "6. Ball Impact Energy",
        category: "total",
        joules: 680,
        cumulativeJoules: 680,
        benchmarkJoules: 810,
        stage: "forward_swing_contact",
        description: "Net kinetic energy delivered to the tennis ball at contact.",
        coachingFix: "Fixing hip over-rotation + extension recovers +65 Joules = +8.5 mph exit speed.",
        color: "#38bdf8",
      },
    ];
  }

  // Default: Forehand
  return [
    {
      id: "ground_reaction",
      name: "1. Ground Drive (Legs)",
      category: "gain",
      joules: 380,
      cumulativeJoules: 380,
      benchmarkJoules: 420,
      stage: "backswing",
      description: "Explosive upward and forward thrust off court baseline.",
      coachingFix: "Bend knees 6° deeper to load 40 more Joules of ground spring.",
      color: "#10b981",
    },
    {
      id: "pelvis_leak",
      name: "2. Pelvis Leak (Early Open)",
      category: "leak",
      joules: -45,
      cumulativeJoules: 335,
      benchmarkJoules: 410,
      stage: "forward_swing_contact",
      description: "Hips opened 0.04s too early before torso could stretch.",
      coachingFix: "Delay pelvic rotation until the racket starts dropping into the slot.",
      color: "#f43f5e",
    },
    {
      id: "torso_coil",
      name: "3. Torso Coil Boost",
      category: "gain",
      joules: 190,
      cumulativeJoules: 525,
      benchmarkJoules: 620,
      stage: "forward_swing_contact",
      description: "Elastic rotational recoil of thoracic spine & obliques.",
      coachingFix: "Maximize X-Factor separation for +30 Joules of core snap.",
      color: "#06b6d4",
    },
    {
      id: "lag_leak",
      name: "4. Lag Slot Drag (Cramp)",
      category: "leak",
      joules: -30,
      cumulativeJoules: 495,
      benchmarkJoules: 610,
      stage: "forward_swing_contact",
      description: "Racket drop was 6cm shallow, losing gravitational sling.",
      coachingFix: "Let the racket head drop below hand height before forward drive.",
      color: "#f43f5e",
    },
    {
      id: "wrist_whip",
      name: "5. Forearm & Wrist Whip",
      category: "gain",
      joules: 210,
      cumulativeJoules: 705,
      benchmarkJoules: 840,
      stage: "forward_swing_contact",
      description: "Pronation snap and kinetic whip into the ball strike.",
      coachingFix: "Keep grip loose (4/10 tension) to maximize whip snap velocity.",
      color: "#8b5cf6",
    },
    {
      id: "final_ball_energy",
      name: "6. Ball Impact Energy",
      category: "total",
      joules: 705,
      cumulativeJoules: 705,
      benchmarkJoules: 840,
      stage: "forward_swing_contact",
      description: "Net kinetic energy delivered to the tennis ball at contact.",
      coachingFix: "Fixing the 2 leaks recovers +75 Joules = +9.4 mph ball exit speed.",
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
  const maxJoules = profile ? profile.waterfallJoules.racket * 1.25 : normMaxJoules(actionType);

  const totalLeaked = Math.abs(steps.filter((s) => s.joules < 0).reduce((acc, s) => acc + s.joules, 0));
  const finalEnergy = steps.find((s) => s.category === "total")?.joules || 705;
  const potentialRecoverableMph = profile?.estimatedRecoverableMph
    ? profile.estimatedRecoverableMph.toFixed(1)
    : ((totalLeaked / finalEnergy) * 78 * 0.95).toFixed(1);

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
