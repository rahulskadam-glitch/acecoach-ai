"use client";

import { Crosshair, Sparkles } from "lucide-react";
import { useState } from "react";

type StrikePoint = {
  id: number;
  x: number; // mm offset from sweet spot center (-50 to +50)
  y: number; // mm offset from sweet spot center (-60 to +60)
  powerPercentage: number; // 70 to 100%
  spinRpm: number;
  quality: "sweet" | "near" | "off_center";
};

type Props = {
  actionType?: string;
};

// 20 Sample Strokes from the match session
const ATHLETE_STRIKES: StrikePoint[] = [
  { id: 1, x: 8, y: -12, powerPercentage: 94, spinRpm: 2750, quality: "sweet" },
  { id: 2, x: 14, y: -18, powerPercentage: 88, spinRpm: 2600, quality: "near" },
  { id: 3, x: 18, y: -22, powerPercentage: 82, spinRpm: 2450, quality: "near" },
  { id: 4, x: -6, y: -10, powerPercentage: 96, spinRpm: 2890, quality: "sweet" },
  { id: 5, x: 22, y: -28, powerPercentage: 78, spinRpm: 2300, quality: "off_center" },
  { id: 6, x: 12, y: -15, powerPercentage: 90, spinRpm: 2680, quality: "near" },
  { id: 7, x: 4, y: -8, powerPercentage: 98, spinRpm: 2950, quality: "sweet" },
  { id: 8, x: 16, y: -24, powerPercentage: 84, spinRpm: 2500, quality: "near" },
  { id: 9, x: 26, y: -32, powerPercentage: 72, spinRpm: 2180, quality: "off_center" },
  { id: 10, x: 10, y: -14, powerPercentage: 92, spinRpm: 2720, quality: "near" },
  { id: 11, x: -2, y: -6, powerPercentage: 99, spinRpm: 3020, quality: "sweet" },
  { id: 12, x: 15, y: -20, powerPercentage: 86, spinRpm: 2580, quality: "near" },
  { id: 13, x: 20, y: -26, powerPercentage: 80, spinRpm: 2400, quality: "near" },
  { id: 14, x: 6, y: -10, powerPercentage: 95, spinRpm: 2820, quality: "sweet" },
  { id: 15, x: 28, y: -36, powerPercentage: 68, spinRpm: 2100, quality: "off_center" },
  { id: 16, x: 11, y: -16, powerPercentage: 91, spinRpm: 2700, quality: "near" },
  { id: 17, x: 2, y: -4, powerPercentage: 100, spinRpm: 3080, quality: "sweet" },
  { id: 18, x: 17, y: -23, powerPercentage: 85, spinRpm: 2520, quality: "near" },
  { id: 19, x: 24, y: -30, powerPercentage: 75, spinRpm: 2250, quality: "off_center" },
  { id: 20, x: 9, y: -13, powerPercentage: 93, spinRpm: 2780, quality: "sweet" },
];

const PRO_STRIKES: StrikePoint[] = [
  { id: 1, x: 2, y: -2, powerPercentage: 99, spinRpm: 3200, quality: "sweet" },
  { id: 2, x: -3, y: 1, powerPercentage: 98, spinRpm: 3150, quality: "sweet" },
  { id: 3, x: 4, y: -4, powerPercentage: 97, spinRpm: 3180, quality: "sweet" },
  { id: 4, x: 1, y: -3, powerPercentage: 100, spinRpm: 3250, quality: "sweet" },
  { id: 5, x: -2, y: -1, powerPercentage: 99, spinRpm: 3210, quality: "sweet" },
  { id: 6, x: 5, y: -6, powerPercentage: 96, spinRpm: 3120, quality: "sweet" },
  { id: 7, x: 0, y: 0, powerPercentage: 100, spinRpm: 3280, quality: "sweet" },
  { id: 8, x: 3, y: -3, powerPercentage: 98, spinRpm: 3190, quality: "sweet" },
  { id: 9, x: -4, y: 2, powerPercentage: 97, spinRpm: 3140, quality: "sweet" },
  { id: 10, x: 2, y: -5, powerPercentage: 98, spinRpm: 3220, quality: "sweet" },
];

export default function SweetSpotStrikeClusterChart({ actionType = "forehand" }: Props) {
  const [viewBenchmark, setViewBenchmark] = useState<"athlete" | "pro" | "compare">("compare");
  const [hoveredPoint, setHoveredPoint] = useState<StrikePoint | null>(null);

  // Metrics
  const smashFactor = 0.84; // Energy Coefficient of Restitution
  const sweetSpotPercent = 35; // 35% in center sweet spot
  const powerLossPercent = 14.5; // 14.5% power loss from off-center hits

  const isServe = actionType.toLowerCase().includes("serve");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-5 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
              <Crosshair className="h-3.5 w-3.5" />
              Impact Precision Heatmap
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-300">
              {actionType.replace("_", " ").toUpperCase()} · 20-Shot Cluster
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Sweet-Spot Precision & Smash Factor
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Impact cluster distribution across stringbed vs. energy transfer coefficient (COR).
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewBenchmark("athlete")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewBenchmark === "athlete" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            Your Hits (20)
          </button>
          <button
            type="button"
            onClick={() => setViewBenchmark("pro")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewBenchmark === "pro" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            Pro Benchmark
          </button>
          <button
            type="button"
            onClick={() => setViewBenchmark("compare")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewBenchmark === "compare" ? "bg-white text-slate-950 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            Dual Overlay
          </button>
        </div>
      </div>

      {/* Main Stringbed Cluster Viewport */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Interactive 2D Stringbed Graphic */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Stringbed Grid (16x19 Pattern)
            </span>
            <span className="text-xs text-amber-300 font-mono">
              Cluster Bias: <span className="font-bold">+18.6mm Upper Outer</span>
            </span>
          </div>

          {/* Authentic Racket Head Stringbed SVG */}
          <div className="relative aspect-[3/4] w-full max-w-[340px]">
            <svg viewBox="0 0 300 400" className="h-full w-full select-none">
              <defs>
                {/* Sweet Spot Glow */}
                <radialGradient id="sweetSpotGlow" cx="50%" cy="45%" r="40%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>

                {/* Heatmap Density Blob */}
                <radialGradient id="athleteClusterGlow" cx="56%" cy="38%" r="35%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>

              {/* Racket Graphite Hoop Frame */}
              <ellipse cx="150" cy="180" rx="115" ry="155" fill="rgba(15,23,42,0.85)" stroke="#e2e8f0" strokeWidth="6" />
              <ellipse cx="150" cy="180" rx="108" ry="148" fill="rgba(10,15,30,0.95)" stroke="#38bdf8" strokeWidth="2" />

              {/* Sweet Spot Core Halo (Ideal 40mm zone) */}
              <ellipse cx="150" cy="170" rx="45" ry="55" fill="url(#sweetSpotGlow)" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />

              {/* 16 Longitudinal Main Strings */}
              {[-80, -68, -56, -44, -32, -20, -8, 8, 20, 32, 44, 56, 68, 80].map((x) => (
                <line key={`main-${x}`} x1={150 + x} y1="35" x2={150 + x} y2="325" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
              ))}

              {/* 19 Cross Strings */}
              {[-120, -105, -90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120].map((y) => (
                <line key={`cross-${y}`} x1="45" y1={180 + y} x2="255" y2={180 + y} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
              ))}

              {/* Sweet Spot Center Reticle Target */}
              <circle cx="150" cy="170" r="18" fill="none" stroke="#10b981" strokeWidth="2" />
              <line x1="130" y1="170" x2="170" y2="170" stroke="#10b981" strokeWidth="1.5" />
              <line x1="150" y1="150" x2="150" y2="190" stroke="#10b981" strokeWidth="1.5" />
              <text x="150" y="142" fill="#10b981" fontSize="8" fontWeight="800" textAnchor="middle">
                SWEET SPOT (0,0)
              </text>

              {/* Athlete Strike Dispersion Blob */}
              {(viewBenchmark === "athlete" || viewBenchmark === "compare") && (
                <ellipse cx="168" cy="146" rx="42" ry="36" fill="url(#athleteClusterGlow)" />
              )}

              {/* Pro Strikes (Cyan Dots) */}
              {(viewBenchmark === "pro" || viewBenchmark === "compare") &&
                PRO_STRIKES.map((pt) => (
                  <circle
                    key={`pro-${pt.id}`}
                    cx={150 + pt.x * 1.8}
                    cy={170 + pt.y * 1.8}
                    r="4"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    opacity="0.85"
                  />
                ))}

              {/* Athlete Strikes (Amber/Rose Dots) */}
              {(viewBenchmark === "athlete" || viewBenchmark === "compare") &&
                ATHLETE_STRIKES.map((pt) => {
                  const cx = 150 + pt.x * 1.8;
                  const cy = 170 + pt.y * 1.8;
                  const isHovered = hoveredPoint?.id === pt.id;

                  return (
                    <g
                      key={`ath-${pt.id}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered ? "7" : "4.5"}
                        fill={pt.quality === "sweet" ? "#10b981" : pt.quality === "near" ? "#fbbf24" : "#f43f5e"}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

              {/* Dampener at 6 o'clock */}
              <circle cx="150" cy="305" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Right 5 Cols: Biomechanical Impact Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          {/* Smash Factor KPI Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                Smash Factor (COR Efficiency)
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                {smashFactor * 100}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{smashFactor}</span>
              <span className="text-xs text-slate-400">Tour Benchmark: <strong className="text-sky-300">0.92</strong></span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${smashFactor * 100}%` }} />
            </div>
          </div>

          {/* Center Sweet-Spot Ratio Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
              Sweet-Spot Impact Rate
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-300">{sweetSpotPercent}%</span>
              <span className="text-xs text-rose-300">-{powerLossPercent}% Power Leak</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
              7 of 20 shots hit within the true sweet spot. 13 shots drifted into the upper-outer quadrant.
            </p>
          </div>

          {/* Root Diagnostic & Fix Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 backdrop-blur-xl ring-1 ring-cyan-500/30">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Strike Precision Coaching Insight</span>
            </div>
            <p className="mt-2 text-xs text-cyan-100 font-semibold leading-relaxed">
              {isServe
                ? "Toss is drifting 3 inches too far to the right, forcing off-center contact near the frame edge."
                : "Drifting hits toward the top tip happens when contact occurs 4 inches too close to your body."}
            </p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {isServe
                ? "Place your toss at 12:30 on the clock face to make contact dead-center in your power slot."
                : "Extend your hitting arm forward (+16cm reach) at contact to align the ball squarely in the center strings!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
