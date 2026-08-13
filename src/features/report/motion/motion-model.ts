import type { AnalysisReport, FrameMetric } from "@/modules/analysis/types";

export type Point = { x: number; y: number };
export type JointName =
  | "head"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle";
export type Pose = Record<JointName, Point>;
export type MotionStage = "preparation" | "loading" | "swing" | "contact" | "finish" | "recovery";
export type MotionTier = "category" | "elite";

export const MOTION_STAGES: Array<{ id: MotionStage; label: string; fraction: number }> = [
  { id: "preparation", label: "Preparation", fraction: 0 },
  { id: "loading", label: "Load", fraction: 0.24 },
  { id: "swing", label: "Swing", fraction: 0.48 },
  { id: "contact", label: "Contact", fraction: 0.64 },
  { id: "finish", label: "Finish", fraction: 0.83 },
  { id: "recovery", label: "Recovery", fraction: 1 },
];

const PHASE_ALIASES: Record<MotionStage, string[]> = {
  preparation: ["preparation", "ready", "unit_turn", "start", "release"],
  loading: ["loading", "load", "backlift", "cocking", "plant"],
  swing: ["acceleration", "forward_swing", "downswing", "arm_cocking"],
  contact: ["contact", "impact", "release", "contact_proxy", "ball_release"],
  finish: ["finish", "follow_through", "deceleration", "landing"],
  recovery: ["recovery", "ready_again", "return"],
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function basePose(): Pose {
  return {
    head: { x: 0.5, y: 0.12 },
    left_shoulder: { x: 0.42, y: 0.27 },
    right_shoulder: { x: 0.58, y: 0.27 },
    left_elbow: { x: 0.39, y: 0.42 },
    right_elbow: { x: 0.61, y: 0.42 },
    left_wrist: { x: 0.42, y: 0.53 },
    right_wrist: { x: 0.58, y: 0.53 },
    left_hip: { x: 0.45, y: 0.53 },
    right_hip: { x: 0.55, y: 0.53 },
    left_knee: { x: 0.43, y: 0.73 },
    right_knee: { x: 0.57, y: 0.73 },
    left_ankle: { x: 0.39, y: 0.92 },
    right_ankle: { x: 0.61, y: 0.92 },
  };
}

function normalizeAction(value: string) {
  return value.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function movementFamily(actionType: string) {
  const action = normalizeAction(actionType);
  if (action.includes("serve") || action.includes("overhead")) return "serve";
  if (action.includes("volley")) return "volley";
  if (action.includes("slice")) return "slice";
  if (action.includes("backhand")) return action.includes("one_hand") ? "one_hand_backhand" : "backhand";
  return "forehand";
}

function levelScale(level?: string | null) {
  const value = (level ?? "").toLowerCase();
  if (["beginner", "novice", "starter", "recreational"].some((term) => value.includes(term))) return 0.88;
  if (["advanced", "elite", "national", "international", "professional"].some((term) => value.includes(term))) return 1.04;
  return 0.96;
}

function set(pose: Pose, joint: JointName, x: number, y: number) {
  pose[joint] = { x: clamp(x, 0.04, 0.96), y: clamp(y, 0.035, 0.96) };
}

export function stagePose(
  actionType: string,
  stage: MotionStage,
  tier: MotionTier,
  dominantSide: "left" | "right",
  playingLevel?: string | null,
): Pose {
  const pose = basePose();
  const family = movementFamily(actionType);
  const hit = dominantSide;
  const support = hit === "right" ? "left" : "right";
  const direction = hit === "right" ? 1 : -1;
  const scale = tier === "elite" ? 1.13 : levelScale(playingLevel);
  const hw = `${hit}_wrist` as JointName;
  const he = `${hit}_elbow` as JointName;
  const hs = `${hit}_shoulder` as JointName;
  const hh = `${hit}_hip` as JointName;
  const hk = `${hit}_knee` as JointName;
  const ha = `${hit}_ankle` as JointName;
  const sw = `${support}_wrist` as JointName;
  const se = `${support}_elbow` as JointName;
  const ss = `${support}_shoulder` as JointName;
  const sh = `${support}_hip` as JointName;
  const sk = `${support}_knee` as JointName;
  const sa = `${support}_ankle` as JointName;

  if (family === "serve") {
    if (stage === "preparation") {
      set(pose, hw, 0.5 + direction * 0.11, 0.56);
      set(pose, he, 0.5 + direction * 0.08, 0.44);
      set(pose, sw, 0.5 - direction * 0.14, 0.25);
    } else if (stage === "loading") {
      set(pose, hw, 0.5 + direction * 0.06, 0.13);
      set(pose, he, 0.5 + direction * 0.14, 0.25);
      set(pose, sw, 0.5 - direction * 0.11, 0.08);
      set(pose, hk, 0.5 + direction * 0.09, 0.78);
      set(pose, sk, 0.5 - direction * 0.09, 0.78);
      pose.head.y = 0.15;
    } else if (stage === "swing" || stage === "contact") {
      set(pose, he, 0.5 + direction * 0.04, 0.15);
      set(pose, hw, 0.5 + direction * 0.05, stage === "contact" ? 0.035 : 0.08);
      set(pose, sw, 0.5 - direction * 0.05, 0.43);
      set(pose, hh, 0.5 + direction * 0.04, 0.49);
      set(pose, sh, 0.5 - direction * 0.04, 0.51);
    } else if (stage === "finish") {
      set(pose, hw, 0.5 - direction * 0.13 * scale, 0.45);
      set(pose, he, 0.5 - direction * 0.03, 0.34);
      set(pose, sa, 0.5 - direction * 0.18, 0.92);
    }
    return pose;
  }

  if (family === "volley") {
    if (stage === "preparation" || stage === "loading") {
      set(pose, hw, 0.5 + direction * (stage === "loading" ? 0.18 : 0.13), 0.37);
      set(pose, he, 0.5 + direction * 0.1, 0.39);
      set(pose, sw, 0.5 - direction * 0.07, 0.4);
    } else if (stage === "swing" || stage === "contact") {
      set(pose, hw, 0.5 + direction * (stage === "contact" ? 0.29 : 0.23) * scale, 0.37);
      set(pose, he, 0.5 + direction * 0.14, 0.39);
      set(pose, sa, 0.5 - direction * 0.16, 0.92);
    } else {
      set(pose, hw, 0.5 + direction * 0.1, 0.43);
    }
    return pose;
  }

  const backhand = family === "backhand" || family === "one_hand_backhand" || family === "slice";
  const strokeDirection = backhand ? -direction : direction;
  const twoHands = family === "backhand";
  const slice = family === "slice";

  if (stage === "preparation") {
    set(pose, hs, 0.5 + strokeDirection * 0.04, 0.27);
    set(pose, ss, 0.5 - strokeDirection * 0.05, 0.28);
    set(pose, he, 0.5 - strokeDirection * 0.11, 0.39);
    set(pose, hw, 0.5 - strokeDirection * 0.2 * scale, slice ? 0.31 : 0.36);
    set(pose, se, 0.5 - strokeDirection * 0.04, 0.39);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.15 : 0.5 - strokeDirection * 0.04, 0.38);
  } else if (stage === "loading") {
    set(pose, hw, 0.5 - strokeDirection * 0.24 * scale, slice ? 0.37 : 0.43);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.18 : 0.5 - strokeDirection * 0.02, 0.4);
    set(pose, hk, 0.5 + strokeDirection * 0.08, 0.77);
    set(pose, sk, 0.5 - strokeDirection * 0.08, 0.75);
    set(pose, ha, 0.5 + strokeDirection * 0.15 * scale, 0.92);
    set(pose, sa, 0.5 - strokeDirection * 0.16 * scale, 0.92);
    set(pose, hh, 0.5 + strokeDirection * 0.05, 0.55);
    set(pose, sh, 0.5 - strokeDirection * 0.05, 0.53);
  } else if (stage === "swing") {
    set(pose, he, 0.5 + strokeDirection * 0.04, slice ? 0.43 : 0.42);
    set(pose, hw, 0.5 + strokeDirection * 0.1 * scale, slice ? 0.45 : 0.39);
    set(pose, sw, twoHands ? 0.5 + strokeDirection * 0.06 : 0.5 - strokeDirection * 0.02, 0.4);
  } else if (stage === "contact") {
    set(pose, he, 0.5 + strokeDirection * 0.13, slice ? 0.43 : 0.37);
    set(pose, hw, 0.5 + strokeDirection * 0.29 * scale, slice ? 0.47 : 0.36);
    set(pose, se, 0.5 + strokeDirection * (twoHands ? 0.08 : -0.02), 0.4);
    set(pose, sw, twoHands ? 0.5 + strokeDirection * 0.21 * scale : 0.5 - strokeDirection * 0.02, slice ? 0.45 : 0.37);
  } else if (stage === "finish") {
    set(pose, he, 0.5 + strokeDirection * 0.08, slice ? 0.34 : 0.26);
    set(pose, hw, 0.5 - strokeDirection * 0.04, slice ? 0.27 : 0.18);
    set(pose, se, 0.5 + strokeDirection * 0.03, 0.35);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.01 : 0.5 - strokeDirection * 0.06, slice ? 0.35 : 0.27);
  }

  return pose;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  return Object.fromEntries((Object.keys(a) as JointName[]).map((joint) => [
    joint,
    { x: lerp(a[joint].x, b[joint].x, t), y: lerp(a[joint].y, b[joint].y, t) },
  ])) as Pose;
}

export function poseAtProgress(
  actionType: string,
  tier: MotionTier,
  dominantSide: "left" | "right",
  progress: number,
  playingLevel?: string | null,
) {
  const value = clamp(progress);
  const index = Math.max(1, MOTION_STAGES.findIndex((item) => item.fraction >= value));
  const start = MOTION_STAGES[index - 1];
  const end = MOTION_STAGES[index] ?? MOTION_STAGES.at(-1)!;
  const local = end.fraction === start.fraction ? 0 : (value - start.fraction) / (end.fraction - start.fraction);
  return interpolatePose(
    stagePose(actionType, start.id, tier, dominantSide, playingLevel),
    stagePose(actionType, end.id, tier, dominantSide, playingLevel),
    clamp(local),
  );
}

export function stageAnchors(report: AnalysisReport, start: number, end: number) {
  const duration = Math.max(end - start, 0.1);
  const timeline = report.movementTimeline ?? [];
  const result = {} as Record<MotionStage, number>;
  let previous = start - 0.01;
  for (const stage of MOTION_STAGES) {
    const match = timeline.find((item) => PHASE_ALIASES[stage.id].includes(item.phase));
    const raw = match?.timestampSeconds ?? start + stage.fraction * duration;
    result[stage.id] = Math.min(end, Math.max(previous + 0.01, raw));
    previous = result[stage.id];
  }
  result.recovery = end;
  return result;
}

export function stageForTime(time: number, anchors: Record<MotionStage, number>) {
  let stage: MotionStage = "preparation";
  for (const item of MOTION_STAGES) if (time >= anchors[item.id]) stage = item.id;
  return stage;
}

export function progressForTime(time: number, start: number, end: number) {
  return clamp((time - start) / Math.max(end - start, 0.1));
}

export function nearestFrame(frames: FrameMetric[], time: number) {
  if (frames.length === 0) return undefined;
  let best = frames[0];
  let delta = Math.abs(best.timestampSeconds - time);
  for (const frame of frames) {
    const next = Math.abs(frame.timestampSeconds - time);
    if (next < delta) { best = frame; delta = next; }
  }
  return best;
}

/** Selects only a pose that has already occurred on the presented video clock. */
export function frameAtOrBefore(frames: FrameMetric[], time: number) {
  if (frames.length === 0) return undefined;
  if (time <= frames[0].timestampSeconds) return frames[0];
  let low = 0;
  let high = frames.length - 1;
  let match = frames[0];
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = frames[middle];
    if (candidate.timestampSeconds <= time) {
      match = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return match;
}
