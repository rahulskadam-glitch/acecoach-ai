import { describe, expect, it } from "vitest";

import type { AnalysisReport } from "@/modules/analysis/types";
import { movementChainEvidence, normalizedMovementChain } from "./movement-chain";

function fakeReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    ontologyReasoning: {
      assessmentPolicy: { strengthMinimumScore: 82, minimumMeasurementConfidence: 0.65 },
      movementChain: [
        { id: "ready", label: "Ready Position", status: "strength", score: 90, summary: "Good." },
        { id: "unit_turn", label: "Unit Turn", status: "strength", score: 85, summary: "Good." },
        { id: "backswing", label: "Backswing", status: "developing", score: 60, summary: "Ok." },
        // No persisted `evidence` here on purpose: this forces the legacy
        // reconstruction path in movementChainEvidence().
        { id: "forward_swing_contact", label: "Forward Swing & Contact", status: "developing", score: 55, summary: "Ok." },
        { id: "follow_through", label: "Follow-Through", status: "strength", score: 88, summary: "Good." },
        { id: "recovery", label: "Recovery", status: "strength", score: 91, summary: "Good." },
      ],
    },
    coachingAreas: [
      { id: "body_position", label: "Body position and head control", score: 55, status: "developing", observation: "x", coachingGoal: "x", cue: "x" },
      { id: "contact_spacing", label: "Contact-spacing proxy", score: 62, status: "developing", observation: "y", coachingGoal: "y", cue: "y" },
    ],
    ...overrides,
  } as unknown as AnalysisReport;
}

describe("normalizedMovementChain", () => {
  it("returns all 6 chapters, not a 4-stage collapse", () => {
    const chain = normalizedMovementChain(fakeReport());
    expect(chain.map((item) => item.id)).toEqual([
      "ready",
      "unit_turn",
      "backswing",
      "forward_swing_contact",
      "follow_through",
      "recovery",
    ]);
  });
});

describe("movementChainEvidence", () => {
  it("attaches both body_position and contact_spacing to the forward_swing_contact chapter", () => {
    const report = fakeReport();
    const contactItem = report.ontologyReasoning!.movementChain.find((item) => item.id === "forward_swing_contact")!;
    const evidence = movementChainEvidence(report, contactItem);
    expect(evidence.map((item) => item.areaId).sort()).toEqual(["body_position", "contact_spacing"]);
  });

  it("no longer attaches contact_spacing to unit_turn", () => {
    const report = fakeReport();
    const spacingItem = report.ontologyReasoning!.movementChain.find((item) => item.id === "unit_turn")!;
    const evidence = movementChainEvidence(report, spacingItem);
    expect(evidence.map((item) => item.areaId)).not.toContain("contact_spacing");
  });

  it("still reconstructs evidence for pre-2026-08-15 chapter ids (legacy reports)", () => {
    const report = fakeReport({
      ontologyReasoning: {
        assessmentPolicy: { strengthMinimumScore: 82, minimumMeasurementConfidence: 0.65 },
        movementChain: [
          { id: "contact_stability", label: "Head & contact stability", status: "developing", score: 55, summary: "Ok." },
        ],
      },
    } as unknown as Partial<AnalysisReport>);
    const legacyItem = report.ontologyReasoning!.movementChain[0];
    const evidence = movementChainEvidence(report, legacyItem);
    expect(evidence.map((item) => item.areaId).sort()).toEqual(["body_position", "contact_spacing"]);
  });
});

describe("normalizedMovementChain — pre-2026-08-15 report shapes", () => {
  function legacyReport(): AnalysisReport {
    return {
      ontologyReasoning: {
        assessmentPolicy: { strengthMinimumScore: 82, minimumMeasurementConfidence: 0.65 },
        movementChain: [
          { id: "setup", label: "Setup & timing", status: "strength", score: 90, summary: "Good." },
          { id: "movement_spacing", label: "Footwork & spacing", status: "strength", score: 85, summary: "Good." },
          // Old reports combined loading + extension into one chapter, so
          // there is no separate stored chapter matching "follow_through".
          { id: "weight_transfer", label: "Weight transfer & leg drive", status: "developing", score: 60, summary: "Ok." },
          { id: "swing_connection", label: "Body-to-racket connection", status: "developing", score: 74, summary: "Sequenced but not repeatable." },
          { id: "contact_stability", label: "Head & contact stability", status: "priority", score: 48, faultId: "BH-HEAD-01", summary: "Head moves early." },
          { id: "finish_recovery", label: "Finish & recovery", status: "strength", score: 91, summary: "Good." },
        ],
      },
      coachingAreas: [
        { id: "lower_body_extension", label: "Knee drive after loading", score: 70, status: "developing", observation: "z", coachingGoal: "z", cue: "z" },
      ],
    } as unknown as AnalysisReport;
  }

  it("always returns exactly the 6 canonical ids in canonical order", () => {
    const chain = normalizedMovementChain(legacyReport());
    expect(chain.map((item) => item.id)).toEqual([
      "ready",
      "unit_turn",
      "backswing",
      "forward_swing_contact",
      "follow_through",
      "recovery",
    ]);
    expect(chain.map((item) => item.label)).toEqual([
      "Ready Position",
      "Unit Turn",
      "Backswing",
      "Forward Swing & Contact",
      "Follow-Through",
      "Recovery",
    ]);
  });

  it("merges swing_connection and contact_stability into one forward_swing_contact chapter, keeping the more severe status", () => {
    const chain = normalizedMovementChain(legacyReport());
    const merged = chain.find((item) => item.id === "forward_swing_contact")!;
    expect(merged.status).toBe("priority");
    expect(merged.faultId).toBe("BH-HEAD-01");
    expect(merged.score).toBe(Math.round((74 + 48) / 2));
  });

  it("synthesizes a follow_through chapter from coachingAreas when no legacy chapter covers it", () => {
    const chain = normalizedMovementChain(legacyReport());
    const followThrough = chain.find((item) => item.id === "follow_through")!;
    expect(followThrough.score).toBe(70);
    expect(followThrough.status).toBe("developing");
    expect(followThrough.evidence?.map((item) => item.areaId)).toContain("lower_body_extension");
  });
});
