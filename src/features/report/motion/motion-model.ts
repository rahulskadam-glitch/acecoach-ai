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
// Canonical 6-stage taxonomy shared across the whole report, matching the
// practical coaching breakdown used across elite academies and instructional
// content (e.g. Grass Tennis Club's 8-phase forehand, Feel Tennis's 8-step
// forehand, condensed to 6 by merging Split Step into Ready Position and
// Forward Swing into Contact): Ready Position, Unit Turn, Backswing,
// Forward Swing & Contact, Follow-Through, Recovery.
export type MotionStage = "ready" | "unit_turn" | "backswing" | "forward_swing_contact" | "follow_through" | "recovery";
export type MotionTier = "category" | "elite";
export type VideoRegistrationCalibration = NonNullable<NonNullable<AnalysisReport["frameSummary"]>["videoRegistration"]>;

export const MOTION_STAGES: Array<{ id: MotionStage; label: string; fraction: number }> = [
  { id: "ready", label: "Ready Position", fraction: 0 },
  { id: "unit_turn", label: "Unit Turn", fraction: 0.15 },
  { id: "backswing", label: "Backswing", fraction: 0.35 },
  { id: "forward_swing_contact", label: "Forward Swing & Contact", fraction: 0.62 },
  { id: "follow_through", label: "Follow-Through", fraction: 0.8 },
  { id: "recovery", label: "Recovery", fraction: 0.92 },
];

// Maps the backend's real timeline-anchor phase keys (from
// services/api/analysis_engine/biomechanics.py's _phase_frames: ready,
// preparation, loading, acceleration, contact_proxy, follow_through,
// recovery) onto the 6 canonical stages above. "forward_swing_contact"
// deliberately absorbs both the acceleration and contact anchors, matching
// the merged stage name.
const PHASE_ALIASES: Record<MotionStage, string[]> = {
  ready: ["ready", "start"],
  unit_turn: ["preparation", "unit_turn"],
  backswing: ["loading", "backlift", "cocking", "plant"],
  forward_swing_contact: ["acceleration", "forward_swing", "downswing", "arm_cocking", "contact", "impact", "contact_proxy", "ball_release"],
  follow_through: ["follow_through", "deceleration", "landing"],
  recovery: ["recovery", "ready_again", "return"],
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function containRect(containerWidth: number, containerHeight: number, mediaWidth: number, mediaHeight: number) {
  if (!mediaWidth || !mediaHeight) return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  const mediaRatio = mediaWidth / mediaHeight;
  const containerRatio = containerWidth / containerHeight;
  if (containerRatio > mediaRatio) {
    const width = containerHeight * mediaRatio;
    return { x: (containerWidth - width) / 2, y: 0, width, height: containerHeight };
  }
  const height = containerWidth / mediaRatio;
  return { x: 0, y: (containerHeight - height) / 2, width: containerWidth, height };
}

/** Maps pose-input normalized coordinates into the browser's decoded display space. */
export function calibratedNormalizedPoint(
  point: Point,
  registration?: Partial<VideoRegistrationCalibration>,
) {
  const crop = registration?.cropNormalized ?? { left: 0, top: 0, width: 1, height: 1 };
  let x = crop.left + point.x * crop.width;
  let y = crop.top + point.y * crop.height;
  if (!registration?.rotationAppliedByDecoder) {
    const rotation = ((registration?.rotationDegrees ?? 0) % 360 + 360) % 360;
    if (rotation === 90) [x, y] = [1 - y, x];
    else if (rotation === 180) [x, y] = [1 - x, 1 - y];
    else if (rotation === 270) [x, y] = [y, 1 - x];
  }
  if (registration?.mirrored) x = 1 - x;
  return { x: clamp(x), y: clamp(y) };
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
    if (stage === "ready") {
      set(pose, hw, 0.5 + direction * 0.11, 0.56);
      set(pose, he, 0.5 + direction * 0.08, 0.44);
      set(pose, sw, 0.5 - direction * 0.14, 0.25);
    } else if (stage === "unit_turn") {
      set(pose, hw, 0.5 + direction * 0.09, 0.36);
      set(pose, he, 0.5 + direction * 0.1, 0.4);
      set(pose, sw, 0.5 - direction * 0.13, 0.17);
    } else if (stage === "backswing") {
      set(pose, hw, 0.5 + direction * 0.06, 0.13);
      set(pose, he, 0.5 + direction * 0.14, 0.25);
      set(pose, sw, 0.5 - direction * 0.11, 0.08);
      set(pose, hk, 0.5 + direction * 0.09, 0.78);
      set(pose, sk, 0.5 - direction * 0.09, 0.78);
      pose.head.y = 0.15;
    } else if (stage === "forward_swing_contact") {
      set(pose, he, 0.5 + direction * 0.04, 0.15);
      set(pose, hw, 0.5 + direction * 0.05, 0.035);
      set(pose, sw, 0.5 - direction * 0.05, 0.43);
      set(pose, hh, 0.5 + direction * 0.04, 0.49);
      set(pose, sh, 0.5 - direction * 0.04, 0.51);
    } else if (stage === "follow_through") {
      set(pose, hw, 0.5 - direction * 0.07 * scale, 0.4);
      set(pose, he, 0.5 - direction * 0.02, 0.3);
      set(pose, sa, 0.5 - direction * 0.12, 0.92);
    } else if (stage === "recovery") {
      set(pose, hw, 0.5 - direction * 0.13 * scale, 0.45);
      set(pose, he, 0.5 - direction * 0.03, 0.34);
      set(pose, sa, 0.5 - direction * 0.18, 0.92);
    }
    return pose;
  }

  if (family === "volley") {
    if (stage === "ready" || stage === "unit_turn" || stage === "backswing") {
      set(pose, hw, 0.5 + direction * (stage === "backswing" ? 0.18 : stage === "unit_turn" ? 0.15 : 0.13), 0.37);
      set(pose, he, 0.5 + direction * 0.1, 0.39);
      set(pose, sw, 0.5 - direction * 0.07, 0.4);
    } else if (stage === "forward_swing_contact") {
      set(pose, hw, 0.5 + direction * 0.29 * scale, 0.37);
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

  if (stage === "ready") {
    set(pose, hs, 0.5 + strokeDirection * 0.04, 0.27);
    set(pose, ss, 0.5 - strokeDirection * 0.05, 0.28);
    set(pose, he, 0.5 - strokeDirection * 0.11, 0.39);
    set(pose, hw, 0.5 - strokeDirection * 0.2 * scale, slice ? 0.31 : 0.36);
    set(pose, se, 0.5 - strokeDirection * 0.04, 0.39);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.15 : 0.5 - strokeDirection * 0.04, 0.38);
  } else if (stage === "unit_turn") {
    set(pose, hs, 0.5 + strokeDirection * 0.07, 0.27);
    set(pose, ss, 0.5 - strokeDirection * 0.08, 0.28);
    set(pose, he, 0.5 - strokeDirection * 0.16 * scale, 0.4);
    set(pose, hw, 0.5 - strokeDirection * 0.22 * scale, slice ? 0.34 : 0.4);
    set(pose, se, 0.5 - strokeDirection * 0.07, 0.4);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.17 : 0.5 - strokeDirection * 0.05, 0.39);
  } else if (stage === "backswing") {
    set(pose, hw, 0.5 - strokeDirection * 0.24 * scale, slice ? 0.37 : 0.43);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.18 : 0.5 - strokeDirection * 0.02, 0.4);
    set(pose, hk, 0.5 + strokeDirection * 0.08, 0.77);
    set(pose, sk, 0.5 - strokeDirection * 0.08, 0.75);
    set(pose, ha, 0.5 + strokeDirection * 0.15 * scale, 0.92);
    set(pose, sa, 0.5 - strokeDirection * 0.16 * scale, 0.92);
    set(pose, hh, 0.5 + strokeDirection * 0.05, 0.55);
    set(pose, sh, 0.5 - strokeDirection * 0.05, 0.53);
  } else if (stage === "forward_swing_contact") {
    set(pose, he, 0.5 + strokeDirection * 0.13, slice ? 0.43 : 0.37);
    set(pose, hw, 0.5 + strokeDirection * 0.29 * scale, slice ? 0.47 : 0.36);
    set(pose, se, 0.5 + strokeDirection * (twoHands ? 0.08 : -0.02), 0.4);
    set(pose, sw, twoHands ? 0.5 + strokeDirection * 0.21 * scale : 0.5 - strokeDirection * 0.02, slice ? 0.45 : 0.37);
  } else if (stage === "follow_through") {
    set(pose, he, 0.5 + strokeDirection * 0.1, slice ? 0.38 : 0.3);
    set(pose, hw, 0.5 - strokeDirection * 0.01, slice ? 0.32 : 0.22);
    set(pose, se, 0.5 + strokeDirection * 0.04, 0.36);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.02 : 0.5 - strokeDirection * 0.05, slice ? 0.38 : 0.29);
  } else if (stage === "recovery") {
    set(pose, he, 0.5 + strokeDirection * 0.08, slice ? 0.34 : 0.26);
    set(pose, hw, 0.5 - strokeDirection * 0.04, slice ? 0.27 : 0.18);
    set(pose, se, 0.5 + strokeDirection * 0.03, 0.35);
    set(pose, sw, twoHands ? 0.5 - strokeDirection * 0.01 : 0.5 - strokeDirection * 0.06, slice ? 0.35 : 0.27);
    set(pose, hk, 0.5, 0.75);
    set(pose, sk, 0.5, 0.75);
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
  return result;
}

export function stageForTime(time: number, anchors: Record<MotionStage, number>) {
  let stage: MotionStage = "ready";
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
  if (time < frames[0].timestampSeconds) return undefined;
  if (time === frames[0].timestampSeconds) return frames[0];
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

const INTERPOLATED_NUMERIC_FIELDS: Array<keyof FrameMetric> = [
  "elbowAngle", "shoulderAngle", "kneeAngle", "shoulderPelvisSeparation", "baseWidthNormalized",
  "dominantKneeAngle", "oppositeKneeAngle", "dominantElbowAngle", "oppositeElbowAngle",
  "dominantShoulderAngle", "oppositeShoulderAngle", "dominantHipAngle", "oppositeHipAngle",
  "dominantAnkleAngle", "oppositeAnkleAngle", "trunkAngleDegrees", "headToComNormalized",
  "handToTorsoNormalized", "motionEnergy",
];

function interpolateNumber(previous: unknown, next: unknown, alpha: number) {
  return typeof previous === "number" && typeof next === "number" ? lerp(previous, next, alpha) : previous;
}

/** Interpolates measured pose samples onto the exact compositor-presented media time. */
export function interpolatedFrameAtTime(frames: FrameMetric[], time: number) {
  const previous = frameAtOrBefore(frames, time);
  if (!previous) return undefined;
  const previousIndex = frames.indexOf(previous);
  const next = frames[previousIndex + 1];
  if (!next || time <= previous.timestampSeconds) return previous;
  const interval = next.timestampSeconds - previous.timestampSeconds;
  if (interval <= 1e-6 || interval > 0.15) return previous;
  const alpha = clamp((time - previous.timestampSeconds) / interval);
  const previousLandmarks = previous.keyLandmarks ?? {};
  const nextLandmarks = next.keyLandmarks ?? {};
  const keyLandmarks: NonNullable<FrameMetric["keyLandmarks"]> = {};
  for (const name of new Set([...Object.keys(previousLandmarks), ...Object.keys(nextLandmarks)])) {
    const from = previousLandmarks[name];
    const to = nextLandmarks[name];
    if (from && to) {
      keyLandmarks[name] = {
        x: lerp(from.x, to.x, alpha),
        y: lerp(from.y, to.y, alpha),
        visibility: Math.min(from.visibility, to.visibility),
      };
    } else if (from) {
      keyLandmarks[name] = { ...from };
    }
  }
  const result: FrameMetric = {
    ...previous,
    timestampSeconds: time,
    keyLandmarks,
    centerOfMass: previous.centerOfMass && next.centerOfMass ? {
      x: lerp(previous.centerOfMass.x, next.centerOfMass.x, alpha),
      y: lerp(previous.centerOfMass.y, next.centerOfMass.y, alpha),
    } : previous.centerOfMass,
    interpolationAlpha: alpha,
  };
  const mutable = result as unknown as Record<string, unknown>;
  for (const field of INTERPOLATED_NUMERIC_FIELDS) {
    mutable[field] = interpolateNumber(previous[field], next[field], alpha);
  }
  return result;
}

type FilterState = { x: number; y: number; dx: number; dy: number; timestampSeconds: number; visibility: number };

export const ANNOTATION_VISIBILITY_THRESHOLD = 0.58;
export const LANDMARK_CONTINUITY_HOLD_SECONDS = 0.2;

function smoothingAlpha(cutoff: number, deltaTime: number) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / Math.max(deltaTime, 1e-4));
}

/** A causal One Euro filter: it uses current and past samples only and never predicts ahead. */
export class CausalLandmarkStabilizer {
  private readonly states = new Map<string, FilterState>();
  private readonly heldNames = new Set<string>();
  private lastTimestamp: number | null = null;

  reset() {
    this.states.clear();
    this.heldNames.clear();
    this.lastTimestamp = null;
  }

  /** True when a joint is being held briefly at its last measured position to prevent one-frame overlay gaps. */
  isContinuityHeld(name: string) {
    return this.heldNames.has(name);
  }

  update(frame: FrameMetric | undefined) {
    if (!frame?.keyLandmarks) return frame;
    if (this.lastTimestamp !== null && (frame.timestampSeconds <= this.lastTimestamp || frame.timestampSeconds - this.lastTimestamp > 0.35)) {
      this.reset();
    }
    const leftShoulder = frame.keyLandmarks.left_shoulder;
    const rightShoulder = frame.keyLandmarks.right_shoulder;
    const shoulderWidth = leftShoulder && rightShoulder
      ? Math.max(0.04, Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y))
      : 0.12;
    const filtered: NonNullable<FrameMetric["keyLandmarks"]> = {};
    this.heldNames.clear();

    for (const name of new Set([...Object.keys(frame.keyLandmarks), ...this.states.keys()])) {
      const point = frame.keyLandmarks[name];
      const state = this.states.get(name);
      if (!point || point.visibility < ANNOTATION_VISIBILITY_THRESHOLD) {
        if (state && frame.timestampSeconds - state.timestampSeconds <= LANDMARK_CONTINUITY_HOLD_SECONDS) {
          filtered[name] = { x: state.x, y: state.y, visibility: ANNOTATION_VISIBILITY_THRESHOLD };
          this.heldNames.add(name);
        } else {
          this.states.delete(name);
        }
        continue;
      }
      if (!state) {
        this.states.set(name, { x: point.x, y: point.y, dx: 0, dy: 0, timestampSeconds: frame.timestampSeconds, visibility: point.visibility });
        filtered[name] = { ...point };
        continue;
      }
      const deltaTime = Math.max(1e-4, frame.timestampSeconds - state.timestampSeconds);
      const jumpInShoulderWidths = Math.hypot(point.x - state.x, point.y - state.y) / shoulderWidth;
      const speedAllowance = name.includes("wrist") ? 9 : name.includes("ankle") ? 7 : 5;
      if (jumpInShoulderWidths > 0.28 + deltaTime * speedAllowance) {
        this.states.set(name, { x: point.x, y: point.y, dx: 0, dy: 0, timestampSeconds: frame.timestampSeconds, visibility: point.visibility });
        filtered[name] = { ...point };
        continue;
      }
      const rawDx = (point.x - state.x) / deltaTime;
      const rawDy = (point.y - state.y) / deltaTime;
      const derivativeAlpha = smoothingAlpha(1.0, deltaTime);
      const dx = lerp(state.dx, rawDx, derivativeAlpha);
      const dy = lerp(state.dy, rawDy, derivativeAlpha);
      const speed = Math.hypot(dx, dy) / shoulderWidth;
      const cutoff = (name.includes("wrist") ? 4.5 : 3.2) + (name.includes("wrist") ? 0.9 : 0.55) * speed;
      const alpha = smoothingAlpha(cutoff, deltaTime);
      const x = lerp(state.x, point.x, alpha);
      const y = lerp(state.y, point.y, alpha);
      this.states.set(name, { x, y, dx, dy, timestampSeconds: frame.timestampSeconds, visibility: point.visibility });
      filtered[name] = { x, y, visibility: point.visibility };
    }
    this.lastTimestamp = frame.timestampSeconds;
    return { ...frame, keyLandmarks: filtered };
  }
}

export function interpolatePoses(poseA: Pose, poseB: Pose, t: number): Pose {
  const clampedT = Math.max(0, Math.min(1, t));

  // Pixar / Studio Ghibli Kinetic Wave & Damped Harmonic Settling
  const getJointT = (joint: JointName): number => {
    let delay = 0;
    let speed = 1.0;

    if (joint.includes("hip") || joint.includes("ankle") || joint.includes("knee")) {
      // Lower body & hips lead the motion
      delay = 0.0;
      speed = 1.15;
    } else if (joint.includes("shoulder") || joint === "head") {
      // Upper torso and head lag slightly behind hips
      delay = 0.05;
      speed = 1.18;
    } else if (joint.includes("elbow")) {
      // Arm lever lags behind torso
      delay = 0.10;
      speed = 1.22;
    } else if (joint.includes("wrist")) {
      // Wrist lags into lag slot, then snaps with explosive whip acceleration
      delay = 0.14;
      speed = 1.28;
    }

    const localT = Math.max(0, Math.min(1, (clampedT - delay) * speed));
    // Smooth Hermite cubic ease-in-out curve
    const hermite = localT * localT * (3 - 2 * localT);

    // Studio Ghibli / Weta FX Soft Damped Harmonic Settling on Deceleration (when localT > 0.85)
    if (localT > 0.85 && localT < 1.0) {
      const settleT = (localT - 0.85) / 0.15;
      const dampedWave = Math.sin(settleT * Math.PI * 2) * Math.exp(-settleT * 3.5) * 0.025;
      return Math.max(0, Math.min(1, hermite + dampedWave));
    }

    return hermite;
  };

  const joints: JointName[] = [
    "head",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
  ];
  const result: Partial<Pose> = {};
  for (const j of joints) {
    const ptA = poseA[j];
    const ptB = poseB[j];
    const easeT = getJointT(j);
    result[j] = {
      x: ptA.x + (ptB.x - ptA.x) * easeT,
      y: ptA.y + (ptB.y - ptA.y) * easeT,
    };
  }
  return result as Pose;
}
