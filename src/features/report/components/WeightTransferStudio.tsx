"use client";

import { Scale, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { MotionStage } from "../motion/motion-model";

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

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { AnalysisReport } from "@/modules/analysis/types";

export default function WeightTransferStudio({
  currentStage,
  onSeekToStage,
  profile,
  actionType = "forehand",
}: {
  currentStage: MotionStage;
  onSeekToStage: (stage: MotionStage) => void;
  profile?: PlayerBiomechanicalProfile;
  actionType?: string;
}) {
  const storyboard = useMemo(() => {
    const resolvedProfile = profile ?? computePlayerBiomechanicalProfile({} as AnalysisReport, actionType);
    return resolvedProfile.weightTransferPhases.map((phase, idx) => ({
      id: `moment_${phase.stage}`,
      stage: phase.stage,
      stepNum: idx + 1,
      title: `${idx + 1}. ${phase.stageLabel}`,
      cue: phase.balanceStatus === "loaded_rear"
        ? "Store spring power on back leg"
        : phase.balanceStatus === "loaded_front"
        ? "Drive full bodyweight into the ball"
        : "Balanced platform on balls of feet",
      rearFoot: phase.rearFootPct,
      frontFoot: phase.frontFootPct,
      comShiftCm: Math.round(phase.comDisplacementX * 30),
      status: (phase.balanceStatus === "loaded_front" && phase.frontFootPct < 70 ? "priority" : "optimal") as "optimal" | "working" | "priority",
      athleteVerdict: `${phase.rearFootPct}/${phase.frontFootPct} weight split`,
      proBenchmark: phase.balanceStatus === "loaded_front" ? "15/85 front drive" : phase.balanceStatus === "loaded_rear" ? "75/25 deep load" : "50/50 split",
    }));
  }, [profile, actionType]);

  const activeMoment = useMemo(() => {
    return storyboard.find((m) => m.stage === currentStage) ?? storyboard[Math.min(2, storyboard.length - 1)];
  }, [storyboard, currentStage]);

  // Seesaw tilt angle calculation (-12 deg back to +14 deg forward)
  const seesawAngle = useMemo(() => {
    const diff = activeMoment.frontFoot - activeMoment.rearFoot;
    return Math.round((diff / 70) * 14);
  }, [activeMoment]);

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-ath-navy p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <p className="text-xs text-slate-400">Modeled from your torso coil and knee-load angles — not tracked center-of-mass position.</p>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5">
        <span className="text-[0.68rem] font-semibold text-slate-400">Stage</span>
        <select
          aria-label="Select shot stage"
          value={currentStage}
          onChange={(event) => onSeekToStage(event.target.value as MotionStage)}
          className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
        >
          {storyboard.map((moment) => (
            <option key={moment.id} value={moment.stage} className="bg-slate-900 text-white">
              {moment.title}
            </option>
          ))}
        </select>
      </label>

      {/* Main Visual Seesaw Stage Arena */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: The Physical Tilting Seesaw */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-ath-green" />
              <span className="text-xs font-bold uppercase tracking-wider text-ath-green">
                Live Weight Balance Scale
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Center-of-Mass Drive: <strong className="text-ath-sky">{activeMoment.comShiftCm > 0 ? `+${activeMoment.comShiftCm}cm forward` : `${activeMoment.comShiftCm}cm back`}</strong>
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
        </div>

        {/* Right 5 Cols: Active Moment Coaching Telemetry */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="rounded-full bg-ath-green/20 px-3 py-1 text-xs font-extrabold uppercase text-ath-green">
                Phase {activeMoment.stepNum} of {storyboard.length}
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
                <span className="font-bold text-ath-sky">{activeMoment.proBenchmark}</span>
              </div>
            </div>
          </div>

          {/* Actionable Weight Coaching Tip */}
          <div className="rounded-2xl border border-ath-green/30 bg-ath-green/10 p-4 backdrop-blur ring-1 ring-ath-green/30">
            <div className="flex items-center gap-2 text-ath-green font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Weight Transfer Key</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-200 font-medium leading-relaxed">
              {activeMoment.status === "priority"
                ? "Commit 85% of your weight forward onto your front shoe through impact. Leaning back robs you of free pace and depth."
                : "Excellent platform stability! Keep maintaining strong balanced foot pressure throughout the swing."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
