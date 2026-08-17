"use client";

import {
  Activity,
  Clock,
  Crosshair,
  Flame,
  Gauge,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MOTION_STAGES, type MotionStage } from "../motion/motion-model";
import KineticPowerWaterfallChart from "./KineticPowerWaterfallChart";
import KineticTimingLagLadder from "./KineticTimingLagLadder";
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

type WeightStoryboardMoment = {
  id: string;
  stage: MotionStage;
  stepNum: number;
  title: string;
  cue: string;
  rearFoot: number;
  frontFoot: number;
  comShiftCm: number;
  status: "optimal" | "working" | "priority";
  athleteVerdict: string;
  proBenchmark: string;
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

// 4-Card Weight Transfer Storyboard
const WEIGHT_STORYBOARD: WeightStoryboardMoment[] = [
  {
    id: "moment_ready",
    stage: "ready",
    stepNum: 1,
    title: "1. Ready Stance",
    cue: "Balanced bounce on balls of feet",
    rearFoot: 50,
    frontFoot: 50,
    comShiftCm: 0,
    status: "optimal",
    athleteVerdict: "50/50 balanced platform",
    proBenchmark: "50/50 neutral split",
  },
  {
    id: "moment_load",
    stage: "unit_turn",
    stepNum: 2,
    title: "2. Coil & Loading",
    cue: "Store spring power on back leg",
    rearFoot: 75,
    frontFoot: 25,
    comShiftCm: -8,
    status: "optimal",
    athleteVerdict: "72% back foot load",
    proBenchmark: "75% deep coil load",
  },
  {
    id: "moment_strike",
    stage: "forward_swing_contact",
    stepNum: 3,
    title: "3. Strike & Drive ⚡",
    cue: "Drive full bodyweight into the ball",
    rearFoot: 15,
    frontFoot: 85,
    comShiftCm: 24,
    status: "priority",
    athleteVerdict: "65% front foot drive (mild fall back)",
    proBenchmark: "85% front foot commitment (+24cm)",
  },
  {
    id: "moment_reset",
    stage: "recovery",
    stepNum: 4,
    title: "4. Land & Reset",
    cue: "Instant balanced split for next ball",
    rearFoot: 50,
    frontFoot: 50,
    comShiftCm: 2,
    status: "optimal",
    athleteVerdict: "50/50 landing recovery",
    proBenchmark: "50/50 dynamic recovery",
  },
];

type ChartMode =
  | "weight_transfer"
  | "waterfall"
  | "strike_cluster"
  | "timing_ladder"
  | "velocity_sequence";

export default function KineticEnergyTransferStudio({
  currentStage,
  onSeekToStage,
  actionType = "forehand",
}: KineticEnergyTransferStudioProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("weight_transfer");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("link_wrist");
  const [comparisonMode, setComparisonMode] = useState<"both" | "athlete_only" | "pro_only">("both");

  const selectedLink = BIOMECHANICAL_LINKS.find((l) => l.id === selectedLinkId) ?? BIOMECHANICAL_LINKS[4];

  const totalEfficiency = Math.round(
    BIOMECHANICAL_LINKS.reduce((acc, l) => acc + l.athleteEfficiency, 0) / BIOMECHANICAL_LINKS.length
  );

  // Active Storyboard Moment
  const activeMoment = useMemo(() => {
    return WEIGHT_STORYBOARD.find((m) => m.stage === currentStage) ?? WEIGHT_STORYBOARD[2];
  }, [currentStage]);

  // Seesaw tilt angle calculation (-12 deg back to +14 deg forward)
  const seesawAngle = useMemo(() => {
    const diff = activeMoment.frontFoot - activeMoment.rearFoot; // -50 to +70
    return Math.round((diff / 70) * 14);
  }, [activeMoment]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Energy & Trajectory Suite
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Select any chart below to inspect energy flow, flight aerodynamics, and joint loads.
          </p>
        </div>

        {/* Global Power Flow Score */}
        <div className="flex items-center gap-3 rounded-2xl border border-ath-green/30 bg-ath-green/30 px-3.5 py-2 backdrop-blur">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ath-green/20 text-ath-green">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block">Kinetic Efficiency</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-ath-green">{totalEfficiency}%</span>
              <span className="text-[0.65rem] text-slate-400">(Tour: 96%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Tab Pro Analytics Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
          <button
            type="button"
            onClick={() => setChartMode("weight_transfer")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === "weight_transfer"
                ? "bg-ath-lime text-ath-navy shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Weight Seesaw</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("waterfall")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === "waterfall"
                ? "bg-ath-lime text-ath-navy shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Power Leak Waterfall</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("strike_cluster")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === "strike_cluster"
                ? "bg-ath-lime text-ath-navy shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>Sweet-Spot Cluster</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("timing_ladder")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === "timing_ladder"
                ? "bg-ath-lime text-ath-navy shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timing Lag Ladder</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode("velocity_sequence")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              chartMode === "velocity_sequence"
                ? "bg-ath-lime text-ath-navy shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Body Speed Curves</span>
          </button>
        </div>

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
                comparisonMode === "pro_only" ? "bg-sky-500 text-slate-950 font-bold" : "bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              Pro Benchmark
            </button>
          </div>
        ) : null}
      </div>

      {/* VIEW 1: INTUITIVE WEIGHT SHIFT SEESAW & 4-MOMENT STORYBOARD */}
      {chartMode === "weight_transfer" ? (
        <div className="space-y-6">
          {/* Main Visual Seesaw Stage Arena */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left 7 Cols: The Physical Tilting Seesaw & Foot Sensors */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-ath-green" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ath-green">
                    Live Weight Balance Scale
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Center-of-Mass Drive: <strong className="text-sky-300">{activeMoment.comShiftCm > 0 ? `+${activeMoment.comShiftCm}cm forward` : `${activeMoment.comShiftCm}cm back`}</strong>
                </span>
              </div>

              {/* Physical Tilting Seesaw Graphic */}
              <div className="relative my-4 aspect-[16/9] w-full flex items-center justify-center">
                <svg viewBox="0 0 500 240" className="h-full w-full select-none">
                  {/* Court Baseline Floor */}
                  <line x1="30" y1="210" x2="470" y2="210" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="470" y="225" fill="#64748b" fontSize="9" textAnchor="end" fontWeight="600">COURT BASELINE</text>

                  {/* Central Fulcrum / Pivot Stand */}
                  <polygon points="250,150 230,210 270,210" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" />
                  <circle cx="250" cy="150" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />

                  {/* Tilting Balance Seesaw Beam */}
                  <g transform={`rotate(${seesawAngle} 250 150)`} className="transition-transform duration-500 ease-out">
                    {/* Titanium Beam */}
                    <rect x="50" y="143" width="400" height="14" rx="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

                    {/* Left Pad (Back Foot Plate) */}
                    <g transform="translate(60, 110)">
                      <rect x="0" y="0" width="80" height="30" rx="6" fill="rgba(15,23,42,0.9)" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="40" y="14" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">BACK FOOT</text>
                      <text x="40" y="26" fill="#fbbf24" fontSize="11" fontWeight="900" textAnchor="middle">{activeMoment.rearFoot}%</text>
                    </g>

                    {/* Right Pad (Front Foot Plate) */}
                    <g transform="translate(360, 110)">
                      <rect x="0" y="0" width="80" height="30" rx="6" fill="rgba(15,23,42,0.9)" stroke="#06b6d4" strokeWidth="1.5" />
                      <text x="40" y="14" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">FRONT FOOT</text>
                      <text x="40" y="26" fill="#22d3ee" fontSize="11" fontWeight="900" textAnchor="middle">{activeMoment.frontFoot}%</text>
                    </g>

                    {/* Dynamic Rolling Center-of-Mass (CoM) Energy Sphere */}
                    <circle
                      cx={250 + (activeMoment.frontFoot - activeMoment.rearFoot) * 1.8}
                      cy="134"
                      r="12"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      style={{ filter: "drop-shadow(0 0 10px #38bdf8)" }}
                    />
                  </g>
                </svg>
              </div>

              {/* Dynamic Insole Pressure Sole Indicators */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ath-warn/20 text-ath-warn font-black text-xs">
                    👟 L
                  </div>
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase text-slate-400 block">Rear Foot Load</span>
                    <span className="text-sm font-black text-ath-warn">{activeMoment.rearFoot}% Weight</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs">
                    👟 R
                  </div>
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase text-slate-400 block">Front Foot Drive</span>
                    <span className="text-sm font-black text-cyan-300">{activeMoment.frontFoot}% Drive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Active Moment Coaching Telemetry */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="rounded-full bg-ath-green/20 px-3 py-1 text-xs font-extrabold uppercase text-ath-green">
                    Phase {activeMoment.stepNum} of 4
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Moment Details</span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-white">{activeMoment.title}</h3>
                <p className="mt-1 text-xs text-slate-300 font-medium leading-relaxed">{activeMoment.cue}</p>

                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                    <span className="text-slate-400 font-semibold">Your Measured Shift:</span>
                    <span className={`font-bold ${activeMoment.status === "priority" ? "text-rose-300" : "text-ath-green"}`}>
                      {activeMoment.athleteVerdict}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                    <span className="text-slate-400 font-semibold">Pro Target Benchmark:</span>
                    <span className="font-bold text-sky-300">{activeMoment.proBenchmark}</span>
                  </div>
                </div>
              </div>

              {/* Actionable Weight Coaching Tip */}
              <div className="rounded-2xl border border-ath-green/30 bg-ath-green/30 p-4 backdrop-blur ring-1 ring-ath-green/30">
                <div className="flex items-center gap-2 text-ath-green font-bold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Weight Transfer Key</span>
                </div>
                <p className="mt-1.5 text-xs text-ath-green/15 font-medium leading-relaxed">
                  {activeMoment.status === "priority"
                    ? "Commit 85% of your weight forward onto your front shoe through impact. Leaning back robs you of free pace and depth."
                    : "Excellent platform stability! Keep maintaining strong balanced foot pressure throughout the swing."}
                </p>
              </div>
            </div>
          </div>

          {/* 4-Card Storyboard Timeline */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WEIGHT_STORYBOARD.map((moment) => {
              const isCurrent = moment.stage === currentStage;
              return (
                <button
                  key={moment.id}
                  type="button"
                  onClick={() => onSeekToStage(moment.stage)}
                  className={`group relative flex flex-col justify-between rounded-2xl p-4 text-left transition border ${
                    isCurrent
                      ? "border-ath-green bg-ath-green/40 shadow-lg shadow-ath-green/20 ring-2 ring-ath-green/40"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.65rem] font-bold uppercase text-slate-400">Step {moment.stepNum}</span>
                      <span className={`h-2 w-2 rounded-full ${moment.status === "priority" ? "bg-rose-400" : "bg-ath-green"}`} />
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-white">{moment.title}</h4>
                    <p className="mt-1 text-[0.68rem] text-slate-400 leading-snug">{moment.cue}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[0.7rem]">
                    <span className="text-ath-warn font-bold">{moment.rearFoot}% Rear</span>
                    <span className="text-slate-500 font-bold">➔</span>
                    <span className="text-cyan-300 font-bold">{moment.frontFoot}% Front</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

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
              <span className="text-xs text-sky-400 font-mono">
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

      {/* Synchronized Stage Timeline Scrubber */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center justify-between mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Shot Phases</span>
          <span className="text-sky-400">Selected: {MOTION_STAGES.find((s) => s.id === currentStage)?.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {MOTION_STAGES.map((s, idx) => {
            const isSelected = s.id === currentStage;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSeekToStage(s.id)}
                className={`rounded-xl p-2.5 text-center transition ${
                  isSelected
                    ? "bg-ath-green text-slate-950 font-bold shadow-lg shadow-ath-green/20 ring-2 ring-ath-green"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-[0.62rem] font-bold uppercase block opacity-75">{idx + 1}.</span>
                <span className="text-xs font-semibold leading-snug">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
