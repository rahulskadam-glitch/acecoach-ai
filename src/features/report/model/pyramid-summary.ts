import type { AnalysisReport } from "@/modules/analysis/types";
import { concise, plainLanguage } from "./plain-language";

export type StrokeSummaryPoint = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  cue?: string;
  timestampSeconds: number | null;
  bodyRegionId: string;
  phase: string;
};

export type StrokePyramidSummary = {
  headline: string;
  bottomLine: string;
  synthesisNote: string;
  strengths: StrokeSummaryPoint[];
  improvements: StrokeSummaryPoint[];
  firstAction: {
    title: string;
    reason: string;
    cue: string;
    drillName: string;
    successMetric: string;
  };
};

function includesAny(value: string, words: string[]) {
  const normalized = value.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function pointLocation(title: string) {
  if (includesAny(title, ["knee drive", "extension"])) return { bodyRegionId: "knees", phase: "acceleration" };
  if (includesAny(title, ["head", "body position"])) return { bodyRegionId: "head", phase: "contact" };
  if (includesAny(title, ["contact", "hand", "spacing"])) return { bodyRegionId: "hands", phase: "contact" };
  if (includesAny(title, ["preparation", "backlift", "shoulder"])) return { bodyRegionId: "backlift", phase: "preparation" };
  if (includesAny(title, ["lower-body", "load", "transfer", "hip"])) return { bodyRegionId: "hips", phase: "loading" };
  if (includesAny(title, ["foot", "base", "ankle"])) return { bodyRegionId: "feet", phase: "preparation" };
  if (includesAny(title, ["finish", "recovery", "ending"])) return { bodyRegionId: "finish", phase: "follow_through" };
  return { bodyRegionId: "head", phase: "contact" };
}

function strengthLanguage(title: string, evidence: string) {
  if (includesAny(title, ["preparation", "backlift"])) return {
    title: "Your preparation gives you time",
    summary: "You organize the turn and backlift before the forward swing instead of starting everything at the last moment.",
    whyItMatters: "Early, connected preparation lets the trunk and both arms work together.",
  };
  if (includesAny(title, ["contact", "spacing"])) return {
    title: "You create useful contact space",
    summary: "At the likely strike moment, your hands have room to travel instead of being trapped against your body.",
    whyItMatters: "Space gives you a longer swing corridor and more control of direction.",
  };
  if (includesAny(title, ["knee drive", "extension"])) return {
    title: "Your legs release after the load",
    summary: "The visible knee drive follows the loading position instead of staying passive.",
    whyItMatters: "A load-then-drive sequence connects the ground-up chain to the forward swing.",
  };
  if (includesAny(title, ["lower-body", "load", "transfer"])) return {
    title: "Your lower body gives the stroke a base",
    summary: "The video shows a usable platform underneath the swing.",
    whyItMatters: "A stable platform helps the upper body rotate without rushing.",
  };
  return {
    title: plainLanguage(title),
    summary: concise(evidence, 220),
    whyItMatters: "Keep this quality while changing the main priority.",
  };
}

function improvementLanguage(title: string, nextStep: string | undefined, finding: string) {
  if (includesAny(title, ["head", "body position"])) return {
    title: "Keep your head quieter through contact",
    summary: "Your head and upper body move too much through the strike window. Keep the eyes and head quieter while the arms complete the shot.",
  };
  if (includesAny(title, ["finish", "recovery", "ending"])) return {
    title: "Complete the finish, then recover",
    summary: "Let both hands finish high and away from your face, hold your balance briefly, then make the first recovery step.",
  };
  if (includesAny(title, ["foot", "base", "ankle"])) return {
    title: "Build a more usable hitting base",
    summary: "Use small adjustment steps, set a comfortable base, strike, and leave yourself room to recover instead of getting stuck.",
  };
  if (includesAny(title, ["knee drive", "extension"])) return {
    title: "Drive the legs after you load",
    summary: "Keep the knee bend as the load, stay supported into the strike window, then drive upward and forward through the finish.",
  };
  if (includesAny(title, ["lower-body", "load", "transfer", "hip", "knee"])) return {
    title: "Load the legs before you turn through",
    summary: "Stay lower into the ball, organize the outside leg, and transfer through the shot before rising into recovery.",
  };
  if (includesAny(title, ["contact", "spacing", "hand"])) return {
    title: "Meet the ball with more space",
    summary: "Keep both arms connected and meet the likely strike window in front, with room between your hands and torso.",
  };
  return {
    title: plainLanguage(title),
    summary: concise(nextStep || finding, 240),
  };
}

function joinNatural(items: string[]) {
  if (items.length === 0) return "the parts that are already balanced";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function shortStrength(title: string) {
  if (includesAny(title, ["preparation", "backlift"])) return "well-organized preparation";
  if (includesAny(title, ["contact", "spacing"])) return "useful contact space";
  if (includesAny(title, ["knee drive", "extension"])) return "a connected load-then-drive leg sequence";
  if (includesAny(title, ["lower-body", "load"])) return "a usable lower-body base";
  return plainLanguage(title).toLowerCase();
}

function shortImprovement(title: string) {
  if (includesAny(title, ["head", "body position"])) return "quieter head and upper-body control through contact";
  if (includesAny(title, ["finish", "recovery"])) return "a complete finish and quicker recovery";
  if (includesAny(title, ["foot", "base"])) return "a more functional hitting base";
  if (includesAny(title, ["knee drive", "extension"])) return "a clearer load-then-drive leg sequence";
  if (includesAny(title, ["lower-body", "load", "transfer"])) return "better leg load and weight transfer";
  if (includesAny(title, ["contact", "spacing"])) return "cleaner contact spacing";
  return plainLanguage(title).toLowerCase();
}


export function buildStrokePyramidSummary(report: AnalysisReport, movement: string): StrokePyramidSummary {
  const supplied = report.coachSummary.pyramidSummary;
  if (supplied) return supplied;

  const bodyReviews = report.frameSummary?.bodyRegionReview ?? [];
  const strengths = report.strengths.slice(0, 2).map((item, index) => {
    const language = strengthLanguage(item.title, item.evidence);
    const location = pointLocation(item.title);
    const body = bodyReviews.find((review) => review.id === location.bodyRegionId);
    return {
      id: `strength-${index + 1}`,
      ...language,
      timestampSeconds: item.timestampSeconds ?? body?.timestampSeconds ?? null,
      bodyRegionId: location.bodyRegionId,
      phase: location.phase,
    };
  });

  const improvements = report.priorities.slice(0, 3).map((item, index) => {
    const language = improvementLanguage(item.title, item.nextStep, item.finding);
    const location = pointLocation(item.title);
    const body = bodyReviews.find((review) => review.id === location.bodyRegionId);
    return {
      id: `improvement-${index + 1}`,
      ...language,
      whyItMatters: concise(item.impact, 210),
      cue: plainLanguage(item.cue),
      timestampSeconds: item.timestampSeconds ?? body?.timestampSeconds ?? null,
      bodyRegionId: location.bodyRegionId,
      phase: location.phase,
    };
  });

  const working = joinNatural(report.strengths.slice(0, 2).map((item) => shortStrength(item.title)));
  const changes = report.priorities.slice(0, 3).map((item) => shortImprovement(item.title));
  const firstInstruction = improvements[0]?.title
    ? `${improvements[0].title.charAt(0).toLowerCase()}${improvements[0].title.slice(1)}`
    : "make one clear change at a time";
  const changeSentence = changes.length > 1
    ? `First, ${firstInstruction}. After that, work on ${joinNatural(changes.slice(1))}.`
    : `First, ${firstInstruction}.`;
  const primary = report.priorities[0];
  const drill = report.drills[0];

  return {
    headline: `${strengths[0]?.title ?? "Keep what already works"}. ${improvements[0]?.title ?? "Make one clear change first"}.`,
    bottomLine: `Your ${movement.toLowerCase()} already shows ${working}. ${changeSentence}`,
    synthesisNote: `This answer combines the full-video pattern, phase timing, body-position estimates, repetition evidence, and the available biomechanical checks. It leaves out anything the camera cannot support.`,
    strengths,
    improvements,
    firstAction: {
      title: improvements[0]?.title ?? "Make one clear change first",
      reason: concise(primary?.impact ?? report.coachSummary.whyItMatters, 220),
      cue: plainLanguage(report.coachingPlaybook?.feelCue ?? primary?.cue ?? report.practicePlan.cue),
      drillName: plainLanguage(drill?.name ?? "Slow rehearsal"),
      successMetric: plainLanguage(drill?.successMetric ?? report.nextSession.successCriteria[0] ?? "Repeat the movement with stable balance."),
    },
  };
}
