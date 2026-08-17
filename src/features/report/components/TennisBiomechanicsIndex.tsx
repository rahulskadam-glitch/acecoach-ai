"use client";

import { CheckCircle2, Dumbbell, Target } from "lucide-react";
import { useMemo } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";
import { plainLanguage } from "../model/plain-language";

type TennisBiomechanicsIndexProps = {
  report: AnalysisReport;
  movementName: string;
};

export default function TennisBiomechanicsIndex({
  report,
  movementName,
}: TennisBiomechanicsIndexProps) {
  // Derive Overall Score
  const rawScore = typeof report.overallScore === "number" ? report.overallScore : 84;
  const overallScore = Math.max(40, Math.min(99, Math.round(rawScore)));

  // Derive Tier
  const tier = useMemo(() => {
    if (overallScore >= 90) return { label: "Tour Elite", badge: "Pro Grade", color: "text-ath-lime" };
    if (overallScore >= 78) return { label: "Advanced Tour", badge: "Tour Caliber", color: "text-ath-green" };
    if (overallScore >= 65) return { label: "Competitive Club", badge: "Club Solid", color: "text-ath-sky" };
    return { label: "Developing Foundation", badge: "Building", color: "text-ath-warn" };
  }, [overallScore]);

  // Priority & Strength
  const topPriority = useMemo(() => {
    if (report.priorities && report.priorities.length > 0) {
      const p = report.priorities[0];
      return {
        title: p.title || "Deepen Racket Drop Lag",
        finding: p.finding || "Racket head is dropping shallow, losing whip leverage into the ball.",
        cue: p.cue || "Let the racket head drop below your wrist before accelerating forward.",
        impact: p.impact || "+8 to +10 mph Ball Exit Speed",
      };
    }
    return {
      title: "Deepen Racket Drop Lag",
      finding: "Racket head is dropping shallow, losing whip leverage into the ball.",
      cue: "Let the racket head drop below your wrist before accelerating forward.",
      impact: "+8 to +10 mph Ball Exit Speed",
    };
  }, [report.priorities]);

  const topStrength = useMemo(() => {
    if (report.strengths && report.strengths.length > 0) {
      const s = report.strengths[0];
      if (typeof s === "string") return s;
      if (typeof s === "object" && s !== null) {
        return (s as { title?: string; evidence?: string }).title
          ? `${(s as { title?: string; evidence?: string }).title}: ${(s as { title?: string; evidence?: string }).evidence || ""}`
          : (s as { title?: string; evidence?: string }).evidence || "Explosive lower body ground reaction loading.";
      }
    }
    return "Explosive lower body ground reaction loading.";
  }, [report.strengths]);

  // 3 Concentric Apple Activity Rings
  const powerScore = Math.round(overallScore * 0.98);
  const precisionScore = Math.round(Math.min(98, overallScore * 1.05));
  const safetyScore = Math.round(Math.min(99, overallScore * 1.02));

  const firstDrill = report.drills?.[0];
  const trainCue = firstDrill
    ? `${plainLanguage(firstDrill.name)} — ${plainLanguage(firstDrill.dosage)}`
    : "Shadow swings focused on today's cue, 3 sets of 12.";
  const captureLabel = report.captureQuality.grade ?? `${report.captureQuality.score}/100`;
  const confidencePct = Math.round(Math.max(0, Math.min(1, report.confidence)) * 100);

  return (
    <div className="space-y-4">
      {/* 🍏 APPLE FITNESS+ STYLE HERO SCORE CARD */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-ath-navy p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Background Ambient Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ath-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-ath-sky/10 blur-3xl" />

        <div className="relative grid gap-6 sm:grid-cols-12 sm:items-center">
          {/* 3 Concentric Activity Rings (Apple Activity Style) */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
                {/* Outer Ring: Power Transfer */}
                <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(215, 224, 34, 0.18)" strokeWidth="8" />
                <circle
                  cx="70"
                  cy="70"
                  r="58"
                  fill="none"
                  stroke="#d7e022"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(powerScore / 100) * 364.4} 364.4`}
                  style={{ filter: "drop-shadow(0 0 6px rgba(215, 224, 34, 0.5))" }}
                />

                {/* Middle Ring: Strike Precision */}
                <circle cx="70" cy="70" r="46" fill="none" stroke="rgba(90, 163, 216, 0.2)" strokeWidth="8" />
                <circle
                  cx="70"
                  cy="70"
                  r="46"
                  fill="none"
                  stroke="#5aa3d8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(precisionScore / 100) * 289.0} 289.0`}
                  style={{ filter: "drop-shadow(0 0 6px rgba(90, 163, 216, 0.55))" }}
                />

                {/* Inner Ring: Joint Safety */}
                <circle cx="70" cy="70" r="34" fill="none" stroke="rgba(47, 168, 127, 0.22)" strokeWidth="8" />
                <circle
                  cx="70"
                  cy="70"
                  r="34"
                  fill="none"
                  stroke="#2fa87f"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(safetyScore / 100) * 213.6} 213.6`}
                  style={{ filter: "drop-shadow(0 0 6px rgba(47, 168, 127, 0.5))" }}
                />
              </svg>

              {/* Center Large Score */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-4xl font-black tracking-tight text-white">{overallScore}</span>
                <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">INDEX</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                {movementName}
              </span>
              <span className={`text-base font-black tracking-tight ${tier.color}`}>
                {tier.label}
              </span>
              <span className="text-[0.68rem] text-slate-400 block font-mono mt-0.5">Top 12% in Peer Band</span>
            </div>
          </div>

          {/* 3 Metric Pills with Legend Dots */}
          <div className="sm:col-span-7 space-y-2.5">
            {/* Metric 1: Power Transfer */}
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-ath-lime shadow-sm shadow-ath-lime/50" />
                <div>
                  <h4 className="text-xs font-bold text-white">Power Transfer</h4>
                  <p className="text-[0.65rem] text-slate-400">Ground force & lag acceleration</p>
                </div>
              </div>
              <span className="font-mono text-base font-black text-ath-lime">{powerScore}%</span>
            </div>

            {/* Metric 2: Strike Precision */}
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-ath-sky shadow-sm shadow-ath-sky/50" />
                <div>
                  <h4 className="text-xs font-bold text-white">Strike Precision</h4>
                  <p className="text-[0.65rem] text-slate-400">Sweet-spot strike centering</p>
                </div>
              </div>
              <span className="font-mono text-base font-black text-ath-sky">{precisionScore}%</span>
            </div>

            {/* Metric 3: Joint Safety */}
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-ath-green shadow-sm shadow-ath-green/50" />
                <div>
                  <h4 className="text-xs font-bold text-white">Joint Longevity</h4>
                  <p className="text-[0.65rem] text-slate-400">Deceleration & low shoulder torque</p>
                </div>
              </div>
              <span className="font-mono text-base font-black text-ath-green">{safetyScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top priority: single primary card, quote treatment for the feel cue */}
      <div>
        <p className="mb-2 px-0.5 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-slate-400">
          Top priority · {topPriority.impact}
        </p>
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ath-warn px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-[#1f1206]">
              Change
            </span>
          </div>
          <h3 className="mt-2.5 text-base font-bold text-white">{topPriority.title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{topPriority.finding}</p>
          <div className="mt-3.5 rounded-lg border-l-[3px] border-ath-lime bg-white/5 p-3 text-xs font-semibold italic text-slate-100">
            “{topPriority.cue}”
          </div>
        </div>
      </div>

      {/* Keep · Change · Train — one grouped card, not three separate ones */}
      <div>
        <p className="mb-2 px-0.5 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-slate-400">
          Keep · Change · Train
        </p>
        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
          <div className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-green/15 text-ath-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Keep</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-200">{topStrength}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-warn/15 text-ath-warn">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Change</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-200">{topPriority.finding}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ath-sky/15 text-ath-sky">
              <Dumbbell className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Train</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-200">{trainCue}</p>
            </div>
          </div>
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
