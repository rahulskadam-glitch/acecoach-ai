"use client";

import { Crosshair, Sparkles } from "lucide-react";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { AnalysisReport } from "@/modules/analysis/types";

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
  profile?: PlayerBiomechanicalProfile;
};

export default function SweetSpotStrikeClusterChart({ actionType = "forehand", profile }: Props) {
  const isServe = actionType.toLowerCase().includes("serve");
  const resolvedProfile = profile ?? computePlayerBiomechanicalProfile({} as AnalysisReport, actionType);

  // Dynamic metrics derived from player video kinetic efficiency
  const kineticEff = resolvedProfile.estimatedKineticEfficiencyPct;
  const smashFactor = Number((kineticEff / 100).toFixed(2));
  const powerLossPercent = Number(((1 - smashFactor) * 100).toFixed(1));

  // Illustrative tour-reference impact zone only — this app has no racket/ball tracking,
  // so individual strike locations are never measured for the athlete. Do not add an
  // "athlete strikes" series here; there is no real per-shot data to plot.
  const proStrikes: StrikePoint[] = [
    { id: 1, x: 2, y: -2, powerPercentage: 99, spinRpm: isServe ? 3200 : 2950, quality: "sweet" },
    { id: 2, x: -3, y: 1, powerPercentage: 98, spinRpm: isServe ? 3150 : 2920, quality: "sweet" },
    { id: 3, x: 4, y: -4, powerPercentage: 97, spinRpm: isServe ? 3180 : 2940, quality: "sweet" },
    { id: 4, x: 1, y: -3, powerPercentage: 100, spinRpm: isServe ? 3250 : 3000, quality: "sweet" },
    { id: 5, x: -2, y: -1, powerPercentage: 99, spinRpm: isServe ? 3210 : 2980, quality: "sweet" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-5 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
              <Crosshair className="h-3.5 w-3.5" />
              Sweet Spot Reference
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-300">
              {actionType.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Sweet-Spot Precision & Smash Factor
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            This app does not track individual ball-strike locations — the stringbed diagram below shows the tour sweet-spot zone for reference only. The stats to the right are estimated from your swing&apos;s kinetic efficiency.
          </p>
        </div>
      </div>

      {/* Main Stringbed Cluster Viewport */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: 2D Stringbed Reference Graphic */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Stringbed Grid (16x19 Pattern)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Tour reference zone shown, not your measured contact points
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

              {/* Pro Strikes (Cyan Dots) — illustrative tour reference only */}
              {proStrikes.map((pt) => (
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
                {Math.round(smashFactor * 100)}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">{smashFactor}</span>
              <span className="text-xs text-slate-400">Tour Benchmark: <strong className="text-sky-300 font-mono">0.94</strong></span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${smashFactor * 100}%` }} />
            </div>
          </div>

          {/* Center Power-Loss Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
              Estimated Power Leak
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-300 font-mono">-{powerLossPercent}%</span>
              <span className="text-xs text-slate-400">vs. tour smash factor 0.94</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
              Modeled from your video&apos;s kinetic-efficiency profile, not from individual ball contacts — this app cannot see where the ball strikes the strings.
            </p>
          </div>

          {/* Root Diagnostic & Fix Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 backdrop-blur-xl ring-1 ring-cyan-500/30">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Strike Precision Coaching Insight</span>
            </div>
            <p className="mt-2 text-xs text-cyan-100 font-semibold leading-relaxed">
              A lower smash factor usually means contact is drifting away from the stringbed center, even when it isn&apos;t directly visible on camera.
            </p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {isServe
                ? "Work on a consistent, repeatable toss placement so contact lands in the same spot on the strings every time."
                : "Extend through the hitting zone and keep the contact point out in front of your body to center the ball on the strings."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
