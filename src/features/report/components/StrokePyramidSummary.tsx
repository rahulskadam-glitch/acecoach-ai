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
            {summary.improvements.map((point, index) => <article key={point.id} data-testid={`summary-point-${point.id}`} className={`rounded-2xl border p-5 ${index === 0 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}><div className="flex gap-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500 text-white" : "bg-white text-slate-600"}`}>{index + 1}</span><div><h2 className="text-lg font-semibold text-slate-950">{point.title}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{point.summary}</p><p className="mt-3 text-xs leading-6 text-slate-500"><span className="font-semibold text-slate-700">Why it matters:</span> {point.whyItMatters}</p>{point.cue ? <p className="mt-3 text-sm font-semibold text-blue-950">Feel: “{point.cue}”</p> : null}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => showPoint(point, "video")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#123049] px-3 text-xs font-semibold text-white hover:bg-[#1a4060]"><Eye className="h-4 w-4" />See it on video</button><button type="button" onClick={() => showPoint(point, "body")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100"><ListChecks className="h-4 w-4" />Open this breakdown</button></div></div></div></article>)}
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
