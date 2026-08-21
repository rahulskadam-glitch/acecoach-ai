"use client";

import { AlertTriangle, Dumbbell, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

type Props = {
  report?: AnalysisReport;
  actionType: string;
  profile?: PlayerBiomechanicalProfile;
};

export default function RotatorCuffDecelerationBarometer({ report, actionType, profile }: Props) {
  const [showPtExercises, setShowPtExercises] = useState(false);
  const isServe = actionType.toLowerCase().includes("serve");

  const resolvedProfile = profile ?? (report ? computePlayerBiomechanicalProfile(report, actionType) : undefined);
  const rotatorCuffAxis = resolvedProfile?.jointStressAxes.find((j) => j.jointId === "rotator_cuff") ?? resolvedProfile?.jointStressAxes[0];

  // Deceleration telemetry values derived from follow-through kinematics
  const brakingTorqueNm = rotatorCuffAxis?.torqueNm ?? (isServe ? 46.0 : 36.0);
  const safeLimitNm = rotatorCuffAxis?.proBenchmarkNm ?? (isServe ? 44.0 : 38.0);
  const decelerationWindowMs = resolvedProfile ? Math.round(resolvedProfile.measuredTimingLagMs * 1.05) : (isServe ? 85 : 95);
  const followThroughArcLengthCm = resolvedProfile ? Math.round(Math.max(45, Math.min(85, (resolvedProfile.measuredTorsoCoilDeg / 34) * 64))) : 60;
  const loadPercentage = Math.min(100, Math.round((brakingTorqueNm / (safeLimitNm * 1.5)) * 100));

  const isHighRisk = rotatorCuffAxis ? rotatorCuffAxis.riskLevel === "elevated" : brakingTorqueNm > safeLimitNm + 4;

  return (
    <div className="rounded-3xl border border-white/10 bg-ath-navy p-5 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ath-warn/20 text-ath-warn ring-1 ring-ath-warn/50">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-400">
            Posterior shoulder eccentric braking stress (infraspinatus & teres minor)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPtExercises(!showPtExercises)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-white/20 hover:text-white transition"
        >
          <Dumbbell className="h-3.5 w-3.5 text-ath-warn" />
          <span>{showPtExercises ? "Hide PT Protocols" : "View PT Protocols"}</span>
        </button>
      </div>

      {/* Main Barometer Load Dial Arena */}
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Visual Barometer Gauge */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Eccentric Braking Torque
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                isHighRisk
                  ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                  : "bg-ath-warn/20 text-ath-warn ring-1 ring-ath-warn/30"
              }`}
            >
              {isHighRisk ? "ELEVATED BRAKING LOAD" : "MODERATE BRAKING LOAD"}
            </span>
          </div>

          <div className="my-6 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-black text-white">{brakingTorqueNm.toFixed(1)}</span>
            <span className="font-mono text-base font-bold text-slate-400">N·m</span>
            <span className="text-xs text-slate-400 ml-2">
              (Clinical Safe Threshold: &lt;{safeLimitNm} N·m)
            </span>
          </div>

          {/* Color-Coded Multi-Segment Barometer Strip */}
          <div className="space-y-2">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHighRisk
                    ? "bg-gradient-to-r from-ath-green via-ath-warn to-rose-500"
                    : "bg-gradient-to-r from-ath-green to-ath-warn"
                }`}
                style={{ width: `${loadPercentage}%` }}
              />
              {/* Clinical Limit Tick Marker at 45 N·m (approx 56%) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md"
                style={{ left: "56%" }}
                title="Safe Orthopedic Threshold"
              />
            </div>

            <div className="flex justify-between text-[0.68rem] font-bold text-slate-400">
              <span className="text-ath-green">0 N·m (Fluid Wrap)</span>
              <span className="text-white">45 N·m (Safe Limit)</span>
              <span className="text-rose-400">80 N·m (Abrupt Brake)</span>
            </div>
          </div>
        </div>

        {/* Biomechanical Cause & Solution Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-ath-warn uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Biomechanical Root Cause</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              When stopping the racket within <span className="font-mono font-bold text-white">{decelerationWindowMs}ms</span> (short-arming the follow-through), your posterior rotator cuff acts as an emergency mechanical brake, absorbing up to{" "}
              <span className="font-mono font-bold text-ath-warn">{brakingTorqueNm} N·m</span> of eccentric force.
            </p>

            <div className="mt-4 rounded-xl border border-ath-green/30 bg-ath-green/20 p-3">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-ath-green block">
                ✅ Corrective Follow-Through Cue
              </span>
              <p className="mt-1 text-xs text-ath-green font-semibold">
                “Let the racket wrap smoothly around your opposite hip/shoulder to elongate the deceleration path to 80cm.”
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <span className="text-slate-400">Deceleration Arc Length:</span>
            <span className="font-mono font-bold text-white">{followThroughArcLengthCm} cm (Target: 80 cm)</span>
          </div>
        </div>
      </div>

      {/* PT Protocols Drawer */}
      {showPtExercises && (
        <div className="mt-5 border-t border-white/10 pt-5 animate-in fade-in slide-in-from-top-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-ath-warn" />
            Prescribed Shoulder Eccentric Strengthening Exercises
          </h4>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <h5 className="text-xs font-bold text-ath-warn">1. Side-Lying Eccentric External Rotation</h5>
              <p className="text-[0.7rem] text-slate-300 mt-1">
                Slowly lower a light dumbbell (2–4 lbs) over 4 seconds. Focus on controlled eccentric braking.
              </p>
              <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-[0.65rem] font-mono font-bold text-slate-200">
                3 sets × 10 reps
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <h5 className="text-xs font-bold text-ath-warn">2. Sleeper Stretch & Posterior Capsule Mobilization</h5>
              <p className="text-[0.7rem] text-slate-300 mt-1">
                Gently stretch posterior capsule to maintain internal rotation and eliminate GIRD deficits.
              </p>
              <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-[0.65rem] font-mono font-bold text-slate-200">
                2 sets × 30s holds
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
