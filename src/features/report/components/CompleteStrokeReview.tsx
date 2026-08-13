"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, Eye, Footprints, Gauge, Play, Route, Scale, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import type { AnalysisReport } from "@/modules/analysis/types";
import { buildNextGenerationStory } from "../model/next-generation-story";

const CHAPTER_ICONS = {
  setup: Gauge,
  movement_spacing: Footprints,
  weight_transfer: Scale,
  swing_connection: Zap,
  contact_stability: Target,
  finish_recovery: Route,
} as const;

const STATUS_STYLE = {
  priority: "border-rose-300 bg-rose-50 text-rose-950",
  developing: "border-amber-200 bg-amber-50 text-amber-950",
  strength: "border-emerald-200 bg-emerald-50 text-emerald-950",
  not_assessed: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

const REVIEW_CHAPTERS = [
  { id: "setup", label: "Setup & timing" },
  { id: "movement_spacing", label: "Footwork & spacing" },
  { id: "weight_transfer", label: "Weight transfer & leg drive" },
  { id: "swing_connection", label: "Body-to-racket connection" },
  { id: "contact_stability", label: "Head & contact stability" },
  { id: "finish_recovery", label: "Finish & recovery" },
] as const;

function chapterForRegion(id: string) {
  if (id.includes("head")) return "contact_stability";
  if (id.includes("finish")) return "finish_recovery";
  if (id.includes("feet")) return "movement_spacing";
  if (id.includes("hip")) return "weight_transfer";
  if (id.includes("knee") || id.includes("hand")) return "swing_connection";
  return "setup";
}

function reviewTrace(report: AnalysisReport): NonNullable<AnalysisReport["ontologyReasoning"]> | null {
  if (report.ontologyReasoning?.findings?.length) return report.ontologyReasoning;
  const regions = report.frameSummary?.bodyRegionReview ?? [];
  const developing = regions.filter((item) => item.status === "priority" || item.status === "developing").slice(0, 5);
  if (!developing.length) return null;
  const findings = developing.map((item, index) => {
    const chapterId = chapterForRegion(item.id);
    const chapter = REVIEW_CHAPTERS.find((candidate) => candidate.id === chapterId) ?? REVIEW_CHAPTERS[0];
    return {
      id: `review-${item.id}`,
      rank: index + 1,
      role: index === 0 ? "PRIMARY" as const : "SECONDARY" as const,
      chapterId,
      label: chapter.label,
      faultId: `VIDEO-${item.id.toUpperCase()}`,
      ontologyTitle: item.title,
      domain: chapterId,
      status: "FAULT_SUSPECTED" as const,
      score: item.status === "priority" ? 48 : 64,
      priorityScore: developing.length - index,
      confidence: report.confidence,
      summary: item.coachNote,
      why: item.whyItMatters,
      correction: item.coachNote,
      cue: item.cue,
      watch: typeof item.timestampSeconds === "number" ? `Watch near ${item.timestampSeconds.toFixed(2)}s.` : "Watch this movement through the relevant phase.",
      phaseOrigin: item.phase,
      phaseVisibleEffect: item.phase,
      overlayMarkers: [],
      sourceIds: [],
      evidence: item.evidence.map((evidence) => ({
        areaId: evidence.id,
        label: evidence.label,
        observation: evidence.displayValue,
        score: item.status === "priority" ? 48 : 64,
        confidence: evidence.confidence,
        measurementBasis: evidence.measurementBasis,
        timestampSeconds: item.timestampSeconds,
      })),
      drill: report.drills[index] ? {
        id: report.drills[index].id,
        name: report.drills[index].name,
        purpose: report.drills[index].purpose,
        dosage: report.drills[index].dosage,
        cue: report.drills[index].cue,
        success: report.drills[index].successMetric,
      } : null,
    };
  });
  const strength = regions.find((item) => item.status === "strength");
  const strengthReview = strength ? [{
    chapterId: chapterForRegion(strength.id),
    label: strength.title,
    score: 86,
    summary: strength.coachNote,
    evidence: strength.evidence.map((evidence) => ({ areaId: evidence.id, label: evidence.label, observation: evidence.displayValue, score: 86, confidence: evidence.confidence, measurementBasis: evidence.measurementBasis })),
  }] : [];
  return {
    status: "FAULT_SUSPECTED",
    priorityScore: findings[0].priorityScore,
    candidateCount: findings.length,
    evaluatedFaultIds: findings.map((item) => item.faultId),
    cameraSupport: "pose-supported video review",
    sourceIds: [],
    ontologyVersion: "4.1.0",
    manifestHash: report.engineManifest?.ontologyManifestHash ?? "legacy-compatible-review",
    policiesApplied: ["progressive_disclosure", "camera_honesty"],
    gatedCapabilities: [],
    findings,
    strengthReview,
    movementChain: REVIEW_CHAPTERS.map((chapter) => {
      const finding = findings.find((item) => item.chapterId === chapter.id);
      const isStrength = strengthReview.some((item) => item.chapterId === chapter.id);
      return { id: chapter.id, label: chapter.label, status: finding?.role === "PRIMARY" ? "priority" as const : finding ? "developing" as const : isStrength ? "strength" as const : "not_assessed" as const, score: finding?.score ?? (isStrength ? 86 : null), summary: finding?.summary ?? strengthReview.find((item) => item.chapterId === chapter.id)?.summary ?? "Not assessed from this camera view.", faultId: finding?.faultId ?? null };
    }),
  };
}

function phaseLabel(value: string) {
  const labels: Record<string, string> = {
    G0: "Ready", G1: "Read", G2: "Turn", G3: "Set", G4: "Load", G5: "Swing", G6: "Contact", G7: "Extend", G8: "Finish", G9: "Recover",
    S0: "Start", S1: "Toss", S2: "Release", S3: "Trophy", S4: "Load", S5: "Drop", S6: "Drive", S7: "Contact", S8: "Finish", S9: "Land", S10: "Recover",
  };
  return labels[value] ?? value;
}

function developmentLabel(score: number) {
  if (score < 55) return "Clear priority";
  if (score < 70) return "Needs attention";
  return "Developing";
}

export default function CompleteStrokeReview({ report }: { report: AnalysisReport }) {
  const trace = reviewTrace(report);
  const story = useMemo(() => buildNextGenerationStory(report), [report]);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const activeBeat = story.visualStory.beats[activeBeatIndex] ?? story.visualStory.beats[0];
  if (!trace?.findings?.length) return null;
  const primaryFinding = trace.findings.find((item) => item.role === "PRIMARY") ?? trace.findings[0];
  const supportingFindings = trace.findings.filter((item) => item.id !== primaryFinding.id);

  function showFinding(finding: NonNullable<AnalysisReport["ontologyReasoning"]>["findings"][number]) {
    const timestampSeconds = finding.evidence.find((item) => typeof item.timestampSeconds === "number")?.timestampSeconds;
    window.dispatchEvent(new CustomEvent("acecoach:story-beat", {
      detail: {
        timestampSeconds,
        playbackRate: 0.35,
        caption: finding.correction,
        intent: "effect",
      },
    }));
    document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showStoryBeat(index: number) {
    const beat = story.visualStory.beats[index];
    setActiveBeatIndex(index);
    window.dispatchEvent(new CustomEvent("acecoach:story-beat", { detail: beat }));
    document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="stroke-story" aria-labelledby="complete-review-title" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-blue-200 bg-[radial-gradient(circle_at_88%_8%,rgba(59,130,246,.16),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eaf4ff_58%,#eefcf7_100%)] p-6 text-slate-950 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-white">1</span><Sparkles className="h-4 w-4" />Understand your stroke</p>
            <h2 id="complete-review-title" className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Your stroke story</h2>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-700">Start with the main pattern. Then see how it changes the rest of the stroke and what to do next.</p>
          </div>
          <div className="grid min-w-[250px] grid-cols-2 gap-2">
            <div data-testid="stroke-improvement-count" className="rounded-2xl border-2 border-rose-300 bg-white p-4 shadow-sm"><p className="text-3xl font-bold text-rose-800">{trace.findings.length}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-rose-900">areas to improve</p></div>
            <div data-testid="stroke-strength-count" className="rounded-2xl border-2 border-emerald-300 bg-white p-4 shadow-sm"><p className="text-3xl font-bold text-emerald-800">{trace.strengthReview.length}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-900">strengths to keep</p></div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stroke chain at a glance</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {trace.movementChain.map((item, index) => {
              const Icon = CHAPTER_ICONS[item.id as keyof typeof CHAPTER_ICONS] ?? Gauge;
              return <div key={item.id} className={`relative rounded-2xl border p-3 ${STATUS_STYLE[item.status]}`}><div className="flex items-center justify-between gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80"><Icon className="h-4 w-4" /></span><span className="text-[0.62rem] font-bold uppercase tracking-wide">{item.status === "priority" ? "Start here" : item.status === "developing" ? "Work on" : item.status === "strength" ? "Keep" : "Check"}</span></div><p className="mt-3 text-xs font-semibold leading-5">{item.label}</p>{index < trace.movementChain.length - 1 ? <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-slate-300 lg:block" /> : null}</div>;
            })}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_90%_10%,rgba(16,185,129,.16),transparent_30%)] p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-300">Coach&apos;s bottom line</p>
              <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">{story.playerCoaching.coachRead}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">The complete stroke map above gives you the context. This is the first connection to understand and train.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">One cue for the next rep</p>
              <p className="mt-2 text-xl font-semibold leading-7">“{story.playerCoaching.feel}”</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-300" />{story.evidenceLabel} · camera limits preserved</p>
            </div>
          </div>

          <div className="border-t border-white/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Priority explained</p><h3 className="mt-1 text-xl font-semibold">Follow cause → effect → correction</h3></div><p className="text-xs text-slate-400">The first finding, connected to the whole stroke</p></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-300">1 · Where it starts</p><p className="mt-2 text-sm font-semibold leading-6">{primaryFinding.summary}</p><p className="mt-2 text-xs text-slate-400">{phaseLabel(primaryFinding.phaseOrigin)}</p></div>
              <ArrowRight className="mx-auto h-5 w-5 self-center rotate-90 text-slate-500 lg:rotate-0" />
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-rose-300">2 · What it changes</p><p className="mt-2 text-sm font-semibold leading-6">{primaryFinding.why}</p><p className="mt-2 text-xs text-slate-400">Visible by {phaseLabel(primaryFinding.phaseVisibleEffect)}</p></div>
              <ArrowRight className="mx-auto h-5 w-5 self-center rotate-90 text-slate-500 lg:rotate-0" />
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-300">3 · What to change</p><p className="mt-2 text-sm font-semibold leading-6">{primaryFinding.correction}</p><p className="mt-2 text-xs text-slate-400">Feel: “{primaryFinding.cue}”</p></div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Priority coaching story">
              {story.visualStory.beats.map((beat, index) => <button key={beat.beatId} type="button" role="tab" aria-selected={index === activeBeatIndex} onClick={() => showStoryBeat(index)} className={`min-h-16 rounded-xl border p-3 text-left text-xs font-semibold leading-5 transition ${index === activeBeatIndex ? "border-sky-300 bg-sky-300 text-slate-950" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}><span className="block text-[0.62rem] uppercase tracking-wide opacity-70">Step {index + 1}</span><span className="mt-1 block">{beat.label}</span></button>)}
            </div>
            {activeBeat ? <div role="tabpanel" className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-sky-300">{activeBeat.label}</p><p className="mt-1 text-sm font-semibold leading-6">{activeBeat.caption}</p></div><button type="button" onClick={() => showStoryBeat(activeBeatIndex)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-slate-950 hover:bg-sky-50"><Play className="h-3.5 w-3.5" />Show on my video</button></div> : null}
          </div>
        </div>

        {supportingFindings.length ? <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
          <div className="border-b border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">What to improve after the main priority</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-slate-950">{supportingFindings.length} connected findings to keep on your radar</h3></div>
              <p className="max-w-md text-sm leading-6 text-slate-500">They stay visible here, but closed by default so today&apos;s correction remains clear.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
          {supportingFindings.map((finding) => {
            const Icon = CHAPTER_ICONS[finding.chapterId as keyof typeof CHAPTER_ICONS] ?? Target;
            return (
              <details key={finding.id} className="group bg-white/70 open:bg-white">
                <summary className="grid cursor-pointer list-none gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${finding.chapterId === "weight_transfer" ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700"}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{finding.rank} · Later focus</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[0.62rem] font-semibold text-slate-500">{developmentLabel(finding.score)}</span></span><span className="mt-1 block text-lg font-semibold text-slate-950">{finding.label}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{finding.summary}</span></span>
                  <span className="flex items-center gap-2 text-xs font-semibold text-blue-900">See coaching detail<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></span>
                </summary>
                <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6">
                  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-4"><p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">Why it matters</p><p className="mt-2 text-sm leading-6 text-slate-700">{finding.why}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-emerald-700">Coach it this way</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{finding.correction}</p><p className="mt-2 text-xs text-slate-500">Feel: “{finding.cue}”</p></div></div>
                  <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => showFinding(finding)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173F6A] px-3.5 text-xs font-semibold text-white hover:bg-[#103554]"><Eye className="h-3.5 w-3.5" />Show the moment</button><span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.65rem] font-semibold text-slate-500">{phaseLabel(finding.phaseOrigin)} → {phaseLabel(finding.phaseVisibleEffect)}</span><span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.65rem] font-semibold text-slate-500">{finding.status === "FAULT_CONFIRMED" ? "Repeated pattern" : "Working finding"}</span></div>
                  <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-600"><span>Why AceCoach said this · {finding.faultId}</span><ChevronDown className="h-4 w-4" /></summary><div className="mt-3 space-y-2 border-t border-slate-200 pt-3">{finding.evidence.map((item) => <div key={item.areaId} className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-900">{item.label}:</span> {item.observation}</div>)}</div></details>
                </div>
              </details>
            );
          })}
          </div>
        </div>
        : null}

        {trace.strengthReview.length ? <details className="group mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><span className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><span><span className="block text-sm font-semibold text-slate-950">What is already working</span><span className="mt-0.5 block text-xs text-emerald-800">{trace.strengthReview.length} qualities to protect while you make the change</span></span></span><ChevronDown className="h-4 w-4 text-emerald-800 transition group-open:rotate-180" /></summary><div className="mt-4 grid gap-3 border-t border-emerald-200 pt-4 md:grid-cols-2">{trace.strengthReview.map((strength) => <div key={strength.chapterId} className="rounded-2xl bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold text-slate-950"><BadgeCheck className="h-4 w-4 text-emerald-700" />{strength.label}</p><p className="mt-2 text-sm leading-6 text-slate-600">{strength.summary}</p></div>)}</div></details> : null}
      </div>
    </section>
  );
}
