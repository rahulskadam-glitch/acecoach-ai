"use client";

import {
  Activity,
  CircleHelp,
  Eye,
  Footprints,
  Gauge,
  Hand,
  PersonStanding,
  ScanFace,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AnalysisReport, BiomechanicalMetric } from "@/modules/analysis/types";
import { concise, plainLanguage } from "../model/plain-language";

type BodyReview = NonNullable<NonNullable<AnalysisReport["frameSummary"]>["bodyRegionReview"]>[number];

const CHAPTERS = [
  { id: "head", title: "Head & eyes", icon: ScanFace, regions: ["head"], area: "body_position", phase: "contact", cue: "See the ball through the strike." },
  { id: "hands", title: "Hands & space", icon: Hand, regions: ["hitting_hand", "support_hand", "arms", "hitting_arm", "support_arm"], area: "contact_spacing", phase: "contact", cue: "Make space. Meet it in front." },
  { id: "grip", title: "Grip & racket", icon: CircleHelp, regions: [], area: "", phase: "contact", cue: "Confirm the grip before the next set." },
  { id: "backlift", title: "Shoulders & backlift", icon: Activity, regions: ["shoulders", "trunk", "hitting_shoulder", "support_shoulder"], area: "backlift_preparation", phase: "preparation", cue: "Turn together. Let the racket organize behind you." },
  { id: "hips", title: "Hips & transfer", icon: Gauge, regions: ["pelvis", "balance", "hitting_hip", "support_hip"], area: "lower_body_loading", phase: "loading", cue: "Load first. Transfer through the shot." },
  { id: "knees", title: "Knees & height", icon: PersonStanding, regions: ["left_leg", "right_leg", "hitting_leg", "support_leg", "lower_body"], area: "lower_body_loading", phase: "loading", cue: "Stay low into the hit. Rise after the ball." },
  { id: "feet", title: "Feet & base", icon: Footprints, regions: ["base", "hitting_ankle", "support_ankle"], area: "footwork_base", phase: "preparation", cue: "Adjust, set, hit, recover." },
  { id: "finish", title: "Finish & balance", icon: Sparkles, regions: ["balance", "repeatability", "timing"], area: "ending_position", phase: "follow_through", cue: "Finish balanced, then recover." },
] as const;

const STATUS = {
  strength: { label: "Keep", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800", border: "border-emerald-200" },
  developing: { label: "Watch", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-800", border: "border-blue-200" },
  priority: { label: "Fix", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-900", border: "border-amber-200" },
  needs_confirmation: { label: "Confirm", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-800", border: "border-violet-200" },
  not_visible: { label: "Not clear", dot: "bg-slate-300", pill: "bg-slate-100 text-slate-600", border: "border-slate-200" },
} as const;

function actionCue(actionType: string, id: string, fallback: string) {
  if (actionType === "two_handed_backhand") {
    if (id === "hands") return "Two hands together. Meet it in front.";
    if (id === "backlift") return "High hands, back shoulder under the chin.";
    if (id === "finish") return "Finish high and away — rhino nose.";
  }
  if (actionType === "one_handed_backhand") {
    if (id === "backlift") return "Racket up, back shoulder to the ball.";
    if (id === "hands") return "Step to space. Reach through in front.";
  }
  if (actionType === "serve" && id === "hands") return "Loose arm. Reach up through contact.";
  return fallback;
}

function phaseTime(report: AnalysisReport, phase: string) {
  const aliases: Record<string, string[]> = {
    preparation: ["ready", "preparation"],
    loading: ["loading"],
    contact: ["contact_proxy", "contact"],
    follow_through: ["follow_through", "recovery"],
  };
  return report.movementTimeline?.find((item) => aliases[phase]?.includes(item.phase))?.timestampSeconds ?? null;
}

function fallbackReviews(report: AnalysisReport, actionType: string): BodyReview[] {
  const metrics = report.frameSummary?.biomechanicalProfile?.metrics ?? [];
  return CHAPTERS.map((chapter) => {
    const area = report.coachingAreas?.find((item) => item.id === chapter.area);
    const evidence = metrics
      .filter((item) => item.status === "available" && (chapter.regions as readonly string[]).includes(item.region))
      .slice(0, 3)
      .map((item: BiomechanicalMetric) => ({ id: item.id, label: item.label, displayValue: item.displayValue, confidence: item.confidence, measurementBasis: item.measurementBasis }));
    if (chapter.id === "grip") {
      return {
        id: chapter.id,
        title: chapter.title,
        status: "needs_confirmation" as const,
        coachNote: "I cannot identify your grip or racket-face angle reliably from body landmarks alone. Tell Athlentra the grip, or record a close side view where the hand and handle are clear.",
        whyItMatters: "Grip changes the natural contact height, arm shape, spin window, and racket-face behavior.",
        cue: chapter.cue,
        phase: chapter.phase,
        timestampSeconds: phaseTime(report, chapter.phase),
        measurementStatus: "athlete_confirmation" as const,
        evidence: [],
      };
    }
    return {
      id: chapter.id,
      title: chapter.title,
      status: area?.status ?? (evidence.length > 0 ? "developing" : "not_visible"),
      coachNote: area?.observation ?? (evidence.length > 0 ? `I checked ${evidence.slice(0, 2).map((item) => item.label.toLowerCase()).join(" and ")}. No separate fault was confirmed here.` : "This body area was not clear enough for a dependable coaching call."),
      whyItMatters: area?.whyItMatters ?? "This link helps the stroke stay balanced, repeatable, and connected to the next movement.",
      cue: area?.cue ?? actionCue(actionType, chapter.id, chapter.cue),
      phase: chapter.phase,
      timestampSeconds: area?.timestampSeconds ?? phaseTime(report, chapter.phase),
      measurementStatus: evidence.length > 0 ? "video_estimate" as const : "not_visible" as const,
      evidence,
    };
  });
}

export default function BodyCoachingChapters({ report, actionType }: { report: AnalysisReport; actionType: string }) {
  const reviews = useMemo(() => report.frameSummary?.bodyRegionReview ?? fallbackReviews(report, actionType), [actionType, report]);
  const [selectedId, setSelectedId] = useState(reviews.find((item) => item.status === "priority")?.id ?? reviews[0]?.id ?? "head");
  const selected = reviews.find((item) => item.id === selectedId) ?? reviews[0];

  useEffect(() => {
    function selectRequestedRegion(event: Event) {
      const detail = (event as CustomEvent<{ regionId?: string }>).detail;
      if (detail?.regionId && reviews.some((item) => item.id === detail.regionId)) {
        setSelectedId(detail.regionId);
      }
    }
    window.addEventListener("acecoach:coach-region", selectRequestedRegion);
    return () => window.removeEventListener("acecoach:coach-region", selectRequestedRegion);
  }, [reviews]);

  if (!selected) return null;
  const selectedStyle = STATUS[selected.status];

  function showOnVideo() {
    window.dispatchEvent(new CustomEvent("acecoach:coach-region", { detail: { time: selected.timestampSeconds, phase: selected.phase } }));
    document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="body-coach" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">2 · Understand the body links</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">Then drill down one body area at a time</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Tap one area at a time. I’ll tell you what the camera supports, why it matters to the ball, and the one feeling to take onto court.</p>
      </div>

      <div className="grid lg:grid-cols-[310px_minmax(0,1fr)]">
        <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" role="tablist" aria-label="Body coaching chapters">
            {reviews.map((review) => {
              const definition = CHAPTERS.find((item) => item.id === review.id);
              const Icon = definition?.icon ?? Target;
              const style = STATUS[review.status];
              return <button key={review.id} type="button" role="tab" aria-selected={selected.id === review.id} onClick={() => setSelectedId(review.id)} className={`group flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${selected.id === review.id ? "border-blue-200 bg-white shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-white/80"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected.id === review.id ? "bg-blue-950 text-white" : "bg-white text-slate-500"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-900 sm:text-sm">{review.title}</span><span className="mt-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</span></span></button>;
            })}
          </div>
        </div>

        <article className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><span className={`inline-flex rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${selectedStyle.pill}`}>{selectedStyle.label}</span><h3 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{selected.title}</h3></div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">{selected.measurementStatus === "video_estimate" ? "Video estimate" : selected.measurementStatus === "athlete_confirmation" ? "Needs your input" : "Not clear in this clip"}</span>
          </div>

          <div className={`mt-6 rounded-3xl border ${selectedStyle.border} bg-slate-50/60 p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coach says</p>
            <p className="mt-3 text-xl font-medium leading-8 text-slate-950">{concise(selected.coachNote, 330)}</p>
            <div className="mt-5 rounded-2xl bg-[#112f50] p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">Take this onto court</p><p className="mt-2 text-2xl font-semibold leading-8">“{plainLanguage(selected.cue)}”</p></div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Why the ball cares</p><p className="mt-2 text-sm leading-7 text-slate-700">{plainLanguage(selected.whyItMatters)}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Evidence I used</p>{selected.evidence.length > 0 ? <div className="mt-2 space-y-2">{selected.evidence.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{plainLanguage(item.label)}</span><span className="font-semibold text-slate-950">{item.displayValue}</span></div>)}</div> : <p className="mt-2 text-sm leading-7 text-slate-600">No reliable hand-on-racket evidence is available from the body-pose model.</p>}</div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {typeof selected.timestampSeconds === "number" ? <button type="button" onClick={showOnVideo} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071b2d] px-4 text-sm font-semibold text-white hover:bg-[#0d2b42]"><Eye className="h-4 w-4" />Show this at {selected.timestampSeconds.toFixed(2)}s</button> : null}
            <p className="text-xs leading-5 text-slate-500">One chapter at a time. The numbers are evidence, not the coaching message.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
