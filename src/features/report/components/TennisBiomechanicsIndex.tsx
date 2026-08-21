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

  // Real per-stage scores from the engine's biomechanical profile — the same six canonical
  // stages used everywhere else in the report (ready/unit_turn/backswing/forward_swing_contact/
  // follow_through/recovery), not the arbitrary top-3 coaching-area findings this used to show.
  const stagePhases = report.frameSummary?.biomechanicalProfile?.phases ?? [];

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

  function stageTone(score: number | null) {
    if (score === null) return { text: "text-slate-500", bar: "bg-slate-600" };
    if (score >= 78) return { text: "text-ath-lime", bar: "bg-ath-lime" };
    if (score >= 50) return { text: "text-ath-sky", bar: "bg-ath-sky" };
    return { text: "text-ath-warn", bar: "bg-ath-warn" };
  }

  return (
    <div className="space-y-5">
      {/* Score + six-stage breakdown — one card, no nested boxes */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ath-navy p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-12 sm:items-center">
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            {overallScore !== null ? (
              <div className="relative flex h-32 w-32 items-center justify-center">
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
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-4xl font-black tracking-tight text-white">{overallScore}</span>
                  <span className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400">Index</span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-dashed border-white/15 text-center">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">Score pending</span>
                <span className="mt-1 max-w-[7rem] text-[0.62rem] leading-4 text-slate-500">{report.qualityGate.messages[0] ?? "Not enough reliable data yet."}</span>
              </div>
            )}
            <div className="mt-3 text-center">
              <span className="mb-0.5 block text-[0.62rem] font-semibold text-slate-400">{movementName}</span>
              {tier ? <span className={`text-base font-bold tracking-tight ${tier.color}`}>{tier.label}</span> : null}
            </div>
          </div>

          {stagePhases.length > 0 ? (
            <div className="sm:col-span-7 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {stagePhases.map((phase, index) => {
                const score = typeof phase.score === "number" ? Math.round(phase.score) : null;
                const tone = stageTone(score);
                return (
                  <div key={phase.id}>
                    <span className="text-[0.6rem] font-medium text-slate-400">{index + 1}. {phase.label}</span>
                    <span className={`mt-0.5 block font-mono text-lg font-bold ${tone.text}`}>{score !== null ? score : "—"}</span>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: score !== null ? `${score}%` : "0%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Biomechanics — divider, not a nested box */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.62rem] font-semibold text-slate-400">Biomechanics</span>
            <span className="text-[0.58rem] text-slate-500">Estimated from your video</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block text-[0.58rem] text-slate-400">Torso Coil</span>
              <span className="mt-0.5 block font-mono text-base font-bold text-white">{kinetics.measuredTorsoCoilDeg}°</span>
              <span className="block text-[0.6rem] text-slate-500">Pro {kinetics.proBenchmarkCoilDeg}°</span>
            </div>
            <div>
              <span className="block text-[0.58rem] text-slate-400">Knee Dip</span>
              <span className="mt-0.5 block font-mono text-base font-bold text-white">{kinetics.measuredKneeFlexionDeg}°</span>
              <span className="block text-[0.6rem] text-slate-500">Pro {kinetics.proBenchmarkKneeDeg}°</span>
            </div>
            <div>
              <span className="block text-[0.58rem] text-ath-lime">Kinetic Transfer</span>
              <span className="mt-0.5 block font-mono text-base font-bold text-ath-lime">{kinetics.estimatedKineticEfficiencyPct}%</span>
              <span className="block text-[0.6rem] text-slate-400">+{kinetics.estimatedRecoverableMph} mph potential</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary — priority, strength, and drills together in one card, not three */}
      <div className="rounded-3xl border border-white/10 bg-ath-navy p-5 sm:p-6">
        {topPriority ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-ath-warn px-2.5 py-0.5 text-[0.6rem] font-bold uppercase text-[#1f1206]">Priority</span>
              {topPriority.impact ? <span className="text-[0.62rem] text-slate-400">{topPriority.impact}</span> : null}
            </div>
            <h3 className="mt-2 text-base font-bold text-white">{topPriority.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{topPriority.finding}</p>
            {topPriority.cue ? <p className="mt-2 text-xs font-semibold italic text-slate-100">“{topPriority.cue}”</p> : null}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-slate-400">No priority identified yet — capture a clean, full-swing repetition for a confident read.</p>
        )}

        <div className="mt-4 flex items-start gap-2.5 border-t border-white/10 pt-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ath-green" />
          <div>
            <p className="text-[0.62rem] font-semibold text-ath-green">Keep doing</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-200">{topStrength ?? "Preparation and movement balance create time."}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/10 border-t border-white/10">
          {practiceDrills.map((drill) => (
            <div key={drill.id} className="flex items-start gap-3 py-3 first:pt-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-sky/15 font-mono text-xs font-bold text-ath-sky">{drill.number}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.62rem] font-semibold text-ath-sky">{drill.stageLabel}</p>
                  <span className="font-mono text-[0.6rem] text-slate-400">{drill.focusArea}</span>
                </div>
                <h4 className="mt-0.5 text-xs font-bold text-white">{drill.name}</h4>
                <p className="mt-0.5 text-[0.68rem] leading-normal text-slate-300">
                  <span className="text-slate-400">{drill.dosage}</span> · <span className="font-bold text-ath-lime">“{drill.cue}”</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <span className="text-slate-400">Capture <span className="font-bold text-white">{captureLabel}</span></span>
          <span className="text-slate-400">Confidence <span className="font-bold text-white">{confidencePct}/100</span></span>
        </div>
      </div>
    </div>
  );
}
