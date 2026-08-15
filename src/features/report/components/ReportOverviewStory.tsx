import {
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Target,
} from "lucide-react";

import type { ProgressComparison } from "@/modules/analysis/progress";
import type { PersonalBaselineComparison } from "@/modules/analysis/longitudinal";
import type { AnalysisReport } from "@/modules/analysis/types";
import {
  getReferenceExperience,
  type AthleteReferenceContext,
} from "@/lib/reference/registry";
import { buildNextGenerationStory } from "../model/next-generation-story";
import { buildPlayerReportView } from "../model/view-model";
import { concise, plainLanguage } from "../model/plain-language";
import {
  movementChainEvidence,
  normalizedMovementChain,
} from "../model/movement-chain";

const chainStyles = {
  priority: {
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    panel: "border-rose-200 bg-rose-50",
    text: "text-rose-700",
    label: "Focus first",
  },
  developing: {
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    panel: "border-amber-200 bg-amber-50",
    text: "text-amber-700",
    label: "Build next",
  },
  strength: {
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    panel: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-700",
    label: "Keep",
  },
  not_assessed: {
    bar: "bg-slate-300",
    dot: "bg-slate-300",
    panel: "border-slate-200 bg-slate-50",
    text: "text-slate-500",
    label: "Need a clearer view",
  },
} as const;

const CHAPTER_CHECKPOINT: Record<string, string> = {
  preparation: "preparation",
  load_and_swing: "loading",
  contact: "contact",
  finish_and_recovery: "recovery",
};

function playerMeaning(
  status: keyof typeof chainStyles,
  hasEvidenceGatedFault: boolean,
) {
  if (status === "not_assessed") {
    return "We could not see the feet, body-to-ball spacing, or key joint positions reliably enough in this stage. This usually means part of the athlete or ball left the frame, bodies overlapped in the 2D view, or the camera angle hid the action. This is a filming limitation—not a technique verdict.";
  }
  if (status === "strength") {
    return "This area is supporting the stroke. Keep this movement while you work on the first priority.";
  }
  if (status === "priority" && hasEvidenceGatedFault) {
    return "The measured evidence supports making this your first coaching priority. Work on the cue shown in the report, then record another video after practice.";
  }
  if (status === "priority") {
    return "This was the lowest reliably measured area in this video, so it offers the clearest improvement opportunity. Work on it first, then compare your next video.";
  }
  return "Parts of the desired pattern are present, but this area is not yet as consistent as the internal coaching reference. Build it after the first priority.";
}

function stageCoachRead(stageId: string, status: keyof typeof chainStyles) {
  if (status === "not_assessed") {
    if (stageId === "load_and_swing") return "We could not judge the feet or hitting space because the camera did not keep the base and ball relationship clear.";
    return "The camera did not show enough of this stage for a fair coaching judgment.";
  }
  const reads: Record<string, Record<"strength" | "developing" | "priority", string>> = {
    preparation: {
      strength: "You create time early and organize the stroke before the forward swing.",
      developing: "Turn and organize a little earlier so the swing does not have to rush.",
      priority: "Start earlier: turn, set the hands, and create time before the ball arrives.",
    },
    load_and_swing: {
      strength: "Your base supports the swing and your hands keep useful space from the body.",
      developing: "Build a steadier base and preserve space so the arms can swing freely.",
      priority: "Create space first: move the feet, load the outside leg, then let the swing travel through.",
    },
    contact: {
      strength: "You meet the ball with useful space and a stable head position.",
      developing: "Give contact more room and keep the head quiet for longer.",
      priority: "Meet the ball farther from the body and stay visually quiet through contact.",
    },
    finish_and_recovery: {
      strength: "You complete the swing and recover without losing balance.",
      developing: "Let the swing finish fully, then regain the court with balance.",
      priority: "Swing through before wrapping the finish, then recover into the next position.",
    },
  };
  return reads[stageId]?.[status] ?? "This stage contains useful movement, with room to make it more repeatable.";
}

export default function ReportOverviewStory({
  report,
  sportId,
  actionType,
  athleteContext,
  movement,
  progressComparison,
  personalBaselineComparison,
  mode = "all",
}: {
  report: AnalysisReport;
  sportId: string;
  actionType: string;
  athleteContext?: AthleteReferenceContext;
  movement: string;
  progressComparison: ProgressComparison | null;
  personalBaselineComparison: PersonalBaselineComparison | null;
  mode?: "all" | "verdict" | "details";
}) {
  const view = buildPlayerReportView(report);
  const story = buildNextGenerationStory(report) ?? buildNextGenerationStory({ ...report, nextGenerationStory: undefined });
  const primaryFinding =
    report.ontologyReasoning?.findings.find(
      (item) => item.role === "PRIMARY",
    ) ?? report.ontologyReasoning?.findings[0];
  const priority = report.priorities[0];
  const chain = normalizedMovementChain(report);
  const reference = getReferenceExperience(sportId, actionType, athleteContext);
  const progressJump = progressComparison?.comparable && typeof progressComparison.scoreDelta === "number"
    ? Math.round(progressComparison.scoreDelta)
    : 0;
  const hasPreviousStroke = Boolean(progressComparison?.comparable);
  const observed = concise(
    primaryFinding?.summary ?? priority?.finding ?? view.mainPriority,
    115,
  );
  const effect = concise(
    primaryFinding?.why ?? priority?.impact ?? view.whyItMatters,
    115,
  );
  const change = concise(
    primaryFinding?.correction ?? priority?.nextStep ?? view.playerFocus,
    115,
  );

  return (
    <>
      {mode !== "details" ? (<section
        id="report-overview"
        className="scroll-mt-32 overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-sm"
      >
        <div className="bg-[radial-gradient(circle_at_92%_0%,rgba(186,230,253,.45),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(216,255,82,.16),transparent_36%)] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-blue-800">
              Coach Read
            </p>
            <div className="flex gap-2 text-[0.65rem] font-bold uppercase tracking-wide">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-slate-600">
                {story.confidenceLabel}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-slate-600">
                {view.captureQuality} capture
              </span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900" title={hasPreviousStroke ? "Change from your previous matching stroke" : "Your first recording starts at zero"}>
                Progress {progressJump > 0 ? "+" : ""}{progressJump} · {hasPreviousStroke ? "since last stroke" : "first recording"}
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-start justify-between gap-6">
            <h1 className="mt-3 max-w-2xl flex-1 text-3xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
              {story.playerCoaching.coachRead}
            </h1>
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                {view.scoreLabel}
              </p>
              <p className="mt-1 flex items-baseline justify-center gap-1 text-slate-950">
                <span className="text-5xl font-bold tracking-tight">
                  {view.score ?? "—"}
                </span>
                {view.score !== null ? <span className="text-lg font-semibold text-slate-400">/100</span> : null}
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Keep
              </p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {story.playerCoaching.keep ?? view.strongestQuality}
              </p>
            </article>
            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-blue-800">
                <Target className="h-4 w-4" />
                Change
              </p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {story.playerCoaching.change}
              </p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sky-700">
                <Dumbbell className="h-4 w-4" />
                Train
              </p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {story.playerCoaching.train}
              </p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em]">
              Your cue
            </p>
            <p className="mt-1 text-xl font-bold leading-7">
              “{story.playerCoaching.feel}”
            </p>
          </div>
        </div>
      </section>) : null}

      {mode !== "verdict" && chain.length ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Your stroke in four stages
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Follow the stroke in order. Open a stage to see the coaching reason.
            </p>
          </div>
          <div
            className="mt-5 flex flex-wrap gap-x-4 gap-y-2 rounded-2xl bg-[#f3f6f2] px-4 py-3 text-[0.68rem] font-semibold text-slate-600"
            aria-label="Stroke map legend"
          >
            {Object.values(chainStyles).map((style) => (
              <span
                key={style.label}
                className="inline-flex items-center gap-1.5"
              >
                <i className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chain.map((item, index) => {
              const style = chainStyles[item.status];
              const score = item.score === null ? null : Math.round(item.score);
              const evidence = movementChainEvidence(report, item);
              const minimumConfidence =
                report.ontologyReasoning?.assessmentPolicy
                  ?.minimumMeasurementConfidence ?? 0.65;
              const checkpoint = reference?.checkpoints.find(
                (entry) => entry.id === CHAPTER_CHECKPOINT[item.id],
              );
              const qualitativeBenchmark =
                checkpoint?.eliteFocus ??
                checkpoint?.focus ??
                "No stroke-specific qualitative benchmark is registered for this area.";
              const numericBenchmark = report.referenceComparison?.areas.find(
                (area) => evidence.some((entry) => entry.areaId === area.id),
              );
              const meaning = playerMeaning(
                item.status,
                item.assessmentBasis === "EVIDENCE_GATED_FAULT" ||
                  Boolean(item.faultId),
              );
              return (
                <details
                  key={item.id}
                  className={`group min-w-0 rounded-2xl border p-4 sm:open:col-span-2 lg:open:col-span-4 ${style.panel}`}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm">
                        {index + 1}
                      </span>
                      <span className={`text-right text-[0.65rem] font-bold uppercase tracking-wide ${style.text}`}>Coach view</span>
                    </div>
                    <p className="mt-4 min-h-10 text-sm font-semibold leading-5 text-slate-950">
                      {item.label}
                    </p>
                    <p
                      className={`mt-2 text-[0.65rem] font-bold uppercase tracking-wide ${style.text}`}
                    >
                      {style.label}
                    </p>
                    <p className="mt-1 text-[0.72rem] leading-5 text-slate-600">{stageCoachRead(item.id, item.status)}</p>
                    <span className="mt-4 flex min-h-10 items-center justify-between border-t border-black/10 pt-3 text-xs font-semibold text-slate-700">
                      Coach&apos;s read
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-black/10 pt-4">
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <section className="rounded-xl border border-[#b9d4c6] bg-white/75 p-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#08715b]">
                          What strong movement usually shows
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-800">
                          {qualitativeBenchmark}
                        </p>
                      </section>
                      <section className="rounded-xl border border-slate-200 bg-white/75 p-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-600">
                          Measurements behind the coaching read
                        </p>
                        <p className={`mt-2 text-sm font-bold ${style.text}`}>
                          {style.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {score === null
                            ? "Not measured reliably in this recording."
                            : `Measured at ${score}/100 for this stage.`}
                        </p>
                        {numericBenchmark ? (
                          <>
                            <p className="mt-3 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                              {numericBenchmark.note}
                            </p>
                            <p className="mt-2 text-xs capitalize text-slate-600">
                              {numericBenchmark.assessment.replaceAll("_", " ")}
                            </p>
                          </>
                        ) : (
                          <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                            A peer or elite number is not shown because a
                            validated matched-player dataset is not yet
                            available.
                          </p>
                        )}
                      </section>
                    </div>
                    <section className="mt-4 rounded-xl border border-black/10 bg-white/75 p-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-600">
                        What your video shows
                      </p>
                      {evidence.length ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {evidence.map((area) => (
                            <article
                              key={area.areaId}
                              className="rounded-xl border border-black/10 bg-white/75 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs font-semibold text-slate-900">
                                  {area.label}
                                </p>
                                <span className="text-sm font-bold text-slate-900">
                                  {Math.round(area.score)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-slate-600">
                                {plainLanguage(area.observation)}
                              </p>
                              <p className="mt-2 text-[0.65rem] font-semibold text-slate-500">
                                {typeof area.confidence === "number"
                                  ? `${Math.round(area.confidence * 100)}% measurement confidence`
                                  : "Confidence not stored in this earlier report"}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-slate-600">
                          The video did not provide a dependable measurement for
                          this area.
                        </p>
                      )}
                    </section>
                    <section className="mt-4 rounded-xl bg-slate-950 p-4 text-white">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8AD8FF]">
                        What this means for you
                      </p>
                      <p className="mt-2 text-sm leading-6">{meaning}</p>
                    </section>
                    <p className="mt-4 text-[0.68rem] leading-5 text-slate-500">
                      Only measurements with at least{" "}
                      {Math.round(minimumConfidence * 100)}% confidence are
                      included.
                    </p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}

      {mode !== "verdict" ? (<section
        id="report-pattern"
        className="scroll-mt-32 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">The coaching pattern</h2>
        <div className="mt-6 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {[
            {
              label: "What we saw",
              value: observed,
              tone: "bg-amber-50 text-amber-900",
            },
            {
              label: "Why it matters",
              value: effect,
              tone: "bg-rose-50 text-rose-900",
            },
            {
              label: "What to try",
              value: change,
              tone: "bg-emerald-50 text-emerald-900",
            },
          ].map((item, index) => (
            <div key={item.label} className="contents">
              <article className={`rounded-2xl p-4 ${item.tone}`}>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] opacity-70">
                  {index + 1} · {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6">
                  {plainLanguage(item.value)}
                </p>
              </article>
              {index < 2 ? (
                <ArrowDown className="mx-auto h-5 w-5 self-center text-slate-300 md:-rotate-90" />
              ) : null}
            </div>
          ))}
        </div>
      </section>) : null}
    </>
  );
}
