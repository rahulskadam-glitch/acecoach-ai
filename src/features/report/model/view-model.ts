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

export function buildPlayerReportView(report: AnalysisReport) {
  const priority = report.priorities[0];
  const strength = report.strengths[0];
  const coachingCue = report.coachingPlaybook?.feelCue ?? priority?.cue ?? report.practicePlan?.cue ?? "Make one clear change at a time.";

  const supportingPriorities = report.priorities.length > 1 ? report.priorities.slice(1, 4) : [];
  const improvements: ImprovementCard[] = supportingPriorities.map((item, index) => ({
    rank: index + 1,
    title: plainLanguage(item.title),
    whatWeSaw: concise(item.finding, 210),
    whyItMatters: concise(item.impact, 190),
    cue: plainLanguage(item.cue),
    nextStep: concise(item.nextStep ?? report.drills[index]?.purpose ?? report.nextSession.objective, 180),
    timestampSeconds: item.timestampSeconds ?? null,
    frameIndex: item.frameIndex ?? null,
  }));

  return {
    headline: plainLanguage(report.coachSummary.headline),
    strongestQuality: concise(report.coachSummary.strongestQuality || strength?.evidence, 190),
    mainPriority: concise(report.coachSummary.mainPriority || priority?.title, 190),
    playerFocus: concise(report.coachSummary.mainPriority || priority?.title, 110),
    whyItMatters: concise(report.coachSummary.whyItMatters || priority?.impact, 220),
    coachingCue: plainLanguage(coachingCue),
    improvements,
    score: report.qualityGate.canUseTechniqueScore ? report.overallScore : null,
    scoreLabel: report.qualityGate.canUseTechniqueScore ? "Movement score" : "Score withheld",
    confidence: Math.round(report.confidence * 100),
    captureQuality: report.captureQuality.grade ?? `${report.captureQuality.score}/100`,
    successTarget: plainLanguage(report.nextSession.successCriteria[0] ?? report.drills[0]?.successMetric ?? "Repeat the movement with the same cue and stable balance."),
    primaryTimestampSeconds: priority?.timestampSeconds ?? null,
  };
}
