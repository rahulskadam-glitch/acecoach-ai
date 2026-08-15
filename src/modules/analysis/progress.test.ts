import assert from "node:assert/strict";
import { test } from "vitest";

import type { AnalysisReport } from "./types";
import {
  buildProgressComparison,
  buildReassessmentVerdict,
  reportComparisonContext,
  type ComparableReport,
} from "./progress";

function report(score = 76): AnalysisReport {
  return {
    overallScore: score,
    captureQuality: { score: 84 },
    qualityGate: { canUseTechniqueScore: true },
    engineManifest: { engineVersion: "engine-v1", runtimeSignature: "runtime-v1", ontologyManifestHash: "manifest-v1" },
    knowledgeControl: { status: "CONTROLLED", failClosed: true, policyVersion: "policy-v1", ontologyVersion: "4.1.0", manifestHash: "manifest-v1", domains: {} as never, legacyRecordPolicy: "read_only", reportFallbacksAllowed: false, contracts: { comparisons: { maximumCaptureScoreDifference: 15, improvedScoreDelta: 4, unchangedLowerScoreDelta: -4, requireSameEngine: true, requireSameRuntime: true, requireSameContext: true, requireSameKnowledgePolicy: true, requireSameManifestHash: true }, longitudinal: { distributionSpreadDivisor: 2, minimumHistorySessions: 2, historyWindowSessions: 3, meaningfulShiftPoints: 4 } } },
    priorities: [{ title: "Create earlier space" }],
    coachingAreas: [{ id: "spacing", label: "Spacing", score: 72, status: "developing", observation: "Space varies.", coachingGoal: "Create space earlier.", cue: "Move first." }],
    frameSummary: {
      analysisContext: {
        cameraAngle: "side",
        shotSituation: "neutral_rally",
        shotIntent: "consistency",
      },
    },
    ontologyReasoning: {
      movementChain: [
        { id: "setup", label: "Setup & timing", status: "developing", score: 79, summary: "Measured." },
        { id: "movement_spacing", label: "Footwork & spacing", status: "priority", score: 68, summary: "Measured." },
      ],
    },
  } as unknown as AnalysisReport;
}

function previous(current: AnalysisReport): ComparableReport {
  return {
    sessionId: "previous",
    createdAt: "2026-08-01T10:00:00.000Z",
    overallScore: 70,
    scoreStatus: "provisional_criterion_index",
    confidence: 0.84,
    captureScore: 82,
    engineVersion: "engine-v1",
    runtimeSignature: "runtime-v1",
    knowledgePolicyVersion: "policy-v1",
    knowledgeManifestHash: "manifest-v1",
    contextSignature: reportComparisonContext(current),
    coachingAreas: [{ id: "spacing", label: "Spacing", score: 65, status: "developing", observation: "Space varies.", coachingGoal: "Create space earlier.", cue: "Move first." }],
    movementChain: [
      { id: "setup", label: "Setup & timing", status: "developing", score: 75, summary: "Measured." },
      { id: "movement_spacing", label: "Footwork & spacing", status: "priority", score: 62, summary: "Measured." },
    ],
  };
}

test("compares the same six-phase construct against a context-matched report", () => {
  const current = report();
  const comparison = buildProgressComparison(current, previous(current));
  assert.equal(comparison?.comparable, true);
  assert.deepEqual(comparison?.phaseDeltas, [
    { id: "setup", label: "Setup & timing", previous: 75, current: 79, delta: 4 },
    { id: "movement_spacing", label: "Footwork & spacing", previous: 62, current: 68, delta: 6 },
  ]);
  assert.equal(buildReassessmentVerdict(comparison)?.status, "improved");
});

test("fails closed when recording context is not matched", () => {
  const current = report();
  const candidate = { ...previous(current), contextSignature: "rear:controlled_practice:depth" };
  const comparison = buildProgressComparison(current, candidate);
  assert.equal(comparison?.comparable, false);
  assert.match(comparison?.reason ?? "", /camera view/i);
  assert.equal(buildReassessmentVerdict(comparison)?.status, "needs_comparable");
});

test("fails closed when the knowledge policy or ontology manifest differs", () => {
  const current = report();
  const candidate = { ...previous(current), knowledgeManifestHash: "another-manifest" };
  const comparison = buildProgressComparison(current, candidate);
  assert.equal(comparison?.comparable, false);
  assert.match(comparison?.reason ?? "", /knowledge policy|ontology evidence/i);
});

test("uses a stability band for the unchanged verdict", () => {
  const current = report(72);
  const comparison = buildProgressComparison(current, previous(current));
  assert.equal(comparison?.scoreDelta, 2);
  assert.equal(buildReassessmentVerdict(comparison)?.status, "unchanged");
});
