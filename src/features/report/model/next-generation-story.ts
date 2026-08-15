import type { DeepCoachingInsight, VisualBeat } from "@/features/biomechanics/contracts/ontology";
import type { AnalysisReport } from "@/modules/analysis/types";
import { concise, plainLanguage } from "./plain-language";

export type PlayerStoryBeat = VisualBeat & {
  label: string;
  intent: "orient" | "cause" | "effect" | "correction" | "clean";
  timestampSeconds: number;
};

export type NextGenerationStory = Omit<DeepCoachingInsight, "visualStory"> & {
  visualStory: Omit<DeepCoachingInsight["visualStory"], "beats"> & { beats: PlayerStoryBeat[] };
  ontologyVersion: "4.1.0";
  evidenceLabel: string;
  confidenceLabel: "Strong evidence" | "Useful estimate" | "Needs confirmation";
};

function phaseTime(report: AnalysisReport, phase: string, fallback: number) {
  return report.movementTimeline?.find((item) => item.phase.toLowerCase().includes(phase))?.timestampSeconds ?? fallback;
}

function confidenceLabel(confidence: number): NextGenerationStory["confidenceLabel"] {
  if (confidence >= 0.8) return "Strong evidence";
  if (confidence >= 0.6) return "Useful estimate";
  return "Needs confirmation";
}

function shortCue(value: string) {
  return plainLanguage(value).split(/\s+/).slice(0, 9).join(" ");
}

export function buildNextGenerationStory(report: AnalysisReport): NextGenerationStory {
  const suppliedStory = report.nextGenerationStory;
  if (suppliedStory && typeof suppliedStory === "object") {
    const supplied = suppliedStory;
    return {
      ...supplied,
      ontologyVersion: "4.1.0",
      evidenceLabel: `${supplied.evidenceIds.length} linked evidence items`,
      confidenceLabel: confidenceLabel(supplied.confidence.interpretation),
      visualStory: {
        ...supplied.visualStory,
        beats: supplied.visualStory.beats.map((beat) => {
          const id = beat.beatId.toUpperCase();
          const intent: PlayerStoryBeat["intent"] = id.includes("CAUSE") || id.includes("LINK") ? "cause" : id.includes("EFFECT") ? "effect" : id.includes("CORRECTION") ? "correction" : id.includes("CLEAN") ? "clean" : "orient";
          const label = intent === "cause" ? (id.includes("LINK") ? "Why it spreads" : "Where it starts") : intent === "effect" ? "What it changes" : intent === "correction" ? "Better window" : intent === "clean" ? "Replay" : "Watch";
          return ({
          ...beat,
          label,
          intent,
          timestampSeconds: Number(beat.timeWindow.timestampSeconds ?? 0),
        }); }),
      },
    };
  }

  const priority = report.priorities[0];
  const strength = report.strengths[0];
  const drill = report.drills[0];
  const confidence = priority?.confidence ?? report.confidence;
  const contact = phaseTime(report, "contact", priority?.timestampSeconds ?? 0);
  const preparation = phaseTime(report, "preparation", Math.max(0, contact - 0.7));
  const effect = priority?.timestampSeconds ?? contact;
  const cue = shortCue(report.coachingPlaybook?.feelCue ?? priority?.cue ?? drill?.cue ?? "Make room, then swing");
  const evidenceIds = [priority?.measurementBasis, report.frameSummary?.biomechanicalProfile?.version]
    .filter((item): item is string => Boolean(item));
  if (!evidenceIds.length) evidenceIds.push("legacy-structured-report");

  const beats: PlayerStoryBeat[] = [
    { beatId: "B1_ORIENT", label: "Watch", intent: "orient", timestampSeconds: preparation, timeWindow: { timestampSeconds: preparation }, playbackRate: 0.7, overlays: ["CLEAN_REPLAY_LABEL"], caption: "Watch what happens before contact." },
    { beatId: "B2_CAUSE", label: "Where it starts", intent: "cause", timestampSeconds: preparation, timeWindow: { timestampSeconds: preparation }, playbackRate: 0.3, overlays: ["EVENT_BEACON", "EVIDENCE_HIGHLIGHT"], caption: concise(plainLanguage(priority?.finding ?? report.coachSummary.mainPriority), 54) },
    { beatId: "B3_EFFECT", label: "What it changes", intent: "effect", timestampSeconds: effect, timeWindow: { timestampSeconds: effect }, playbackRate: 0.25, overlays: ["CAUSAL_TIME_LINK", "CONTACT_CLOUD"], caption: concise(plainLanguage(priority?.impact ?? report.coachSummary.whyItMatters), 54) },
    { beatId: "B4_CORRECTION", label: "Better window", intent: "correction", timestampSeconds: effect, timeWindow: { timestampSeconds: effect }, playbackRate: 0.3, overlays: ["TARGET_MOVEMENT_CORRIDOR", "CUE_CARD"], caption: shortCue(priority?.nextStep ?? cue) },
    { beatId: "B5_CLEAN", label: "Replay", intent: "clean", timestampSeconds: preparation, timeWindow: { timestampSeconds: preparation }, playbackRate: 0.7, overlays: ["CLEAN_REPLAY_LABEL"], caption: cue },
  ];

  return {
    insightId: `NG-${priority?.rank ?? 1}`,
    role: "PRIMARY_CORRECTION",
    archetype: "HIDDEN_CAUSE",
    thesis: plainLanguage(report.coachSummary.coachVerdict ?? report.coachSummary.mainPriority),
    rootEvent: priority?.frameIndex != null ? `frame-${priority.frameIndex}` : "pre-contact-window",
    evidenceIds,
    comparisonBasis: report.repetitionInsights?.clearestReferenceRepetition != null
      ? { type: "self_best", repetition: report.repetitionInsights.clearestReferenceRepetition }
      : { type: "current_session", note: "No aligned self-best comparison available" },
    causalChain: [
      { from: "What changes first", to: "What you see later", relationship: plainLanguage(priority?.impact ?? report.coachSummary.whyItMatters), confidence },
    ],
    confidence: { detection: report.confidence, measurement: confidence, context: report.confidence, interpretation: confidence },
    falsificationConditions: report.limitations.slice(0, 2),
    playerCoaching: {
      coachRead: plainLanguage(report.coachSummary.coachVerdict ?? report.coachSummary.headline),
      keep: strength ? plainLanguage(strength.title) : null,
      change: plainLanguage(priority?.nextStep ?? report.coachSummary.mainPriority),
      why: plainLanguage(priority?.impact ?? report.coachSummary.whyItMatters),
      feel: cue,
      watch: `Pause near ${effect.toFixed(2)} seconds and follow the highlighted body part.`,
      train: plainLanguage(drill ? `${drill.name}: ${drill.dosage}` : report.nextSession.objective),
      success: plainLanguage(drill?.successMetric ?? report.nextSession.successCriteria[0] ?? "The change holds in the next practice video."),
      languageProfileId: "PLAYER_COACH_v4.1",
      surface: "PLAYER_COACH",
    },
    visualStory: { storyId: `VIS-NG-${priority?.rank ?? 1}`, archetype: "CAUSE_TO_EFFECT", focusInsightId: `NG-${priority?.rank ?? 1}`, beats },
    ontologyVersion: "4.1.0",
    evidenceLabel: `${evidenceIds.length} linked evidence ${evidenceIds.length === 1 ? "item" : "items"}`,
    confidenceLabel: confidenceLabel(confidence),
  };
}
