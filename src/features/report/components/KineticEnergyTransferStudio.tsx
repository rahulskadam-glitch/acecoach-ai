"use client";

import {
  Flame,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { MOTION_STAGES, type MotionStage } from "../motion/motion-model";
import KineticPowerWaterfallChart from "./KineticPowerWaterfallChart";
import KineticTimingLagLadder from "./KineticTimingLagLadder";
import StagePhaseScrubber from "./StagePhaseScrubber";
import SweetSpotStrikeClusterChart from "./SweetSpotStrikeClusterChart";

type KineticEnergyTransferStudioProps = {
  currentStage: MotionStage;
  onSeekToStage: (stage: MotionStage) => void;
  actionType?: string;
};

type BiomechanicalLink = {
  id: string;
  name: string;
  simpleAction: string;
  peakStage: MotionStage;
  peakTime: number; // in seconds
  athletePeakVelocity: number; // deg/s
  proPeakVelocity: number; // deg/s
  athleteEfficiency: number; // e.g. 72%
  proEfficiency: number; // e.g. 96%
  lossReason: string;
  coachingFix: string;
  color: string;
  glowColor: string;
};

// 5 Main Body Parts with everyday coaching language
const BIOMECHANICAL_LINKS: BiomechanicalLink[] = [
  {
    id: "link_legs",
    name: "1. Legs & Feet",
    simpleAction: "Push off the ground",
    peakStage: "backswing",
    peakTime: 0.85,
    athletePeakVelocity: 290,
    proPeakVelocity: 380,
    athleteEfficiency: 76,
    proEfficiency: 95,
    lossReason: "Shallow knee bend reduces power from the ground.",
    coachingFix: "Bend your knees deeper so you can push up explosively off the court.",
    color: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "link_hips",
    name: "2. Hips",
    simpleAction: "Turn hips forward first",
    peakStage: "forward_swing_contact",
    peakTime: 1.08,
    athletePeakVelocity: 340,
    proPeakVelocity: 460,
    athleteEfficiency: 68,
    proEfficiency: 94,
    lossReason: "Hips and shoulders turn together instead of hips leading.",
    coachingFix: "Turn your hips toward the net first, just before your upper body swings.",
    color: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.4)",
  },
  {
    id: "link_torso",
    name: "3. Chest & Torso",
    simpleAction: "Uncoil upper body",
    peakStage: "forward_swing_contact",
    peakTime: 1.15,
    athletePeakVelocity: 510,
    proPeakVelocity: 690,
    athleteEfficiency: 62,
    proEfficiency: 92,
    lossReason: "Upper body uncoils too early, losing core rotational spring power.",
    coachingFix: "Keep your chest turned sideways until your hips start pulling it forward.",
    color: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.4)",
  },
  {
    id: "link_shoulder",
    name: "4. Arm & Shoulder",
    simpleAction: "Pull racket into hitting slot",
    peakStage: "forward_swing_contact",
    peakTime: 1.22,
    athletePeakVelocity: 780,
    proPeakVelocity: 1120,
    athleteEfficiency: 70,
    proEfficiency: 97,
    lossReason: "Arm pulls forward without lagging behind, shortening the swing whip.",
    coachingFix: "Let your racket head drop back and lag behind your hand like a whip.",
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "link_wrist",
    name: "5. Wrist & Racket",
    simpleAction: "Whip racket through the ball",
    peakStage: "forward_swing_contact",
    peakTime: 1.28,
    athletePeakVelocity: 1140,
    proPeakVelocity: 1580,
    athleteEfficiency: 60,
    proEfficiency: 99,
    lossReason: "Tense wrist slows down racket head acceleration through the ball.",
    coachingFix: "Hold a relaxed grip (4 out of 10) so the racket head snaps forward freely at impact.",
    color: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.4)",
  },
];

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
}: KineticEnergyTransferStudioProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("waterfall");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("link_wrist");
  const [comparisonMode, setComparisonMode] = useState<"both" | "athlete_only" | "pro_only">("both");

  const selectedLink = BIOMECHANICAL_LINKS.find((l) => l.id === selectedLinkId) ?? BIOMECHANICAL_LINKS[4];

  const totalEfficiency = Math.round(
    BIOMECHANICAL_LINKS.reduce((acc, l) => acc + l.athleteEfficiency, 0) / BIOMECHANICAL_LINKS.length
  );

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
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-slate-300">Illustrative</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Typical energy-flow patterns for this stroke type — not measured from your video.
          </p>
        </div>

        {/* Illustrative Power Flow Score */}
        <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur sm:w-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block">Example Kinetic Efficiency</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-300">{totalEfficiency}%</span>
              <span className="text-[0.65rem] text-slate-400">(Tour example: 96%)</span>
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

      {/* VIEW 2: ⚡ KINETIC POWER LEAK WATERFALL (TRACKMAN) */}
      {chartMode === "waterfall" ? (
        <KineticPowerWaterfallChart
          currentStage={currentStage}
          onSeekToStage={onSeekToStage}
          actionType={actionType}
        />
      ) : null}

      {/* VIEW 4: 🎯 SWEET-SPOT STRIKE CLUSTER (HAWK-EYE) */}
      {chartMode === "strike_cluster" ? (
        <SweetSpotStrikeClusterChart actionType={actionType} />
      ) : null}

      {/* VIEW 7: ⏱️ KINETIC TIMING LAG LADDER (K-VEST) */}
      {chartMode === "timing_ladder" ? (
        <KineticTimingLagLadder actionType={actionType} />
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
                Whippy Peak: <strong className="text-white">1,580°/s at 1.28s</strong>
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
                {BIOMECHANICAL_LINKS.map((link) => {
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
