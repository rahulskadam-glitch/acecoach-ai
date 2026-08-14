import assert from "node:assert/strict";
import { test } from "vitest";

import {
  reduceDevelopmentState,
  reduceSharedRootConstruct,
  resolveMeasuredDistribution,
  type ConstructDistribution,
  type DevelopmentState,
} from "./longitudinal.ts";

test("fails closed instead of fabricating a construct distribution", () => {
  assert.equal(resolveMeasuredDistribution(undefined, 70, 80), null);
  assert.equal(resolveMeasuredDistribution(55, undefined, 80), null);
  assert.deepEqual(resolveMeasuredDistribution(55, 70, 80), { medianScore: 55, spread: 15, captureScore: 80 });
});


function distribution(
  sessionId: string,
  medianScore: number,
  overrides: Partial<ConstructDistribution> = {},
): ConstructDistribution {
  return {
    sessionId,
    constructId: "movement_spacing",
    contextSignature: "same-context",
    sampleCount: 8,
    medianScore,
    spread: 8,
    successRate: 0.7,
    confidence: 0.82,
    captureScore: 84,
    engineVersion: "engine-v1",
    runtimeSignature: "runtime-v1",
    recordedAt: `2026-08-${sessionId.padStart(2, "0")}T10:00:00.000Z`,
    ...overrides,
  };
}

const existing: DevelopmentState = {
  primaryConstructId: "movement_spacing",
  activeCue: "Keep adjusting before the swing.",
  successMetric: "Seven of ten reps preserve space.",
  status: "active",
};

test("requires two earlier comparable sessions before a learning claim", () => {
  const decision = reduceDevelopmentState(
    distribution("3", 74),
    [distribution("2", 68)],
    existing,
    "A new cue that should not churn.",
    "A new metric.",
  );
  assert.equal(decision.comparable, false);
  assert.equal(decision.archetype, null);
  assert.equal(decision.activeCue, existing.activeCue);
  assert.equal(decision.cueChangeReason, "stable");
});

test("emits progress only after a meaningful multi-session distribution shift", () => {
  const decision = reduceDevelopmentState(
    distribution("4", 76),
    [distribution("2", 68), distribution("3", 69)],
    existing,
    "Different proposed cue.",
    "Different proposed metric.",
  );
  assert.equal(decision.comparable, true);
  assert.equal(decision.status, "improving");
  assert.equal(decision.archetype, "PROGRESS_SHIFT");
  assert.equal(decision.baselineMedian, 68.5);
  assert.equal(decision.shift, 7.5);
  assert.equal(decision.activeCue, existing.activeCue);
});

test("plateau and regression use the non-causal trend archetype", () => {
  const plateau = reduceDevelopmentState(
    distribution("4", 70),
    [distribution("2", 68), distribution("3", 69)],
    existing,
    null,
    null,
  );
  assert.equal(plateau.status, "plateaued");
  assert.equal(plateau.archetype, "REGRESSION_OR_PLATEAU");

  const regression = reduceDevelopmentState(
    distribution("4", 61),
    [distribution("2", 68), distribution("3", 70)],
    existing,
    null,
    null,
  );
  assert.equal(regression.status, "regressed");
  assert.equal(regression.archetype, "REGRESSION_OR_PLATEAU");
  assert.match(regression.reason, /no cause is inferred/i);
});

test("rejects history with incompatible runtime or capture quality", () => {
  const decision = reduceDevelopmentState(
    distribution("4", 80),
    [
      distribution("2", 60, { runtimeSignature: "other-runtime" }),
      distribution("3", 60, { captureScore: 40 }),
    ],
    null,
    "Set early.",
    "Retain next session.",
  );
  assert.equal(decision.comparable, false);
  assert.deepEqual(decision.comparisonSessionIds, []);
});

const sharedContract = {
  minimumDistinctActions: 2,
  minimumSessionsPerAction: 2,
  minimumConfidence: 0.65,
  maximumCaptureScoreDifference: 15,
  maximumLimiterMedianScore: 78,
  eligibleActionsByConstruct: {
    movement_spacing: ["forehand", "two_handed_backhand", "serve"],
  },
};

test("promotes independently supported matched-context evidence to a shared root", () => {
  const insight = reduceSharedRootConstruct([
    { actionType: "forehand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["fh-1", "fh-2"], medianScore: 66, confidence: 0.81, captureScore: 84, cue: "Keep adjusting before the swing." },
    { actionType: "two_handed_backhand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["bh-1", "bh-2"], medianScore: 69, confidence: 0.78, captureScore: 79, cue: "Keep adjusting before the swing." },
  ], sharedContract);
  assert.equal(insight?.archetype, "SHARED_ROOT_CONSTRUCT");
  assert.deepEqual(insight?.actionTypes, ["forehand", "two_handed_backhand"]);
  assert.equal(insight?.sharedCue, "Keep adjusting before the swing.");
  assert.equal(insight?.confidence, 0.78);
});

test("keeps stroke cues separate and suppresses context or evidence mismatches", () => {
  const differentCues = reduceSharedRootConstruct([
    { actionType: "forehand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["fh-1", "fh-2"], medianScore: 66, confidence: 0.81, captureScore: 84, cue: "Adjust longer." },
    { actionType: "two_handed_backhand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["bh-1", "bh-2"], medianScore: 69, confidence: 0.78, captureScore: 79, cue: "Land outside the ball." },
  ], sharedContract);
  assert.equal(differentCues?.sharedCue, null);
  assert.equal(differentCues?.strokeSpecificCues.forehand, "Adjust longer.");

  const mismatched = reduceSharedRootConstruct([
    { actionType: "forehand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["fh-1", "fh-2"], medianScore: 66, confidence: 0.81, captureScore: 84, cue: null },
    { actionType: "two_handed_backhand", constructId: "movement_spacing", contextClass: "defensive_on_run:consistency", sessionIds: ["bh-1", "bh-2"], medianScore: 69, confidence: 0.78, captureScore: 79, cue: null },
  ], sharedContract);
  assert.equal(mismatched, null);
});

test("suppresses a shared root when one stroke lacks independent history", () => {
  const insight = reduceSharedRootConstruct([
    { actionType: "forehand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["fh-1", "fh-2"], medianScore: 66, confidence: 0.81, captureScore: 84, cue: null },
    { actionType: "two_handed_backhand", constructId: "movement_spacing", contextClass: "neutral_rally:consistency", sessionIds: ["bh-1"], medianScore: 69, confidence: 0.78, captureScore: 79, cue: null },
  ], sharedContract);
  assert.equal(insight, null);
});
