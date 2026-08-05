"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, Dumbbell, FlaskConical, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";

import { getSport } from "@/lib/sports";
import type { PlayerReportProps } from "../types";
import { buildPlayerReportView } from "../model/view-model";
import { concise, plainLanguage } from "../model/plain-language";
import BiomechanicalExplorer from "./BiomechanicalExplorer";
import BodyCoachingChapters from "./BodyCoachingChapters";
import CoachVisionStudio from "./CoachVisionStudio";
import StrokePyramidSummary from "./StrokePyramidSummary";

export default function V6PlayerReport(props: PlayerReportProps & { sessionId: string; previewOnly?: boolean }) {
  const { report, sportId, actionType, fileName, athleteContext, videoUrl, sessionId, previewOnly = false } = props;
  const sport = getSport(sportId);
  const view = buildPlayerReportView(report);
  const movement = report.movementClassification?.analysisActionLabel
    ?? sport.actions.find((item) => item.id === actionType)?.label
    ?? actionType.replaceAll("_", " ");
  const supporting = view.improvements.slice(0, 2);
  const drill = report.drills[0];
  const extraDrill = report.drills[1];
  const coachingReferences = report.evidence.filter((item) => item.level === "public_coaching_reference");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">AceCoach · Simple player report</p>
          <p className="mt-1 text-sm text-slate-500">{sport.name} · {movement} · {fileName}</p>
        </div>
        <a href={`/coach/${sessionId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F6A] px-4 text-sm font-semibold text-white hover:bg-[#103554]"><MessageCircle className="h-4 w-4" />Ask your coach</a>
      </div>

      <StrokePyramidSummary report={report} movement={movement} />

      <CoachVisionStudio videoUrl={videoUrl} previewOnly={previewOnly} report={report} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} actionOptions={sport.actions} athleteContext={athleteContext} />

      <BodyCoachingChapters report={report} actionType={report.movementClassification?.analysisAction ?? actionType} />

      <section id="practice-reassess" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800"><Dumbbell className="h-4 w-4" />3 · Practise it</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Do one drill next</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Keep the session simple. Work on this change before adding anything else.</p>

        {drill ? <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Your drill</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">{plainLanguage(drill.name)}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">{concise(drill.purpose, 170)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Do</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{plainLanguage(drill.dosage)}</p></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Think</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-950">“{plainLanguage(drill.cue)}”</p></div>
              <div className="rounded-2xl bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Done when</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{plainLanguage(drill.successMetric)}</p></div>
            </div>
          </article>

          <aside className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-2 font-semibold text-blue-950"><RotateCcw className="h-5 w-5" />Record again later</div>
            <p className="mt-4 text-sm leading-7 text-slate-700">Practise this change for two focused sessions. Then record from the same angle so AceCoach can compare fairly.</p>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-950">Success looks like:</span><br />{view.successTarget}</div>
            <a href={`/start?sport=${sportId}`} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173F6A] px-4 text-sm font-semibold text-white hover:bg-[#103554]">Record next session<ArrowRight className="h-4 w-4" /></a>
          </aside>
        </div> : <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">Use the cue “{view.coachingCue}” during a small set of slow, balanced movements.</div>}
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-2">
          <span><span className="block font-semibold text-slate-950">Supporting coaching notes</span><span className="mt-1 block text-sm text-slate-500">Optional: read the secondary observations after understanding the main visual correction.</span></span>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </summary>
        <div className="mt-4 space-y-5 border-t border-slate-200 pt-5">
          {supporting.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{supporting.map((item) => <article key={item.rank} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Extra note {item.rank}</p><h3 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.whatWeSaw}</p><p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-800"><span className="font-semibold">Cue:</span> “{item.cue}”</p></article>)}</div> : null}
          {extraDrill ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Optional second drill</p><p className="mt-2 font-semibold text-slate-950">{plainLanguage(extraDrill.name)}</p><p className="mt-2 text-sm leading-7 text-slate-700">{plainLanguage(extraDrill.dosage)} · “{plainLanguage(extraDrill.cue)}”</p></div> : null}
        </div>
      </details>

      <details id="movement-map" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-2">
          <span className="flex items-center gap-3"><FlaskConical className="h-5 w-5 text-blue-800" /><span><span className="block font-semibold text-slate-950">All 106 biomechanical checks</span><span className="mt-1 block text-sm text-slate-500">Evidence library for coaches and curious players. Your main lesson is above.</span></span></span>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </summary>
        <div className="mt-4 border-t border-slate-200 pt-5"><BiomechanicalExplorer profile={report.frameSummary?.biomechanicalProfile} sessionId={sessionId} actionType={report.movementClassification?.analysisAction ?? actionType} /></div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-2">
          <span className="flex items-center gap-3"><FlaskConical className="h-5 w-5 text-blue-800" /><span><span className="block font-semibold text-slate-950">Technical details</span><span className="mt-1 block text-sm text-slate-500">Optional: confidence, capture quality, measurements, and limits.</span></span></span>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </summary>
        <div className="mt-4 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4 text-sm"><span className="text-slate-500">Analysis confidence</span><p className="mt-1 font-semibold text-slate-950">{view.confidence}%</p></div><div className="rounded-xl bg-white p-4 text-sm"><span className="text-slate-500">Capture quality</span><p className="mt-1 font-semibold capitalize text-slate-950">{view.captureQuality}</p></div></div>
            <div className="mt-4 space-y-3 text-sm">{report.metricScores.slice(0, 8).map((metric) => <div key={metric.id} className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3"><span className="text-slate-600">{plainLanguage(metric.label)}</span><span className="text-right font-semibold text-slate-950">{typeof metric.score === "number" ? Math.round(metric.score) : "—"}<span className="ml-2 rounded-full bg-white px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">estimate</span></span></div>)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-center gap-2 font-semibold text-slate-950"><BadgeCheck className="h-4 w-4 text-emerald-700" />What this analysis cannot claim</div><p className="mt-3 text-sm leading-7 text-slate-600">{report.safetyNote}</p><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-500">{report.limitations.slice(0, 6).map((item) => <li key={item}>• {item}</li>)}</ul><div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><ShieldCheck className="h-4 w-4" />Original video preserved</div></div>
        </div>
        {coachingReferences.length ? <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Coaching references used</p><p className="mt-2 text-sm leading-6 text-slate-600">These sources inform coaching language and context. They do not change the measured score, create a professional-player comparison, or override the camera evidence.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{coachingReferences.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border border-blue-100 bg-white p-4 text-sm hover:border-blue-300"><span className="font-semibold text-slate-950">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.organization}{item.year ? ` · ${item.year}` : ""}</span></a>)}</div></div> : null}
      </details>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-700" />One change. One clip. One drill.</div><a href={`/coach/${sessionId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F6A] px-5 text-sm font-semibold text-white hover:bg-[#103554]">Ask AceCoach about this report<ArrowRight className="h-4 w-4" /></a></div>
    </div>
  );
}
