"use client";

import { ArrowRight, BadgeCheck, ChevronDown, Dumbbell, Eye, FlaskConical, LayoutDashboard, MessageCircle, MessageSquareHeart, RotateCcw, ShieldCheck, } from "lucide-react";
import { useState } from "react";

import { getSport } from "@/lib/sports";
import type { PlayerReportProps } from "../types";
import { buildPlayerReportView } from "../model/view-model";
import { concise, plainLanguage } from "../model/plain-language";
import BiomechanicalExplorer from "./BiomechanicalExplorer";
import BodyCoachingChapters from "./BodyCoachingChapters";
import CoachVisionStudio from "./CoachVisionStudio";
import ReportOverviewStory from "./ReportOverviewStory";
import StrokePyramidSummary from "./StrokePyramidSummary";

export default function V6PlayerReport(props: PlayerReportProps & { sessionId: string; previewOnly?: boolean }) {
  const { report, sportId, actionType, athleteContext, videoUrl, sessionId, progressComparison, personalBaselineComparison, previewOnly = false } = props;
  const sport = getSport(sportId);
  const view = buildPlayerReportView(report);
  const [detailView, setDetailView] = useState<"stroke" | "checks" | "method">("stroke");
  const movement = report.movementClassification?.analysisActionLabel
    ?? sport.actions.find((item) => item.id === actionType)?.label
    ?? actionType.replaceAll("_", " ");
  const drills = [...report.drills];
  for (const finding of report.ontologyReasoning?.findings ?? []) {
    if (drills.length >= 3 || !finding.drill || drills.some((item) => item.id === finding.drill?.id)) continue;
    drills.push({ id: finding.drill.id, name: finding.drill.name, purpose: finding.drill.purpose ?? finding.why, cue: finding.drill.cue ?? finding.cue, dosage: finding.drill.dosage, successMetric: finding.drill.success });
  }
  const practiceDrills = drills.slice(0, 3);
  const firstDrill = practiceDrills[0];
  const coachChatAvailable = report.knowledgeControl?.status === "CONTROLLED"
    && report.knowledgeControl?.domains?.recommendations?.decision === "ontology_fault_links";

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <header className="flex items-center justify-between gap-4 px-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{movement} · Report</h1>
        {coachChatAvailable ? (
          <a href={`/coach/${sessionId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm"><MessageCircle className="h-4 w-4" />Ask coach</a>
        ) : (
          <span
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-500"
            title="Your coach can weigh in once this report reaches a confirmed technique finding. Record a few more clear swings to get there."
          >
            <MessageCircle className="h-4 w-4" />Coach unlocks with more data
          </span>
        )}
      </header>

      <nav aria-label="Report chapters" className="sticky top-[4.25rem] z-30 grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl lg:top-4">
        {[{ href: "#report-overview", label: "Coach Read", icon: LayoutDashboard }, { href: "#key-moment", label: "Video Lesson", icon: Eye }, { href: "#practice-reassess", label: "Practice", icon: Dumbbell }].map((item) => <a key={item.href} href={item.href} className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"><item.icon className="h-4 w-4 text-blue-800" />{item.label}</a>)}
      </nav>

      <ReportOverviewStory report={report} sportId={sportId} actionType={report.movementClassification?.analysisAction ?? actionType} athleteContext={athleteContext} movement={movement} progressComparison={progressComparison} personalBaselineComparison={personalBaselineComparison} mode="verdict" />

      <CoachVisionStudio videoUrl={videoUrl} previewOnly={previewOnly} report={report} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} actionOptions={sport.actions} athleteContext={athleteContext} />

      <ReportOverviewStory report={report} sportId={sportId} actionType={report.movementClassification?.analysisAction ?? actionType} athleteContext={athleteContext} movement={movement} progressComparison={progressComparison} personalBaselineComparison={personalBaselineComparison} mode="details" />

      <section id="practice-reassess" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-800"><Dumbbell className="h-4 w-4" />Practice</div>
        {firstDrill ? <>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{plainLanguage(firstDrill.name)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{concise(firstDrill.purpose, 150)}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">Do</p><p className="mt-2 text-sm font-semibold leading-6">{plainLanguage(firstDrill.dosage)}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-700">Cue</p><p className="mt-2 text-sm font-semibold leading-6">“{plainLanguage(firstDrill.cue)}”</p></div>
            <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[0.65rem] font-bold uppercase tracking-wide text-blue-800">Ready when</p><p className="mt-2 text-sm font-semibold leading-6">{plainLanguage(firstDrill.successMetric)}</p></div>
          </div>
          {practiceDrills.length > 1 ? <details className="group mt-4 rounded-2xl border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">More drills <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="space-y-3 border-t border-slate-200 p-4">{practiceDrills.slice(1).map((drill, index) => <article key={drill.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step {index + 2}</p><h3 className="mt-1 font-semibold">{plainLanguage(drill.name)}</h3><p className="mt-2 text-sm text-slate-600">{plainLanguage(drill.dosage)} · “{plainLanguage(drill.cue)}”</p></article>)}</div></details> : null}
        </> : <p className="mt-3 text-sm leading-6 text-slate-600">Use the cue “{view.coachingCue}” for a small set of slow, balanced repetitions.</p>}
        <a href={`/start?sport=${sportId}`} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#071b2d] px-5 text-sm font-semibold text-white">Record after practice<RotateCcw className="h-4 w-4" /></a>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><span className="flex items-center gap-3"><FlaskConical className="h-5 w-5 text-blue-800" /><span><span className="block font-semibold">Deep Dive</span><span className="mt-1 block text-xs text-slate-500">How the coaching read was built</span></span></span><ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" /></summary>
        <div className="border-t border-slate-200 p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
            {[{ id: "stroke" as const, label: "Coaching detail" }, { id: "checks" as const, label: "Measurements" }, { id: "method" as const, label: "Limits" }].map((item) => <button key={item.id} type="button" role="tab" aria-selected={detailView === item.id} onClick={() => setDetailView(item.id)} className={`min-h-10 rounded-lg px-2 text-xs font-semibold ${detailView === item.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{item.label}</button>)}
          </div>
          <div className="mt-5" role="tabpanel">
            {detailView === "stroke" ? <div className="space-y-5"><StrokePyramidSummary report={report} movement={movement} /><BodyCoachingChapters report={report} actionType={report.movementClassification?.analysisAction ?? actionType} /></div> : null}
            {detailView === "checks" ? <BiomechanicalExplorer profile={report.frameSummary?.biomechanicalProfile} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} /> : null}
            {detailView === "method" ? <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Confidence</span><p className="mt-1 font-semibold">{view.confidence}%</p></div><div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="text-slate-500">Capture</span><p className="mt-1 font-semibold capitalize">{view.captureQuality}</p></div></div><div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-4 w-4 text-emerald-700" />Boundaries</div><p className="mt-2 text-sm leading-6 text-slate-600">{report.safetyNote}</p><ul className="mt-3 space-y-2 text-sm text-slate-500">{report.limitations.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}</ul><div className="mt-4 flex items-center gap-2 text-sm text-emerald-800"><ShieldCheck className="h-4 w-4" />Original video preserved</div></div></div> : null}
          </div>
        </div>
      </details>

      <div className="grid gap-2 sm:grid-cols-2"><a href="/feedback?stage=report" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-800"><MessageSquareHeart className="h-4 w-4" />Rate report</a><a href={`/coach/${sessionId}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#071b2d] px-4 text-sm font-semibold text-white">Ask about this report<ArrowRight className="h-4 w-4" /></a></div>

    </div>
  );
}
