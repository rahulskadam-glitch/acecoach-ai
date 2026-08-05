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
  framework?: Array<{
    id: string;
    step: number;
    label: string;
    title: string;
    status: "working" | "developing" | "priority" | "confirm";
    summary: string;
    coachCue: string;
    cameraBoundary?: string;
    checks?: Array<{
      id: string;
      label: string;
      status: "working" | "developing" | "priority" | "confirm";
      finding: string;
      cameraBoundary?: string;
    }>;
    timestampSeconds: number | null;
    bodyRegionId: string;
    phase: string;
  }>;
  audit?: {
    version: string;
    title: string;
    synthesis: string;
    stylePrinciple: string;
    checkpoints: Array<{
      id: string;
      step: number;
      label: string;
      status: "working" | "developing" | "priority" | "confirm";
      summary: string;
      cue: string;
      measurement: string;
      cameraBoundary: string;
      contextNote: string;
      sourceIds: string[];
      timestampSeconds: number | null;
      bodyRegionId: string;
      phase: string;
      bodyChecks?: Array<{
        id: string;
        bodyPart: string;
        status: "working" | "developing" | "priority" | "confirm";
        finding: string;
        measurementBasis: string;
        cameraBoundary?: string;
      }>;
    }>;
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

function combinedStatus(items: Array<{ status?: string } | undefined>): "working" | "developing" | "priority" {
  const statuses = items.map((item) => item?.status).filter(Boolean);
  if (statuses.includes("priority")) return "priority";
  if (statuses.includes("developing")) return "developing";
  return "working";
}

function twoHandedBackhandFramework(report: AnalysisReport, movement: string): StrokePyramidSummary["framework"] {
  if (!movement.toLowerCase().includes("two handed backhand")) return undefined;
  const area = (id: string) => report.coachingAreas?.find((item) => item.id === id);
  const preparation = area("backlift_preparation");
  const feet = area("footwork_base");
  const load = area("lower_body_loading");
  const space = area("contact_spacing");
  const head = area("body_position");
  const finish = area("ending_position");

  return [
    {
      id: "backhand-preparation",
      step: 1,
      label: "Preparation",
      title: "Coil early and move to the ball",
      status: combinedStatus([preparation, feet]),
      summary: `${preparation?.status === "strength" ? "Your shoulder turn and backlift timing are already organized." : "Start the shoulder coil early and show the back shoulder to the incoming ball."} ${feet?.status === "priority" ? "Use a quick pivot and adjustment steps to arrive on a more functional base." : "Keep the feet active so the body arrives with space."} Set the racket head above the hands during this early preparation.`,
      coachCue: "Turn early. Racket head above the hands.",
      cameraBoundary: "Grip change and exact racket-head position need a clear hand-and-racket view.",
      checks: [
        { id: "early-coil", label: "Early shoulder coil", status: combinedStatus([preparation]), finding: preparation?.status === "strength" ? "The turn is organized before the forward swing." : "Begin the shoulder coil before the ball enters the strike window." },
        { id: "pivot-move", label: "Pivot and adjustment steps", status: combinedStatus([feet]), finding: feet?.status === "priority" ? "The arrival base needs a quicker pivot, movement, and set sequence." : "The feet create a usable arrival base." },
        { id: "grip-change", label: "Early grip change", status: "confirm", finding: "Confirm that both hands organize the grip during the first body turn.", cameraBoundary: "Body landmarks do not identify the grip." },
        { id: "racket-organized", label: "Racket above the hands", status: "confirm", finding: "Confirm the racket is organized above the hands before it drops.", cameraBoundary: "Racket tracking is not available in this recording." },
      ],
      timestampSeconds: preparation?.timestampSeconds ?? feet?.timestampSeconds ?? null,
      bodyRegionId: preparation?.status === "priority" ? "backlift" : "feet",
      phase: "preparation",
    },
    {
      id: "backhand-power-position",
      step: 2,
      label: "Power position & drop",
      title: "Load the outside leg, then let the racket drop",
      status: combinedStatus([load, space]),
      summary: `${load?.status === "strength" ? "The lower body creates a usable platform." : "Stay lower and load the back or outside leg before the forward swing."} ${space?.status === "strength" ? "Your hands keep useful room from the torso." : "Keep both elbows and hands away from the body so there is room to accelerate."} After the Stage 1 setup above the hands, allow the racket head to drop below the hand line before acceleration.`,
      coachCue: "Load. Arms away. Racket head below the hands.",
      cameraBoundary: "String angle and exact racket height are not measured without racket tracking.",
      checks: [
        { id: "outside-leg-load", label: "Back or outside-leg load", status: combinedStatus([load]), finding: load?.status === "strength" ? "The legs create a usable platform for the forward swing." : "Stay lower and organize the back or outside leg before turning through.", cameraBoundary: "Video shows body position, not an exact weight percentage or ground force." },
        { id: "arm-space", label: "Both arms away from the torso", status: combinedStatus([space]), finding: space?.status === "strength" ? "The hands preserve useful room from the torso." : "Create more room between the elbows, hands, and torso before acceleration." },
        { id: "chin-shoulder", label: "Chin over the back shoulder", status: combinedStatus([head]), finding: head?.status === "priority" ? "Head control needs to become quieter as the stroke approaches contact." : "The head stays supported over the shoulder line." },
        { id: "racket-drop-below-hands", label: "Racket head drops below the hand line", status: "confirm", finding: "Confirm the racket head moves from above the hands in Stage 1 to below the hand line before acceleration.", cameraBoundary: "Racket height and string angle require a clear racket-and-hand view." },
      ],
      timestampSeconds: load?.timestampSeconds ?? space?.timestampSeconds ?? null,
      bodyRegionId: "hips",
      phase: "loading",
    },
    {
      id: "backhand-contact",
      step: 3,
      label: "Contact",
      title: "Make space and keep the head quiet",
      status: combinedStatus([head, space]),
      summary: `${head?.status === "priority" ? "Keep the head and upper body quieter through the strike window." : "Preserve your head position while the hands travel through the likely contact window."} ${space?.status === "strength" ? "Your hands preserve useful room from the torso." : "Create enough room for both arms to extend in the intended direction."}`,
      coachCue: "Make room. See it through.",
      cameraBoundary: "The engine estimates a likely strike window; exact ball contact and racket-face angle require ball and racket detection.",
      checks: [
        { id: "quiet-contact", label: "Quiet head through contact", status: combinedStatus([head]), finding: head?.status === "priority" ? "Keep the head and upper body quieter while both arms complete the strike." : "Preserve the head position through the likely strike window." },
        { id: "contact-in-front", label: "Contact space in front", status: combinedStatus([space]), finding: space?.status === "strength" ? "The hands preserve a useful contact-space proxy." : "Create more room so the likely strike window can stay in front.", cameraBoundary: "This is a body-spacing proxy; exact ball contact is not detected." },
        { id: "extend-direction", label: "Extension in the intended direction", status: combinedStatus([space]), finding: "Keep both arms connected and send the hands through the intended ball line before the finish develops." },
        { id: "contact-racket-face", label: "Racket face at contact", status: "confirm", finding: "Confirm the racket face matches the intended height, spin, and direction.", cameraBoundary: "Racket-face angle and ball response require racket and ball tracking." },
      ],
      timestampSeconds: head?.timestampSeconds ?? space?.timestampSeconds ?? null,
      bodyRegionId: head?.status === "priority" ? "head" : "hands",
      phase: "contact",
    },
    {
      id: "backhand-finish-recovery",
      step: 4,
      label: "Finish & recovery",
      title: "Swing through, finish the elbow above the nose, and recover",
      status: combinedStatus([finish, feet]),
      summary: `${finish?.status === "priority" ? "Let the non-dominant side carry through the intended line before the finish develops." : "The hands travel through the intended line into a natural finish."} ${feet?.status === "priority" ? "Regain a functional base and begin the first recovery step without rushing." : "Use the existing momentum to recover in balance."}`,
      coachCue: "Through first. Elbow above the nose. Recover.",
      cameraBoundary: "The camera can estimate hand path, balance, and recovery timing, but not ball quality or the exact racket finish.",
      checks: [
        { id: "swing-through", label: "Hands travel through before finishing", status: combinedStatus([finish]), finding: finish?.status === "priority" ? "Carry the hands through the intended line before allowing the racket to finish." : "The hand path continues through before the finish develops." },
        { id: "lead-elbow-above-nose", label: "Lead elbow finishes above the nose line", status: combinedStatus([finish]), finding: "For this topspin/depth pattern, let the lead elbow rise above the nose line after the hands travel through. Flatter, defensive, and high-ball finishes can vary." },
        { id: "recover", label: "Balanced first recovery step", status: combinedStatus([finish, feet]), finding: finish?.status === "priority" || feet?.status === "priority" ? "Complete the swing, regain the base, and make the first recovery step without rushing." : "The finish leaves a usable base for recovery." },
      ],
      timestampSeconds: finish?.timestampSeconds ?? feet?.timestampSeconds ?? null,
      bodyRegionId: "finish",
      phase: "follow_through",
    },
  ];
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
    framework: twoHandedBackhandFramework(report, movement),
  };
}
