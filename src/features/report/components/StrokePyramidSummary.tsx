"use client";

import { ArrowDown, CheckCircle2, Dumbbell, Eye, ListChecks, Target } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";
import { buildStrokePyramidSummary, type StrokeSummaryPoint } from "../model/pyramid-summary";

type PointTarget = Pick<StrokeSummaryPoint, "bodyRegionId" | "phase" | "timestampSeconds">;

function showPoint(point: PointTarget, destination: "video" | "body") {
  window.dispatchEvent(new CustomEvent("acecoach:coach-region", {
    detail: {
      regionId: point.bodyRegionId,
      time: point.timestampSeconds,
      phase: point.phase,
    },
  }));
  document.getElementById(destination === "video" ? "key-moment" : "body-coach")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function StrokePyramidSummary({ report, movement }: { report: AnalysisReport; movement: string }) {
  const summary = buildStrokePyramidSummary(report, movement);
  const context = report.coachSummary.contextStatement ?? report.frameSummary?.analysisContext?.statement;
  const score = report.qualityGate.canUseTechniqueScore ? report.overallScore : null;
  const frameworkStyle = {
    working: "border-emerald-200 bg-emerald-50 text-emerald-900",
    developing: "border-blue-200 bg-blue-50 text-blue-900",
    priority: "border-amber-200 bg-amber-50 text-amber-950",
    confirm: "border-violet-200 bg-violet-50 text-violet-900",
  } as const;
  const frameworkLabel = { working: "Working", developing: "Develop", priority: "Improve", confirm: "Confirm" } as const;

  return (
    <section id="coach-summary" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_95%_0%,rgba(219,234,254,.7),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_65%,#ecfdf5_100%)] p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-800"><Target className="h-4 w-4" />Your stroke in plain English</div>
          {score !== null ? <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"><span className="font-semibold text-slate-950">Video score {score}/100</span></div> : null}
        </div>
        <h1 className="mt-5 max-w-5xl text-3xl font-semibold leading-[1.12] tracking-[-0.04em] text-slate-950 sm:text-5xl">{summary.headline}</h1>
        <p className="mt-5 max-w-5xl text-lg font-medium leading-8 text-slate-800 sm:text-xl">{summary.bottomLine}</p>
        {context ? <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{context}</p> : null}
        <p className="mt-3 max-w-4xl text-xs leading-6 text-slate-500">{summary.synthesisNote}</p>
      </div>

      {summary.framework?.length ? <details className="border-b border-slate-200 bg-slate-50/60 p-6 sm:p-8">
        <summary className="cursor-pointer list-none rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">Optional stroke detail</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Open the four-stage breakdown</h2><p className="mt-2 text-sm text-slate-500">Use this after you understand the one main correction.</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">4 stages</span></div></summary>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">Complete stroke read</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">The {movement.toLowerCase()} in four connected stages</h2></div>
          <p className="max-w-xl text-xs leading-6 text-slate-500">These same numbers appear on the video: 1 prepare, 2 build the power position, 3 meet the ball, 4 finish and recover.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="backhand-four-stage-summary">
          {summary.framework.map((item) => <article key={item.id} data-testid={`backhand-framework-${item.step}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950 text-sm font-bold text-white">{item.step}</span>{item.label}</span><span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${frameworkStyle[item.status]}`}>{frameworkLabel[item.status]}</span></div>
            <h3 className="mt-3 text-xl font-semibold leading-7 text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">{item.summary}</p>
            <p className="mt-4 rounded-xl bg-blue-950 px-4 py-3 text-sm font-semibold text-white">“{item.coachCue}”</p>
            {item.checks?.length ? <details className="mt-4 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">{item.checks.length} supporting checkpoints</summary>
              <div className="mt-3 space-y-3">{item.checks.map((check) => <div key={check.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${check.status === "working" ? "bg-emerald-500" : check.status === "priority" ? "bg-amber-500" : check.status === "confirm" ? "bg-violet-500" : "bg-blue-500"}`} /><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-slate-900">{check.label}</p>{check.status === "confirm" ? <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-violet-700">Confirm</span> : null}</div><p className="mt-1 text-[0.7rem] leading-5 text-slate-600">{check.finding}</p>{check.cameraBoundary ? <p className="mt-1 text-[0.65rem] leading-5 text-slate-400">Camera limit: {check.cameraBoundary}</p> : null}</div></div>)}</div>
            </details> : null}
            {item.cameraBoundary ? <p className="mt-3 text-[0.68rem] leading-5 text-slate-500">Camera limit: {item.cameraBoundary}</p> : null}
            <button type="button" onClick={() => showPoint(item, "video")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#071b2d] px-3 text-xs font-semibold text-white hover:bg-[#0d2b42]"><Eye className="h-4 w-4" />Show stage {item.step} on video</button>
          </article>)}
        </div>
      </details> : null}

      {summary.audit?.checkpoints?.length ? <div className="border-b border-slate-200 bg-slate-50/60 p-6 sm:p-8" data-testid="stroke-phase-rubric">
        {summary.audit.version.includes("two-handed-backhand") ? <span className="sr-only" data-testid="backhand-seven-phase-rubric">Two-handed backhand phase rubric</span> : null}
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-violet-800">Feet · knees · hips · shoulders · hands · head · racket</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Open the complete {summary.audit.checkpoints.length}-phase technical report</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">Your plain-English answer stays first. This drill-down applies the stroke-specific guide to every body link and labels racket-, ball-, and sensor-only details as “Confirm.”</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{summary.audit.checkpoints.length} phases</span></div></summary>
          <div className="mt-6 border-t border-slate-100 pt-6"><p className="text-sm leading-7 text-slate-700">{summary.audit.synthesis}</p><p className="mt-3 rounded-xl bg-violet-50 px-4 py-3 text-xs leading-6 text-violet-950"><span className="font-semibold">How to read this:</span> {summary.audit.stylePrinciple}</p><div className="mt-5 grid gap-4 lg:grid-cols-2">
            {summary.audit.checkpoints.map((phase) => <article key={phase.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950 text-xs font-bold text-white">{phase.step}</span><h4 className="font-semibold text-slate-950">{phase.label}</h4></div><span className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide ${frameworkStyle[phase.status]}`}>{frameworkLabel[phase.status]}</span></div><p className="mt-3 text-sm leading-6 text-slate-700">{phase.summary}</p><p className="mt-3 rounded-xl bg-blue-950 px-3 py-2.5 text-xs font-semibold text-white">“{phase.cue}”</p>{phase.bodyChecks?.length ? <div className="mt-4 space-y-2">{phase.bodyChecks.map((check) => <div key={check.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3"><div className="flex flex-wrap items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${check.status === "working" ? "bg-emerald-500" : check.status === "priority" ? "bg-amber-500" : check.status === "confirm" ? "bg-violet-500" : "bg-blue-500"}`} /><p className="text-xs font-semibold text-slate-900">{check.bodyPart}</p>{check.status === "confirm" ? <span className="text-[0.58rem] font-semibold uppercase tracking-wide text-violet-700">Confirm</span> : null}</div><p className="mt-1 text-[0.7rem] leading-5 text-slate-600">{check.finding}</p>{check.cameraBoundary ? <p className="mt-1 text-[0.64rem] leading-5 text-slate-400">Camera limit: {check.cameraBoundary}</p> : null}</div>)}</div> : null}<div className="mt-4 space-y-1 text-[0.65rem] leading-5 text-slate-500"><p><span className="font-semibold text-slate-700">Measured:</span> {phase.measurement}</p><p><span className="font-semibold text-slate-700">Coach context:</span> {phase.contextNote}</p><p><span className="font-semibold text-slate-700">Camera limit:</span> {phase.cameraBoundary}</p></div></article>)}
          </div></div>
        </details>
      </div> : null}

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" />What is working</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep these qualities while making the correction.</p>
          <div className="mt-5 space-y-3">
            {summary.strengths.map((point) => <article key={point.id} data-testid={`summary-point-${point.id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><h2 className="text-lg font-semibold text-slate-950">{point.title}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{point.summary}</p><p className="mt-3 text-xs leading-6 text-emerald-900"><span className="font-semibold">Why it helps:</span> {point.whyItMatters}</p><button type="button" onClick={() => showPoint(point, "body")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"><ListChecks className="h-4 w-4" />See the supporting detail</button></article>)}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><ArrowDown className="h-5 w-5" />What to improve, in order</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Work from number one downward. Do not try to change all three at once.</p>
          <div className="mt-5 space-y-3">
            {summary.improvements.map((point, index) => <article key={point.id} data-testid={`summary-point-${point.id}`} className={`rounded-2xl border p-5 ${index === 0 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}><div className="flex gap-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500 text-white" : "bg-white text-slate-600"}`}>{index + 1}</span><div><h2 className="text-lg font-semibold text-slate-950">{point.title}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{point.summary}</p><p className="mt-3 text-xs leading-6 text-slate-500"><span className="font-semibold text-slate-700">Why it matters:</span> {point.whyItMatters}</p>{point.cue ? <p className="mt-3 text-sm font-semibold text-blue-950">Feel: “{point.cue}”</p> : null}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => showPoint(point, "video")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#071b2d] px-3 text-xs font-semibold text-white hover:bg-[#0d2b42]"><Eye className="h-4 w-4" />See it on video</button><button type="button" onClick={() => showPoint(point, "body")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100"><ListChecks className="h-4 w-4" />Open this breakdown</button></div></div></div></article>)}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-[#102f50] p-6 text-white sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Start with this one change</p><h2 className="mt-2 text-2xl font-semibold">{summary.firstAction.title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-blue-100/80">{summary.firstAction.reason}</p><p className="mt-4 text-xl font-semibold">“{summary.firstAction.cue}”</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Dumbbell className="h-4 w-4 text-emerald-300" />Next drill</div><p className="mt-2 font-semibold">{summary.firstAction.drillName}</p><p className="mt-2 text-xs leading-6 text-blue-100/70">Done when: {summary.firstAction.successMetric}</p><a href="#practice-reassess" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-blue-950 hover:bg-blue-50">Go to the drill<ArrowDown className="h-4 w-4" /></a></div>
        </div>
      </div>
    </section>
  );
}
