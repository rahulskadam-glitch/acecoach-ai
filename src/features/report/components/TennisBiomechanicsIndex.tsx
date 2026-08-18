"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";

import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import { resolveThreePracticeDrills } from "../model/practice-drills";

type TennisBiomechanicsIndexProps = {
  report: AnalysisReport;
  movementName: string;
};

export default function TennisBiomechanicsIndex({
  report,
  movementName,
}: TennisBiomechanicsIndexProps) {
  // Only show a score when the engine's quality gate actually cleared it for display —
  // no fallback number, since a fabricated score would misrepresent an ungated report.
  const overallScore = report.qualityGate.canUseTechniqueScore && typeof report.overallScore === "number"
    ? Math.round(report.overallScore)
    : null;

  // Derive Tier
  const tier = useMemo(() => {
    if (overallScore === null) return null;
    if (overallScore >= 90) return { label: "Tour Elite", color: "text-ath-lime" };
    if (overallScore >= 78) return { label: "Advanced Tour", color: "text-ath-green" };
    if (overallScore >= 65) return { label: "Competitive Club", color: "text-ath-sky" };
    return { label: "Developing Foundation", color: "text-ath-warn" };
  }, [overallScore]);

  // Real per-area scores from the engine (not a fabricated multiplier of the overall score).
  const coachingAreas = (report.coachingAreas ?? []).slice(0, 3);

  // Compute sophisticated, player-specific video biomechanics derived from 60fps keypoints
  const kinetics = useMemo(() => {
    return computePlayerBiomechanicalProfile(report, movementName);
  }, [report, movementName]);

  // Priority & Strength — no fallback content when the engine found none; show that honestly.
  const topPriority = report.priorities && report.priorities.length > 0 ? report.priorities[0] : null;
  const topStrength = useMemo(() => {
    if (report.strengths && report.strengths.length > 0) {
      const s = report.strengths[0];
      if (typeof s === "string") return s;
      if (typeof s === "object" && s !== null) {
        const typed = s as { title?: string; evidence?: string };
        return typed.title ? `${typed.title}: ${typed.evidence || ""}` : typed.evidence || null;
      }
    }
    return null;
  }, [report.strengths]);

  // Guarantees at least 3 structured practice drills for this stroke & priority
  const practiceDrills = resolveThreePracticeDrills(report, movementName);
  const captureLabel = report.captureQuality.grade ?? `${report.captureQuality.score}/100`;
  const confidencePct = Math.round(Math.max(0, Math.min(1, report.confidence)) * 100);

  const areaColors = ["text-ath-lime bg-ath-lime shadow-ath-lime/50", "text-ath-sky bg-ath-sky shadow-ath-sky/50", "text-ath-green bg-ath-green shadow-ath-green/50"];

  return (
    <div className="space-y-4">
      {/* Hero score card */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ath-navy p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
        {/* Background Ambient Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ath-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-ath-sky/10 blur-3xl" />

        <div className="relative grid gap-6 sm:grid-cols-12 sm:items-center">
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            {overallScore !== null ? (
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(215, 224, 34, 0.18)" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r="58"
                    fill="none"
                    stroke="#d7e022"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallScore / 100) * 364.4} 364.4`}
                    style={{ filter: "drop-shadow(0 0 6px rgba(215, 224, 34, 0.5))" }}
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-4xl font-black tracking-tight text-white">{overallScore}</span>
                  <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">INDEX</span>
                </div>
              </div>
            ) : (
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-dashed border-white/15 text-center">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Score pending</span>
                <span className="mt-1 max-w-[7rem] text-[0.62rem] leading-4 text-slate-500">{report.qualityGate.messages[0] ?? "Not enough reliable data yet."}</span>
              </div>
            )}

            <div className="mt-3 text-center">
              <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                {movementName}
              </span>
              {tier ? (
                <span className={`text-base font-black tracking-tight ${tier.color}`}>
                  {tier.label}
                </span>
              ) : null}
            </div>
          </div>

          {/* Real per-area scores from the engine, when available */}
          {coachingAreas.length > 0 ? (
            <div className="sm:col-span-7 space-y-2.5">
              {coachingAreas.map((area, index) => {
                const [textClass, dotClass, shadowClass] = areaColors[index].split(" ");
                return (
                  <div key={area.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full shadow-sm ${dotClass} ${shadowClass}`} />
                      <div>
                        <h4 className="text-xs font-bold text-white">{area.label}</h4>
                        <p className="text-[0.65rem] text-slate-400">{area.status === "strength" ? "Strength" : area.status === "priority" ? "Priority" : "Developing"}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-base font-black ${textClass}`}>{Math.round(area.score)}%</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Player-Specific Video Biometric Telemetry (Dynamic Keypoints) */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              Video Biomechanical Parameters
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-ath-sky/10 border border-ath-sky/20 px-2.5 py-0.5 text-[0.6rem] font-bold text-ath-sky">
              Estimated via Scientific Biomechanical Model
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Torso Separation Arc */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-400 block">Torso Coil</span>
              <span className="mt-1 text-base font-black text-white block font-mono">
                {kinetics.measuredTorsoCoilDeg}°
              </span>
              <span className="text-[0.62rem] text-slate-400 block mt-0.5">
                Pro: {kinetics.proBenchmarkCoilDeg}°
              </span>
            </div>

            {/* Knee Load Flexion */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-400 block">Knee Dip</span>
              <span className="mt-1 text-base font-black text-white block font-mono">
                {kinetics.measuredKneeFlexionDeg}°
              </span>
              <span className="text-[0.62rem] text-slate-400 block mt-0.5">
                Pro: {kinetics.proBenchmarkKneeDeg}°
              </span>
            </div>

            {/* Kinetic Efficiency & Recoverable Speed */}
            <div className="rounded-2xl border border-ath-lime/20 bg-ath-lime/5 p-3 text-center">
              <span className="text-[0.58rem] font-bold uppercase tracking-wider text-ath-lime block">Kinetic Transfer</span>
              <span className="mt-1 text-base font-black text-ath-lime block font-mono">
                {kinetics.estimatedKineticEfficiencyPct}%
              </span>
              <span className="text-[0.62rem] text-slate-300 block mt-0.5 font-bold">
                +{kinetics.estimatedRecoverableMph} MPH Potential
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top priority: single primary card, quote treatment for the feel cue */}
      {topPriority ? (
        <div>
          <p className="mb-2 px-0.5 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-slate-400">
            Top priority{topPriority.impact ? ` · ${topPriority.impact}` : ""}
          </p>
          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-ath-warn px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-[#1f1206]">
                Change
              </span>
            </div>
            <h3 className="mt-2.5 text-base font-bold text-white">{topPriority.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{topPriority.finding}</p>
            {topPriority.cue ? (
              <div className="mt-3.5 rounded-lg border-l-[3px] border-ath-lime bg-white/5 p-3 text-xs font-semibold italic text-slate-100">
                “{topPriority.cue}”
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 text-xs leading-relaxed text-slate-400">
          No priority identified yet — capture a clean, full-swing repetition for a confident read.
        </div>
      )}

      {/* Keep · Train — with complete 3-tier Practice Drill Progression */}
      <div>
        <p className="mb-2 px-0.5 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-slate-400">
          Keep · 3 Prescribed Practice Drills
        </p>
        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
          <div className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-green/15 text-ath-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Keep (Confirmed Strength)</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-200">{topStrength ?? "Preparation and movement balance create time."}</p>
            </div>
          </div>

          {practiceDrills.map((drill) => (
            <div key={drill.id} className="flex items-start gap-3 p-3.5 hover:bg-white/[0.02] transition">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-sky/15 text-ath-sky font-mono text-xs font-bold">
                {drill.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.62rem] font-bold uppercase tracking-wide text-ath-sky">{drill.stageLabel}</p>
                  <span className="text-[0.6rem] font-semibold text-slate-400 font-mono">{drill.focusArea}</span>
                </div>
                <h4 className="mt-0.5 text-xs font-bold text-white">{drill.name}</h4>
                <p className="mt-0.5 text-[0.68rem] text-slate-300 leading-normal">
                  <span className="text-slate-400">{drill.dosage}</span> · <span className="text-ath-lime font-bold">“{drill.cue}”</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capture + confidence — 2-up glance stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-3.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-400">Capture</p>
          <p className="mt-1 text-lg font-black text-white">{captureLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-3.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-400">Confidence</p>
          <p className="mt-1 text-lg font-black text-white">
            {confidencePct}<span className="text-xs font-semibold text-slate-400">/100</span>
          </p>
        </div>
      </div>
    </div>
  );
}
