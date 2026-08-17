"use client";

import { Crosshair, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProArchetype } from "../motion/pro-archetypes";
import { MOTION_STAGES, type MotionStage, type Point } from "../motion/motion-model";

type RacketPathTrajectoryChartProps = {
  activeArchetype: ProArchetype;
  currentStage: MotionStage;
  onSeekToStage: (stage: MotionStage) => void;
  dominantSide?: "left" | "right";
  athleteSwingPath: Point[];
  proSwingPath: Point[];
};

type TrajectoryMetric = {
  label: string;
  athleteValue: string;
  proValue: string;
  delta: string;
  status: "optimal" | "warning" | "priority";
  explanation: string;
};

export default function RacketPathTrajectoryChart({
  activeArchetype,
  currentStage,
  onSeekToStage,
  athleteSwingPath,
  proSwingPath,
}: RacketPathTrajectoryChartProps) {
  const [hoveredPhase, setHoveredPhase] = useState<MotionStage | null>(null);

  // Normalized coordinate bounds for SVG trajectory chart (0-500 X, 0-350 Y)
  const chartWidth = 500;
  const chartHeight = 320;

  // Scale point to chart coordinate space
  const scalePoint = (p: Point, xOffset = 0, yOffset = 0) => ({
    x: Math.round((p.x * 0.75 + 0.12 + xOffset) * chartWidth),
    y: Math.round((p.y * 0.75 + 0.12 + yOffset) * chartHeight),
  });

  const athleteChartPoints = useMemo(
    () => athleteSwingPath.map((p) => scalePoint(p, 0.02, 0.02)),
    [athleteSwingPath]
  );

  const proChartPoints = useMemo(
    () => proSwingPath.map((p) => scalePoint(p, 0, 0)),
    [proSwingPath]
  );

  // Trajectory Biomechanical Delta Diagnostics
  const trajectoryMetrics: TrajectoryMetric[] = useMemo(() => [
    {
      label: "Takeback Loop Apex",
      athleteValue: "1.52m height",
      proValue: "1.68m high loop",
      delta: "Δ -16cm Coiled Height",
      status: "warning",
      explanation: "Pro raises racket tip higher on preparation to build gravitational drop momentum.",
    },
    {
      label: "Slot Drop Lag Depth",
      athleteValue: "0.78m shallow drop",
      proValue: "0.62m deep lag slot",
      delta: "Δ +16cm Deeper Slot",
      status: "priority",
      explanation: "Pro drops racket 16cm below contact height to maximize low-to-high topspin brush trajectory.",
    },
    {
      label: "Strike Distance in Front",
      athleteValue: "32cm in front of hip",
      proValue: "48cm forward reach",
      delta: "Δ +16cm Out in Front",
      status: "priority",
      explanation: "Pro strikes 16cm further out in front, utilizing linear bodyweight into ball impact.",
    },
    {
      label: "Attack Angle (Lift Vector)",
      athleteValue: "+4° linear push",
      proValue: "+14° steep brush",
      delta: "Δ +10° Topspin Angle",
      status: "optimal",
      explanation: "Steeper upward swing path generates heavy topspin RPM with clean net clearance.",
    },
    {
      label: "Peak Tip Speed at Strike",
      athleteValue: "68 mph (109 km/h)",
      proValue: "84 mph (135 km/h)",
      delta: "Δ +16 mph Tip Speed",
      status: "warning",
      explanation: "Faster kinetic whip acceleration through the strike window.",
    },
  ], []);

  // Active highlighted phase
  const activePhase = hoveredPhase ?? currentStage;
  const activePhaseIndex = MOTION_STAGES.findIndex((s) => s.id === activePhase);

  return (
    <div className="space-y-5 rounded-2xl border border-white/15 bg-slate-950/90 p-5 text-white backdrop-blur-2xl sm:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-300 ring-1 ring-sky-500/30">
              <TrendingUp className="h-3.5 w-3.5" />
              Spatial Racket Trajectory Analysis
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              Player vs. {activeArchetype.name}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            3D Racket Path Motion Chart
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Spatial trajectory comparison across takeback loop, slot drop depth, forward contact strike, and windshield-wiper finish.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="font-semibold text-emerald-300">Your Measured Path</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeArchetype.themeColor }} />
            <span className="font-semibold" style={{ color: activeArchetype.themeColor }}>
              {activeArchetype.name} (Pro Benchmark)
            </span>
          </div>
        </div>
      </div>

      {/* Main Coordinate Trajectory Graph & HUD */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left 8 Cols: Interactive Spatial Trajectory Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950 to-black p-4 lg:col-span-8 shadow-inner">
          <div className="flex items-center justify-between text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Spatial Coordinates (X: Court Depth / Reach ➔ Y: Elevation Height)</span>
            <span className="text-sky-400">Phase: {MOTION_STAGES.find((s) => s.id === activePhase)?.label}</span>
          </div>

          {/* SVG Trajectory Chart */}
          <div className="relative aspect-[16/10] w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full select-none"
            >
              <defs>
                {/* Background Grid Pattern */}
                <pattern id="chartGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>

                <linearGradient id="proPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor={activeArchetype.themeColor} />
                </linearGradient>

                <linearGradient id="athletePathGradChart" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="60%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width={chartWidth} height={chartHeight} fill="url(#chartGrid)" />

              {/* Spatial Axis Guidelines */}
              <line x1="40" y1="280" x2="460" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="40" y1="40" x2="40" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <text x="465" y="284" fill="#64748b" fontSize="9" fontWeight="bold">Front (+X Reach)</text>
              <text x="32" y="32" fill="#64748b" fontSize="9" fontWeight="bold">Apex (+Y)</text>

              {/* Optimal Strike Corridor Box */}
              <rect
                x="150"
                y="90"
                width="120"
                height="110"
                fill="rgba(56,189,248,0.08)"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                rx="8"
              />
              <text x="156" y="106" fill="#38bdf8" fontSize="8" fontWeight="bold">
                PRO STRIKE WINDOW (48cm in front)
              </text>

              {/* PRO SWING PATH (Golden Benchmark Curve) */}
              <path
                d={proChartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke="url(#proPathGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#glowEffect)"
              />
              {proChartPoints.map((p, i) => {
                const stage = MOTION_STAGES[i];
                const stageLabel = stage ? stage.label.split(" ")[0] : `P${i + 1}`;
                const isCurrent = i === activePhaseIndex;
                return (
                  <g
                    key={`pro-node-${i}`}
                    className="cursor-pointer"
                    onClick={() => {
                      if (stage) onSeekToStage(stage.id);
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isCurrent ? "7" : "4.5"}
                      fill={isCurrent ? "#ffffff" : activeArchetype.themeColor}
                      stroke="#ffffff"
                      strokeWidth={isCurrent ? "2.5" : "1.5"}
                    />
                    {isCurrent ? (
                      <circle cx={p.x} cy={p.y} r="12" fill="none" stroke={activeArchetype.themeColor} strokeWidth="1.5" opacity="0.8" className="animate-ping" />
                    ) : null}
                    <text x={p.x + 8} y={p.y - 6} fill="#94a3b8" fontSize="8" fontWeight="bold">
                      Pro {stageLabel}
                    </text>
                  </g>
                );
              })}

              {/* ATHLETE SWING PATH (Measured Arc) */}
              <path
                d={athleteChartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke="url(#athletePathGradChart)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="5 3"
              />
              {athleteChartPoints.map((p, i) => {
                const stage = MOTION_STAGES[i];
                const stageLabel = stage ? stage.label.split(" ")[0] : `P${i + 1}`;
                const isCurrent = i === activePhaseIndex;
                return (
                  <g
                    key={`ath-node-${i}`}
                    className="cursor-pointer"
                    onClick={() => {
                      if (stage) onSeekToStage(stage.id);
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isCurrent ? "6.5" : "4"}
                      fill={isCurrent ? "#fbbf24" : "#10b981"}
                      stroke="#ffffff"
                      strokeWidth={isCurrent ? "2" : "1.2"}
                    />
                    <text x={p.x + 8} y={p.y + 12} fill="#10b981" fontSize="8" fontWeight="bold">
                      You {stageLabel}
                    </text>
                  </g>
                );
              })}

              {/* Active Spatial Delta Vector Line */}
              {activePhaseIndex >= 0 && athleteChartPoints[activePhaseIndex] && proChartPoints[activePhaseIndex] ? (
                <g>
                  <line
                    x1={athleteChartPoints[activePhaseIndex].x}
                    y1={athleteChartPoints[activePhaseIndex].y}
                    x2={proChartPoints[activePhaseIndex].x}
                    y2={proChartPoints[activePhaseIndex].y}
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <rect
                    x={(athleteChartPoints[activePhaseIndex].x + proChartPoints[activePhaseIndex].x) / 2 - 25}
                    y={(athleteChartPoints[activePhaseIndex].y + proChartPoints[activePhaseIndex].y) / 2 - 10}
                    width="50"
                    height="16"
                    rx="4"
                    fill="rgba(244,63,94,0.95)"
                  />
                  <text
                    x={(athleteChartPoints[activePhaseIndex].x + proChartPoints[activePhaseIndex].x) / 2}
                    y={(athleteChartPoints[activePhaseIndex].y + proChartPoints[activePhaseIndex].y) / 2 + 1}
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    Δ VARIANCE
                  </text>
                </g>
              ) : null}
            </svg>
          </div>

          {/* Quick Stage Timeline Selector */}
          <div className="mt-3 grid grid-cols-6 gap-1.5 border-t border-white/10 pt-3">
            {MOTION_STAGES.map((s, idx) => {
              const isSelected = s.id === activePhase;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSeekToStage(s.id)}
                  onMouseEnter={() => setHoveredPhase(s.id)}
                  onMouseLeave={() => setHoveredPhase(null)}
                  className={`rounded-lg py-1 text-center transition text-[0.65rem] font-bold ${
                    isSelected
                      ? "bg-sky-500 text-slate-950 font-extrabold shadow-md shadow-sky-500/20"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {idx + 1}. {s.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Trajectory Metric Delta Cards */}
        <div className="space-y-2.5 lg:col-span-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <Crosshair className="h-3.5 w-3.5 text-sky-400" />
            <span>Biomechanical Trajectory Metrics</span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {trajectoryMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-sky-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{metric.label}</span>
                  <span
                    className={`font-mono text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                      metric.status === "optimal"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : metric.status === "priority"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {metric.delta}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[0.7rem] text-slate-300">
                  <span>You: <strong className="text-emerald-300">{metric.athleteValue}</strong></span>
                  <span>Pro: <strong className="text-sky-300">{metric.proValue}</strong></span>
                </div>

                <p className="mt-1 text-[0.65rem] text-slate-400 leading-tight">
                  {metric.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
