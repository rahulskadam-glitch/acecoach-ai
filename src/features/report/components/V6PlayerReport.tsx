"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, Dumbbell, FlaskConical, MessageCircle, Play, RotateCcw, Route, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { getSport } from "@/lib/sports";
import type { PlayerReportProps } from "../types";
import { buildPlayerReportView } from "../model/view-model";
import { concise, plainLanguage } from "../model/plain-language";
import BiomechanicalExplorer from "./BiomechanicalExplorer";
import BodyCoachingChapters from "./BodyCoachingChapters";
import CoachVisionStudio from "./CoachVisionStudio";
import CompleteStrokeReview from "./CompleteStrokeReview";
import StrokePyramidSummary from "./StrokePyramidSummary";

export default function V6PlayerReport(props: PlayerReportProps & { sessionId: string; previewOnly?: boolean }) {
  const { report, sportId, actionType, fileName, athleteContext, videoUrl, sessionId, previewOnly = false } = props;
  const sport = getSport(sportId);
  const view = buildPlayerReportView(report);
  const [detailView, setDetailView] = useState<"stroke" | "checks" | "method">("stroke");
  const movement = report.movementClassification?.analysisActionLabel
    ?? sport.actions.find((item) => item.id === actionType)?.label
    ?? actionType.replaceAll("_", " ");
  const drills = [...report.drills];
  for (const finding of report.ontologyReasoning?.findings ?? []) {
    if (drills.length >= 3 || !finding.drill || drills.some((item) => item.id === finding.drill?.id)) continue;
    drills.push({
      id: finding.drill.id,
      name: finding.drill.name,
      purpose: finding.drill.purpose ?? finding.why,
      cue: finding.drill.cue ?? finding.cue,
      dosage: finding.drill.dosage,
      successMetric: finding.drill.success,
    });
  }
  const practiceDrills = drills.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">AceCoach · Simple player report</p>
          <p className="mt-1 text-sm text-slate-500">{sport.name} · {movement} · {fileName}</p>
        </div>
        <a href={`/coach/${sessionId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F6A] px-4 text-sm font-semibold text-white hover:bg-[#103554]"><MessageCircle className="h-4 w-4" />Ask your coach</a>
      </div>

      <nav aria-label="Your coaching journey" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-px bg-slate-200 md:grid-cols-3">
          {[{ href: "#stroke-story", number: "1", icon: Route, title: "Understand", copy: "See the whole stroke and its main cause." }, { href: "#key-moment", number: "2", icon: Play, title: "See it", copy: "Watch the correction on your movement." }, { href: "#practice-reassess", number: "3", icon: Dumbbell, title: "Train it", copy: "Use one cue, one drill, then reassess." }].map((step) => <a key={step.number} href={step.href} className="group flex items-center gap-4 bg-white p-4 transition hover:bg-slate-50 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-bold text-white">{step.number}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-slate-950"><step.icon className="h-4 w-4 text-blue-800" />{step.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{step.copy}</span></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-800" /></a>)}
        </div>
      </nav>

      <CompleteStrokeReview report={report} />

      <CoachVisionStudio videoUrl={videoUrl} previewOnly={previewOnly} report={report} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} actionOptions={sport.actions} athleteContext={athleteContext} />

      <section id="practice-reassess" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800"><Dumbbell className="h-4 w-4" />3 · Practise it</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Your three-drill improvement plan</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Work through these in order. Drill 1 builds the movement, Drill 2 connects the next weakness, and Drill 3 helps the improved stroke hold up in a more complete repetition.</p>

        {practiceDrills.length ? <div className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {practiceDrills.map((drill, index) => {
              const stage = ["Build the pattern", "Connect the stroke", "Make it repeatable"][index];
              return <article key={drill.id} className={`relative overflow-hidden rounded-3xl border p-5 ${index === 0 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${index === 0 ? "bg-emerald-700" : "bg-blue-950"}`}>{index + 1}</span><span className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-slate-500">{stage}</span></div>
                <h3 className="mt-4 text-xl font-semibold leading-7 text-slate-950">{plainLanguage(drill.name)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{concise(drill.purpose, 150)}</p>
                <div className="mt-5 space-y-2.5">
                  <div className="rounded-2xl bg-white p-3.5"><p className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-500">Do</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-950">{plainLanguage(drill.dosage)}</p></div>
                  <div className="rounded-2xl bg-white p-3.5"><p className="text-[0.62rem] font-semibold uppercase tracking-wide text-emerald-700">Feel</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-950">“{plainLanguage(drill.cue)}”</p></div>
                  <div className="rounded-2xl bg-white p-3.5"><p className="text-[0.62rem] font-semibold uppercase tracking-wide text-blue-800">Move on when</p><p className="mt-1 text-xs leading-5 text-slate-700">{plainLanguage(drill.successMetric)}</p></div>
                </div>
              </article>;
            })}
          </div>

          <aside className="mt-5 grid gap-5 rounded-3xl border border-blue-100 bg-blue-50 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
            <div className="flex items-center gap-2 font-semibold text-blue-950"><RotateCcw className="h-5 w-5" />Record again later</div>
            <p className="mt-2 text-sm leading-7 text-slate-700">Complete the three drills across two focused sessions. Then record from the same angle so AceCoach can compare fairly.</p>
            <p className="mt-2 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-950">Success looks like:</span> {view.successTarget}</p>
            </div>
            <a href={`/start?sport=${sportId}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173F6A] px-5 text-sm font-semibold text-white hover:bg-[#103554]">Record next session<ArrowRight className="h-4 w-4" /></a>
          </aside>
        </div> : <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">Use the cue “{view.coachingCue}” during a small set of slow, balanced movements.</div>}
      </section>

      <details id="movement-map" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-2">
          <span className="flex items-center gap-3 p-2"><FlaskConical className="h-5 w-5 text-blue-800" /><span><span className="block font-semibold text-slate-950">Supporting analysis</span><span className="mt-1 block text-sm text-slate-500">The full stroke map, all biomechanical checks, and methodology—organized in one place.</span></span></span>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </summary>
        <div className="border-t border-slate-200 p-4 sm:p-6">
          <div className="grid gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-3" role="tablist" aria-label="Supporting analysis views">
            {[{ id: "stroke" as const, label: "Full stroke", copy: "Phase-by-phase coaching" }, { id: "checks" as const, label: "106 checks", copy: "Biomechanical evidence" }, { id: "method" as const, label: "Method & limits", copy: "Confidence and camera limits" }].map((item) => <button key={item.id} type="button" role="tab" aria-selected={detailView === item.id} onClick={() => setDetailView(item.id)} className={`rounded-xl px-4 py-3 text-left transition ${detailView === item.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-[0.68rem]">{item.copy}</span></button>)}
          </div>
          <div className="mt-6" role="tabpanel">
            {detailView === "stroke" ? <div className="space-y-6"><StrokePyramidSummary report={report} movement={movement} /><BodyCoachingChapters report={report} actionType={report.movementClassification?.analysisAction ?? actionType} /></div> : null}
            {detailView === "checks" ? <BiomechanicalExplorer profile={report.frameSummary?.biomechanicalProfile} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} /> : null}
            {detailView === "method" ? <div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4 text-sm"><span className="text-slate-500">Analysis confidence</span><p className="mt-1 font-semibold text-slate-950">{view.confidence}%</p></div><div className="rounded-xl bg-white p-4 text-sm"><span className="text-slate-500">Capture quality</span><p className="mt-1 font-semibold capitalize text-slate-950">{view.captureQuality}</p></div></div><div className="mt-4 space-y-3 text-sm">{report.metricScores.slice(0, 8).map((metric) => <div key={metric.id} className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3"><span className="text-slate-600">{plainLanguage(metric.label)}</span><span className="text-right font-semibold text-slate-950">{typeof metric.score === "number" ? Math.round(metric.score) : "—"}<span className="ml-2 rounded-full bg-white px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">estimate</span></span></div>)}</div></div><div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-center gap-2 font-semibold text-slate-950"><BadgeCheck className="h-4 w-4 text-emerald-700" />What this analysis cannot claim</div><p className="mt-3 text-sm leading-7 text-slate-600">{report.safetyNote}</p><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-500">{report.limitations.slice(0, 6).map((item) => <li key={item}>• {item}</li>)}</ul><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950"><span className="font-semibold">About weight transfer:</span> AceCoach evaluates the visible load-and-drive sequence from the legs into the trunk. A phone camera cannot measure force or exact body weight.</div><div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><ShieldCheck className="h-4 w-4" />Original video preserved</div></div></div> : null}
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Full diagnosis. One clear starting point.</div><a href={`/coach/${sessionId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F6A] px-5 text-sm font-semibold text-white hover:bg-[#103554]">Ask AceCoach about this report<ArrowRight className="h-4 w-4" /></a></div>
    </div>
  );
}
