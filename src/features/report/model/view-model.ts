import type { AnalysisReport } from "@/modules/analysis/types";
import { concise, plainLanguage } from "./plain-language";

export type ImprovementCard = {
  rank: number;
  title: string;
  whatWeSaw: string;
  whyItMatters: string;
  cue: string;
  nextStep: string;
  timestampSeconds: number | null;
  frameIndex: number | null;
};

function contextualizeStrokeText(text: string | null | undefined, actionType?: string): string {
  if (!text) return "";
  if (!actionType) return text;
  const lowerAction = actionType.toLowerCase();
  if (lowerAction === "forehand") {
    return text
      .replace(/two-handed backhand/gi, "forehand")
      .replace(/one-handed backhand/gi, "forehand")
      .replace(/backhand/gi, "forehand");
  }
  if (lowerAction === "serve") {
    return text
      .replace(/two-handed backhand/gi, "serve")
      .replace(/one-handed backhand/gi, "serve")
      .replace(/backhand/gi, "serve");
  }
  if (lowerAction === "forehand_volley") {
    return text
      .replace(/two-handed backhand/gi, "forehand volley")
      .replace(/one-handed backhand/gi, "forehand volley")
      .replace(/backhand/gi, "forehand volley");
  }
  if (lowerAction === "backhand_volley") {
    return text
      .replace(/two-handed backhand/gi, "backhand volley")
      .replace(/one-handed backhand/gi, "backhand volley");
  }
  return text;
}

export function buildPlayerReportView(report: AnalysisReport, actionType?: string) {
  const priority = report.priorities[0];
  const strength = report.strengths[0];
  const coachingCue = report.coachingPlaybook?.feelCue ?? priority?.cue ?? report.practicePlan?.cue ?? "Make one clear change at a time.";

  const supportingPriorities = report.priorities.length > 1 ? report.priorities.slice(1, 4) : [];
  const improvements: ImprovementCard[] = supportingPriorities.map((item, index) => ({
    rank: index + 1,
    title: contextualizeStrokeText(plainLanguage(item.title), actionType),
    whatWeSaw: contextualizeStrokeText(concise(item.finding, 210), actionType),
    whyItMatters: contextualizeStrokeText(concise(item.impact, 190), actionType),
    cue: contextualizeStrokeText(plainLanguage(item.cue), actionType),
    nextStep: contextualizeStrokeText(concise(item.nextStep ?? report.drills[index]?.purpose ?? report.nextSession.objective, 180), actionType),
    timestampSeconds: item.timestampSeconds ?? null,
    frameIndex: item.frameIndex ?? null,
  }));

  return {
    headline: contextualizeStrokeText(plainLanguage(report.coachSummary.headline), actionType),
    strongestQuality: contextualizeStrokeText(concise(report.coachSummary.strongestQuality || strength?.evidence, 190), actionType),
    mainPriority: contextualizeStrokeText(concise(report.coachSummary.mainPriority || priority?.title, 190), actionType),
    playerFocus: contextualizeStrokeText(concise(report.coachSummary.mainPriority || priority?.title, 110), actionType),
    whyItMatters: contextualizeStrokeText(concise(report.coachSummary.whyItMatters || priority?.impact, 220), actionType),
    coachingCue: contextualizeStrokeText(plainLanguage(coachingCue), actionType),
    improvements,
    score: report.qualityGate.canUseTechniqueScore ? report.overallScore : null,
    scoreLabel: report.qualityGate.canUseTechniqueScore ? "Movement score" : "Score withheld",
    confidence: Math.round(report.confidence * 100),
    captureQuality: report.captureQuality.grade ?? `${report.captureQuality.score}/100`,
    successTarget: contextualizeStrokeText(plainLanguage(report.nextSession.successCriteria[0] ?? report.drills[0]?.successMetric ?? "Repeat the movement with the same cue and stable balance."), actionType),
    primaryTimestampSeconds: priority?.timestampSeconds ?? null,
  };
}
