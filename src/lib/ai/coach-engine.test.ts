import { describe, expect, it } from "vitest";
import {
  COACH_QUESTIONS_TAXONOMY,
  generateIntelligentCoachResponse,
  type GroundedCoachContext,
} from "./coach-engine";

const mockContext: GroundedCoachContext = {
  sportName: "Tennis",
  movementName: "Forehand",
  actionType: "forehand",
  overallScore: 84,
  mainPriority: "Deepen Racket Drop Lag by +12cm",
  priorityFinding: "Racket head is dropping 6cm shallow relative to your wrist, reducing gravitational whip into contact.",
  whyItMatters: "Creates an elastic gravitational sling for +8 to +10 mph ball speed.",
  cue: "Let the racket head drop below your wrist before accelerating forward.",
  successTarget: "Racket head drops 10-15cm below wrist on 8 of 10 forehands.",
  primaryTimestamp: 1.15,
  strengths: ["Explosive lower body ground reaction loading (75% rear foot elastic coil)."],
  drills: [
    {
      id: "d1",
      name: "Lag-and-Snap Shadow Swings",
      purpose: "Feel the racket drop below hand height.",
      cue: "Loose wrist, drop then whip",
      dosage: "3 sets of 12 controlled reps",
      successMetric: "8 of 10 reps",
    },
    {
      id: "d2",
      name: "Progressive Drop-Feed Impact Lock",
      purpose: "Transfer feel cue into live ball timing.",
      cue: "Quiet head, whip through slot",
      dosage: "4 sets of 10 feeds",
      successMetric: "Clean sweet spot contact",
    },
    {
      id: "d3",
      name: "Crosscourt Rally Depth Transfer",
      purpose: "Maintain mechanic under match conditions.",
      cue: "Drive through front shoe, recover",
      dosage: "15 rally balls",
      successMetric: "Deep inside baseline",
    },
  ],
  phases: [],
  metrics: [],
  kinetics: {
    measuredTorsoCoilDeg: 28,
    proBenchmarkCoilDeg: 34,
    coilDeltaDeg: -6,
    coilStatus: "developing",
    measuredKneeFlexionDeg: 126,
    proBenchmarkKneeDeg: 118,
    kneeDeltaDeg: 8,
    kneeStatus: "developing",
    measuredBaseWidthRatio: 1.18,
    proBenchmarkBaseWidthRatio: 1.25,
    baseWidthStatus: "optimal",
    measuredTimingLagMs: 70,
    proBenchmarkTimingLagMs: 95,
    timingLagStatus: "developing",
    estimatedKineticEfficiencyPct: 76,
    proKineticEfficiencyPct: 94,
    estimatedRecoverableMph: 7.4,
    estimatedDecelerationTorqueNm: 42,
    segments: [],
    waterfallJoules: { legs: 65, hips: 120, torso: 195, arm: 240, racket: 280 },
    weightTransferPhases: [],
    jointStressAxes: [
      {
        jointId: "rotator_cuff",
        label: "Rotator Cuff Deceleration",
        torqueNm: 42,
        proBenchmarkNm: 38,
        riskLevel: "moderate",
        decelerationRateDegSec2: 2800,
        coachingAdvice: "Wrap follow-through around torso",
      },
    ],
    telemetryMetrics: [],
    scientificBasis: "Winter/Dempster Model",
    isModelEstimated: true,
  },
  recordingPlan: "Record again in 2 days",
  limitations: ["60fps video view"],
};

describe("coach-engine", () => {
  it("contains all 6 question categories in taxonomy", () => {
    const categories = new Set(COACH_QUESTIONS_TAXONOMY.map((q) => q.category));
    expect(categories.has("fix")).toBe(true);
    expect(categories.has("charts")).toBe(true);
    expect(categories.has("power")).toBe(true);
    expect(categories.has("drills")).toBe(true);
    expect(categories.has("safety")).toBe(true);
    expect(categories.has("tactics")).toBe(true);
    expect(COACH_QUESTIONS_TAXONOMY.length).toBeGreaterThanOrEqual(20);
  });

  it("answers Waterfall Chart question with exact video recoverable speed", () => {
    const res = generateIntelligentCoachResponse("How do I read the Power Leak Waterfall chart?", mockContext);
    expect(res.message).toContain("7.4 MPH");
    expect(res.message).toContain("Power Leak Waterfall");
    expect(res.references.some((r) => r.label.includes("Energy Flow Tab"))).toBe(true);
  });

  it("answers Weight Seesaw question with measured weight shift", () => {
    const res = generateIntelligentCoachResponse("What does the Weight Transfer Seesaw tell me about my balance?", mockContext);
    expect(res.message).toContain("Weight Transfer Seesaw");
    expect(res.message).toContain("85%");
    expect(res.references.some((r) => r.label.includes("Weight Transfer Tab"))).toBe(true);
  });

  it("answers Torso Coil question with measured degrees vs pro benchmark", () => {
    const res = generateIntelligentCoachResponse("What was my measured Torso Coil angle?", mockContext);
    expect(res.message).toContain("28°");
    expect(res.message).toContain("34°");
  });

  it("provides 15-minute daily practice protocol citing all 3 drills", () => {
    const res = generateIntelligentCoachResponse("Give me a step-by-step 15-minute daily practice protocol.", mockContext);
    expect(res.message).toContain("Lag-and-Snap Shadow Swings");
    expect(res.message).toContain("Progressive Drop-Feed Impact Lock");
    expect(res.message).toContain("Crosscourt Rally Depth Transfer");
    expect(res.references).toHaveLength(3);
  });

  it("handles health/pain query with proper medical safety boundary", () => {
    const res = generateIntelligentCoachResponse("My elbow hurts and has sharp pain", mockContext);
    expect(res.message).toContain("pause your hitting session");
    expect(res.message).toContain("medical diagnosis");
  });
});
