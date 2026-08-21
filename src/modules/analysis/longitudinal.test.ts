import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildPersonalBaselineComparison,
  reduceDevelopmentState,
  reduceSharedRootConstruct,
  resolveMeasuredDistribution,
  type ConstructDistribution,
  type DevelopmentState,
} from "./longitudinal.ts";

test("fails closed instead of fabricating a construct distribution", () => {
  assert.equal(resolveMeasuredDistribution(undefined, 70, 80, 2), null);
  assert.equal(resolveMeasuredDistribution(55, undefined, 80, 2), null);
  assert.deepEqual(resolveMeasuredDistribution(55, 70, 80, 2), { medianScore: 55, spread: 15, captureScore: 80 });
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
    knowledgePolicyVersion: "policy-v1",
    knowledgeManifestHash: "manifest-v1",
    recordedAt: `2026-08-${sessionId.padStart(2, "0")}T10:00:00.000Z`,
    ...overrides,
  };
}

const existing: DevelopmentState = {
  primaryConstructId: "movement_spacing",
  activeCue: "Keep adjusting before the swing.",
  successMetric: "Seven of ten reps preserve space.",
  status: "active",
  confidence: null,
  evidenceSummary: null,
};

const baselineRequirements = {
  minimumPriorSessions: 3,
  minimumPriorRepetitions: 18,
  minimumMeasurementConfidence: 0.65,
  maximumCaptureScoreDifference: 15,
};

const longitudinalRequirements = {
  ...baselineRequirements,
  minimumHistorySessions: 2,
  historyWindowSessions: 3,
  meaningfulShiftPoints: 4,
  minimumStatusConfidence: 0.65,
  sustainedStableSessionsForSolved: 3,
  retentionWindowSessions: 2,
};

test("requires two earlier comparable sessions before a learning claim", () => {
  const decision = reduceDevelopmentState(
    distribution("3", 74),
    [distribution("2", 68)],
    existing,
    "A new cue that should not churn.",
    "A new metric.",
    longitudinalRequirements,
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
    longitudinalRequirements,
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
    longitudinalRequirements,
  );
  assert.equal(plateau.status, "plateaued");
  assert.equal(plateau.archetype, "REGRESSION_OR_PLATEAU");

  const regression = reduceDevelopmentState(
    distribution("4", 61),
    [distribution("2", 68), distribution("3", 70)],
    existing,
    null,
    null,
    longitudinalRequirements,
  );
  assert.equal(regression.status, "regressed");
  assert.equal(regression.archetype, "REGRESSION_OR_PLATEAU");
  assert.match(regression.reason, /no cause is inferred/i);
});

test("reports emerging status when there is no prior belief and not enough history yet", () => {
  const decision = reduceDevelopmentState(
    distribution("3", 74),
    [distribution("2", 68)],
    null,
    "First proposed cue.",
    "First metric.",
    longitudinalRequirements,
  );
  assert.equal(decision.comparable, false);
  assert.equal(decision.status, "emerging");
  assert.equal(decision.cueChangeReason, "initialized");
});

test("reports uncertain status when comparable evidence clears the baseline gate but not the status confidence bar", () => {
  const requirements = { ...longitudinalRequirements, minimumStatusConfidence: 0.75 };
  const decision = reduceDevelopmentState(
    distribution("4", 76, { confidence: 0.7 }),
    [distribution("2", 68, { confidence: 0.7 }), distribution("3", 69, { confidence: 0.7 })],
    existing,
    null,
    null,
    requirements,
  );
  assert.equal(decision.comparable, true);
  assert.equal(decision.status, "uncertain");
  assert.equal(decision.archetype, null);
});

test("promotes to solved after sustained improvement with a stable cue history", () => {
  const improvingExisting: DevelopmentState = { ...existing, status: "improving" };
  const decision = reduceDevelopmentState(
    distribution("6", 80),
    [distribution("2", 68), distribution("3", 69)],
    improvingExisting,
    null,
    null,
    longitudinalRequirements,
    [{ changeReason: "stable" }, { changeReason: "stable" }],
  );
  assert.equal(decision.status, "solved");
  assert.equal(decision.cueChangeReason, "solved");
  assert.equal(decision.evidenceSummary.retentionChecksRemaining, longitudinalRequirements.retentionWindowSessions);
});

test("does not promote to solved without enough stable cue history", () => {
  const improvingExisting: DevelopmentState = { ...existing, status: "improving" };
  const decision = reduceDevelopmentState(
    distribution("6", 80),
    [distribution("2", 68), distribution("3", 69)],
    improvingExisting,
    null,
    null,
    longitudinalRequirements,
    [{ changeReason: "stable" }],
  );
  assert.equal(decision.status, "improving");
  assert.notEqual(decision.status, "solved");
});

test("detects retention failure when a solved belief regresses", () => {
  const solvedExisting: DevelopmentState = { ...existing, status: "solved", evidenceSummary: { retentionChecksRemaining: 2 } };
  const decision = reduceDevelopmentState(
    distribution("6", 60),
    [distribution("2", 68), distribution("3", 70)],
    solvedExisting,
    null,
    null,
    longitudinalRequirements,
  );
  assert.equal(decision.status, "retention_regressed");
  assert.equal(decision.archetype, "RETENTION_FAILURE");
  assert.equal(decision.cueChangeReason, "disproven");
  assert.equal(decision.isRetentionFailure, true);
});

test("supersedes a solved belief once the retention window completes clean", () => {
  const solvedExisting: DevelopmentState = { ...existing, status: "solved", evidenceSummary: { retentionChecksRemaining: 1 } };
  const decision = reduceDevelopmentState(
    distribution("6", 78),
    [distribution("2", 68), distribution("3", 69)],
    solvedExisting,
    null,
    null,
    longitudinalRequirements,
  );
  assert.equal(decision.status, "superseded");
  assert.equal(decision.cueChangeReason, "superseded");
});

test("keeps a solved belief in its retention window when checks remain", () => {
  const solvedExisting: DevelopmentState = { ...existing, status: "solved", evidenceSummary: { retentionChecksRemaining: 2 } };
  const decision = reduceDevelopmentState(
    distribution("6", 78),
    [distribution("2", 68), distribution("3", 69)],
    solvedExisting,
    null,
    null,
    longitudinalRequirements,
  );
  assert.equal(decision.status, "solved");
  assert.equal(decision.cueChangeReason, "stable");
  assert.equal(decision.evidenceSummary.retentionChecksRemaining, 1);
});

test("releases a superseded belief so a new construct can be proposed", () => {
  const supersededExisting: DevelopmentState = { ...existing, status: "superseded", primaryConstructId: "old_construct" };
  const decision = reduceDevelopmentState(
    distribution("3", 74, { constructId: "new_construct" }),
    [distribution("2", 68, { constructId: "new_construct" })],
    supersededExisting,
    "Fresh cue.",
    "Fresh metric.",
    longitudinalRequirements,
  );
  assert.equal(decision.primaryConstructId, "new_construct");
  assert.equal(decision.activeCue, "Fresh cue.");
  assert.equal(decision.cueChangeReason, "initialized");
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
    longitudinalRequirements,
  );
  assert.equal(decision.comparable, false);
  assert.deepEqual(decision.comparisonSessionIds, []);
});

test("builds a personal distribution only from enough context-matched history", () => {
  const baseline = buildPersonalBaselineComparison(
    [distribution("5", 76)],
    [distribution("2", 68), distribution("3", 72), distribution("4", 74)],
    baselineRequirements,
  );
  assert.equal(baseline.status, "available");
  assert.equal(baseline.priorSessionCount, 3);
  assert.deepEqual(baseline.areas[0], {
    constructId: "movement_spacing",
    currentScore: 76,
    typicalScore: 72,
    highestReliableScore: 74,
    differenceFromTypical: 4,
    differenceFromHighest: 2,
    priorSessionCount: 3,
    priorRepetitionCount: 24,
    typicalSpread: 8,
  });
});

test("personal baseline fails closed for sparse or mismatched history", () => {
  const baseline = buildPersonalBaselineComparison(
    [distribution("5", 76)],
    [
      distribution("2", 68),
      distribution("3", 72, { contextSignature: "another-context" }),
      distribution("4", 74, { engineVersion: "engine-v2" }),
    ],
    baselineRequirements,
  );
  assert.equal(baseline.status, "collecting");
  assert.deepEqual(baseline.areas, []);
  assert.match(baseline.reason, /3 earlier matching videos/i);
});

test("does not mix personal baselines across knowledge manifests", () => {
  const baseline = buildPersonalBaselineComparison(
    [distribution("5", 76)],
    [
      distribution("2", 68, { knowledgeManifestHash: "older-manifest" }),
      distribution("3", 72, { knowledgeManifestHash: "older-manifest" }),
      distribution("4", 74, { knowledgeManifestHash: "older-manifest" }),
    ],
    baselineRequirements,
  );
  assert.equal(baseline.status, "collecting");
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
