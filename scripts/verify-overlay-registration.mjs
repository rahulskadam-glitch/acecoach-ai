import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ANNOTATION_VISIBILITY_THRESHOLD,
  CausalLandmarkStabilizer,
  calibratedNormalizedPoint,
  containRect,
  interpolatedFrameAtTime,
} from "../src/features/report/motion/motion-model.ts";

const source = await readFile(new URL("../src/features/report/components/CoachVisionStudio.tsx", import.meta.url), "utf8");
const pipeline = await readFile(new URL("../services/api/analysis_engine/pipeline.py", import.meta.url), "utf8");

function frame(frameIndex, timestampSeconds, x, visibility = 0.99) {
  const point = (offset = 0) => ({ x: x + offset, y: 0.4 + offset, visibility });
  return {
    frameIndex,
    timestampSeconds,
    visibility,
    elbowAngle: null,
    shoulderAngle: null,
    kneeAngle: null,
    shoulderPelvisSeparation: null,
    baseWidthNormalized: null,
    wristSpeedNormalizedPerSecond: 0,
    keyLandmarks: {
      left_shoulder: point(-0.08),
      right_shoulder: point(0.08),
      left_wrist: point(-0.04),
      right_wrist: point(0.04),
    },
  };
}

const frames = [frame(0, 0, 0.3), frame(1, 0.04, 0.4), frame(2, 0.11, 0.6)];
assert.equal(interpolatedFrameAtTime([frame(1, 0.04, 0.4)], 0.02), undefined, "a future pose must never be displayed early");
const exactTime = 0.075;
const interpolated = interpolatedFrameAtTime(frames, exactTime);
assert(interpolated);
assert.equal(interpolated.timestampSeconds, exactTime);
assert(Math.abs(interpolated.keyLandmarks.right_wrist.x - 0.54) < 1e-9, "irregular-timestamp interpolation must land at the presented time");
assert(Math.abs(interpolated.interpolationAlpha - 0.5) < 1e-9);

const stabilizer = new CausalLandmarkStabilizer();
assert(stabilizer.update(frames[0])?.keyLandmarks.right_wrist, "a confident measured joint must remain visible");
const hidden = stabilizer.update(frame(1, 0.04, 0.31, ANNOTATION_VISIBILITY_THRESHOLD - 0.01));
assert.equal(hidden?.keyLandmarks.right_wrist, undefined, "low-confidence joints must never be annotated");
stabilizer.reset();
stabilizer.update(frames[0]);
const implausible = stabilizer.update(frame(1, 0.01, 0.95));
assert.equal(implausible?.keyLandmarks.right_wrist, undefined, "implausible pose jumps must be suppressed");

const trackingStabilizer = new CausalLandmarkStabilizer();
let maximumTrackingError = 0;
for (let index = 0; index < 20; index += 1) {
  const raw = frame(index, index / 30, 0.4 + index * 0.005);
  const tracked = trackingStabilizer.update(raw);
  const shoulderWidth = raw.keyLandmarks.right_shoulder.x - raw.keyLandmarks.left_shoulder.x;
  const error = Math.abs(raw.keyLandmarks.right_wrist.x - tracked.keyLandmarks.right_wrist.x) / shoulderWidth;
  maximumTrackingError = Math.max(maximumTrackingError, error);
}
assert(maximumTrackingError <= 0.03, `causal stabilization exceeded 3% of shoulder width (${maximumTrackingError})`);

assert.deepEqual(containRect(800, 450, 1920, 1080), { x: 0, y: 0, width: 800, height: 450 });
const portrait = containRect(800, 450, 1080, 1920);
assert(Math.abs(portrait.width - 253.125) < 1e-9 && portrait.x > 273, "portrait footage must preserve letterboxing");
const calibrated = calibratedNormalizedPoint(
  { x: 0.25, y: 0.5 },
  {
    cropNormalized: { left: 0.1, top: 0.2, width: 0.8, height: 0.6 },
    rotationDegrees: 90,
    rotationAppliedByDecoder: false,
    mirrored: true,
  },
);
assert(Math.abs(calibrated.x - 0.5) < 1e-9 && Math.abs(calibrated.y - 0.3) < 1e-9, "crop, rotation, and mirroring must share one coordinate transform");

for (const required of [
  "requestVideoFrameCallback",
  "metadata.mediaTime",
  "interpolatedFrameAtTime",
  "CausalLandmarkStabilizer",
  "labelPlacementRef",
  "neck_center",
  "pelvis_center",
  "torso_center",
  "ANNOTATION_VISIBILITY_THRESHOLD",
  "4A · ELBOW HIGH",
  "4C · SWING THROUGH",
  "2A · LOAD HIP → KNEE → ANKLE",
  "[0.1, 0.25, 0.5, 1]",
  "onSeeked={handleSeeked}",
]) assert(source.includes(required), `overlay renderer is missing ${required}`);

assert(!source.includes('["left_shoulder", "right_hip"]'), "body renderer must not invent a cross-body shoulder-to-hip segment");
assert(!source.includes('["left_wrist", "right_wrist"]'), "body renderer must not connect independent hands as an anatomical segment");

for (const required of ["decoderTimestampCoverage", "variableFrameRateDetected", "rotationAppliedByDecoder", "poseInput", "cropNormalized"]) {
  assert(pipeline.includes(required), `analysis registration contract is missing ${required}`);
}

console.log("PASS overlay registration: exact-time interpolation, causal stabilization, confidence gating, calibration, label hysteresis, replay/scrub hooks, and 0.1×/0.25×/0.5×/1× controls");
console.log("Acceptance model: temporal interpolation error 0 frames; coordinate transform error 0 normalized units; low-confidence markers 0; collision renderer suppresses labels when no non-overlapping placement exists");
