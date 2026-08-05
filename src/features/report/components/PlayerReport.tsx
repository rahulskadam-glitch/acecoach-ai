import { AlertTriangle, BadgeCheck, BookOpenCheck, CheckCircle2, Eye, Share2, Sparkles, Target } from "lucide-react";

import CoachAudioSummary from "@/components/analysis/CoachAudioSummary";
import ReportActions from "@/components/analysis/ReportActions";
import ReportFeedback from "@/components/analysis/ReportFeedback";
import SecureCoachShare from "@/components/analysis/SecureCoachShare";
import { getSport } from "@/lib/sports";
import type { PlayerReportProps } from "../types";
import AdvancedAnalysisSection from "./AdvancedAnalysisSection";
import CoachSummarySection from "./CoachSummarySection";
import PracticeAndReassessmentSection from "./PracticeAndReassessmentSection";
import SynchronizedHumanComparison from "./SynchronizedHumanComparison";
import ThreeImprovementsSection from "./ThreeImprovementsSection";
import ReportTrustStrip from "./ReportTrustStrip";

const NAV_ITEMS = [
  { id: "coach-summary", label: "Coach summary", icon: Sparkles },
  { id: "watch-compare", label: "Watch & compare", icon: Eye },
  { id: "improvements", label: "Improvements", icon: Target },
  { id: "practice-reassess", label: "Practice", icon: BookOpenCheck },
];

export default function PlayerReport(props: PlayerReportProps) {
  const { report, sportId, actionType, fileName, athleteContext, videoUrl } = props;
  const sport = getSport(sportId);
  const selectedMovement = sport.actions.find((item) => item.id === actionType)?.label ?? actionType.replaceAll("_", " ");
  const classification = report.movementClassification;
  const movement = classification?.analysisActionLabel ?? selectedMovement;
  const needsConfirmation = report.qualityGate.sportSupported !== false && !report.qualityGate.movementConfirmed;
  const blocked = !report.qualityGate.capturePassed || !report.qualityGate.repetitionDetected;

  return (
    <div className="min-w-0 space-y-6">
      <nav className="sticky top-3 z-30 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/92 p-2 shadow-xl shadow-black/25 backdrop-blur print:hidden" aria-label="Report sections">
        <div className="flex min-w-max gap-1">{NAV_ITEMS.map(({ id, label, icon: Icon }, index) => <button key={id} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${index === 1 ? "border border-violet-400/30 bg-violet-400/15 font-semibold text-violet-100" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] px-5 py-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">AceCoach v5.0 · Review-Led Athlete Improvement</p><p className="mt-1 text-sm text-slate-300">Four-section player report · clean video by default · reliability gates · action and reassessment</p></div>
        <div className="flex flex-wrap gap-2"><CoachAudioSummary report={report} /><ReportActions report={report} /></div>
      </div>

      {classification ? (
        <section className={`rounded-2xl border p-5 ${needsConfirmation ? "border-amber-500/30 bg-amber-500/[0.08]" : "border-emerald-500/20 bg-emerald-500/[0.06]"}`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl"><div className="flex items-center gap-2">{needsConfirmation ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : <BadgeCheck className="h-5 w-5 text-emerald-300" />}<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Movement check</p></div><p className="mt-2 text-lg font-semibold text-white">AceCoach detected {classification.detectedLabel} ({Math.round(classification.confidence * 100)}% confidence)</p><p className="mt-2 text-sm leading-6 text-slate-400">You selected {classification.selectedLabel}. {needsConfirmation ? "Confirm the movement before trusting movement-specific coaching." : "The movement label is ready for coaching."}</p></div>
            {needsConfirmation ? <div className="grid w-full gap-2 sm:w-auto sm:min-w-[280px]"><form action={props.onConfirmMovement}><input type="hidden" name="actionType" value={classification.detectedAction} /><button type="submit" className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">Use detected movement</button></form><form action={props.onConfirmMovement}><input type="hidden" name="actionType" value={classification.selectedAction} /><button type="submit" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">Keep my selection</button></form></div> : null}
          </div>
        </section>
      ) : null}

      {blocked ? <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.07] p-5"><div className="flex items-center gap-2 text-rose-200"><AlertTriangle className="h-5 w-5" /><p className="font-semibold">The video did not pass the reliability check</p></div><p className="mt-3 text-sm leading-7 text-slate-300">AceCoach withheld detailed scoring rather than giving unreliable advice. Record again using the guidance below.</p><ul className="mt-4 space-y-2 text-sm text-slate-400">{report.qualityGate.messages.map((item) => <li key={item}>• {item}</li>)}</ul></section> : null}

      <ReportTrustStrip report={report} />

      <CoachSummarySection report={report} sportName={sport.name} movement={movement} fileName={fileName} />

      <SynchronizedHumanComparison videoUrl={videoUrl} report={report} sportId={sportId} actionType={classification?.analysisAction ?? actionType} athleteContext={athleteContext} />

      <ThreeImprovementsSection report={report} />

      <PracticeAndReassessmentSection report={report} practicePlan={props.practicePlan} onToggle={props.onTogglePractice} onReady={props.onReadyForReassessment} onCheckin={props.onPracticeCheckin} checkins={props.practiceCheckins} />

      <AdvancedAnalysisSection report={report} progressComparison={props.progressComparison} />

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-1"><div className="flex items-center gap-2 px-5 pt-4 text-sm font-semibold text-white"><Share2 className="h-4 w-4 text-violet-300" />Share with a coach</div><SecureCoachShare onCreate={props.onCreateShare} onRevoke={props.onRevokeShare} /></div>
        <ReportFeedback existing={props.feedback} onSubmit={props.onSubmitFeedback} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-white">Report review status</p><p className="mt-1 text-sm text-slate-500">Marking reviewed records that you have seen the feedback. It does not change the analysis.</p></div>{props.isReviewed ? <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />Reviewed</div> : <form action={props.onMarkReviewed}><button type="submit" className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950">Mark reviewed</button></form>}</div></section>
    </div>
  );
}
