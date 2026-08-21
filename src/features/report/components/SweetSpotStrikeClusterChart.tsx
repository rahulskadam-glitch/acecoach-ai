"use client";

import { Crosshair } from "lucide-react";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { AnalysisReport } from "@/modules/analysis/types";

type Props = {
  actionType?: string;
  profile?: PlayerBiomechanicalProfile;
};

export default function SweetSpotStrikeClusterChart({ actionType = "forehand", profile }: Props) {
  const resolvedProfile = profile ?? computePlayerBiomechanicalProfile({} as AnalysisReport, actionType);

  // Modeled from video kinetic efficiency — not measured from per-shot stringbed contact tracking.
  const kineticEff = resolvedProfile.estimatedKineticEfficiencyPct;
  const smashFactor = Number((kineticEff / 100).toFixed(2));
  const sweetSpotPercent = Math.min(100, Math.round(smashFactor * 48));
  const powerLossPercent = Number(((1 - smashFactor) * 100).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
              <Crosshair className="h-3.5 w-3.5" />
              Sweet-Spot Zone
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-300">
              {actionType.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Impact zone reference vs. energy transfer coefficient (COR) — single-camera video does not track individual stringbed contact points.
          </p>
        </div>
      </div>

      {/* Main Stringbed Cluster Viewport */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Interactive 2D Stringbed Graphic */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col items-center justify-center">
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Stringbed Grid (16x19 Pattern)
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

              {/* Dampener at 6 o'clock */}
              <circle cx="150" cy="305" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Right 5 Cols: Biomechanical Impact Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          {/* Smash Factor KPI Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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

          {/* Center Sweet-Spot Ratio Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
              Sweet-Spot Impact Rate
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-300 font-mono">{sweetSpotPercent}%</span>
              <span className="text-xs text-rose-300 font-mono">-{powerLossPercent}% Power Leak</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
              Modeled from your video kinetic stability profile — not measured from per-shot stringbed contact tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
