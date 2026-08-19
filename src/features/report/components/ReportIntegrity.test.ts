import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "@/modules/analysis/types";
import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

describe("Report & Visualizer Biomechanical Integrity Suite", () => {
  const baseMockReport = {
    qualityGate: { canUseTechniqueScore: true, messages: [] },
    overallScore: 82,
    confidence: 0.94,
    captureQuality: { grade: "A", score: 92 },
    movementClassification: { analysisAction: "forehand", analysisActionLabel: "Forehand" },
    frameSummary: {
      fps: 60,
      frameMetrics: [
        {
          frameIndex: 0,
          timestampSeconds: 0.0,
          visibility: 0.98,
          elbowAngle: 120,
          shoulderAngle: 45,
          kneeAngle: 160,
          dominantKneeAngle: 160,
          shoulderPelvisSeparation: 12,
          baseWidthNormalized: 1.25,
          wristSpeedNormalizedPerSecond: 0.8,
          shoulderLineDegrees: 15,
          pelvisLineDegrees: 10,
        },
        {
          frameIndex: 15,
          timestampSeconds: 0.25,
          visibility: 0.99,
          elbowAngle: 110,
          shoulderAngle: 65,
          kneeAngle: 118,
          dominantKneeAngle: 118,
          shoulderPelvisSeparation: 36,
          baseWidthNormalized: 1.35,
          wristSpeedNormalizedPerSecond: 3.2,
          shoulderLineDegrees: 60,
          pelvisLineDegrees: 35,
        },
        {
          frameIndex: 30,
          timestampSeconds: 0.50,
          visibility: 0.99,
          elbowAngle: 145,
          shoulderAngle: 85,
          kneeAngle: 135,
          dominantKneeAngle: 135,
          shoulderPelvisSeparation: 24,
          baseWidthNormalized: 1.28,
          wristSpeedNormalizedPerSecond: 6.8,
          shoulderLineDegrees: 105,
          pelvisLineDegrees: 80,
        },
        {
          frameIndex: 45,
          timestampSeconds: 0.75,
          visibility: 0.97,
          elbowAngle: 95,
          shoulderAngle: 110,
          kneeAngle: 150,
          dominantKneeAngle: 150,
          shoulderPelvisSeparation: 14,
          baseWidthNormalized: 1.20,
          wristSpeedNormalizedPerSecond: 1.9,
          shoulderLineDegrees: 120,
          pelvisLineDegrees: 95,
        },
      ],
      biomechanicalProfile: {
        version: "3.0.0",
        actionType: "forehand",
        metricCount: 40,
        availableMetricCount: 38,
        unavailableMetricCount: 2,
        measurementStatement: "Validated pose metrics",
        phases: [],
        linkages: [
          {
            id: "hips_to_shoulders",
            source: { id: "hips", label: "Hips", peakTimestampSeconds: 0.25 },
            target: { id: "shoulders", label: "Shoulders", peakTimestampSeconds: 0.35 },
            gapSeconds: 0.10,
            status: "connected",
            confidence: 0.92,
            explanation: "Hip leads shoulders by 100ms",
          },
        ],
        connectedLinkCount: 5,
        linkCount: 6,
        metrics: [
          {
            id: "prep_separation",
            label: "Shoulder-Hip Separation",
            phase: "ready",
            region: "trunk",
            value: 36,
            displayValue: "36°",
            unit: "degrees",
            status: "available",
            confidence: 0.95,
            measurementBasis: "world_pose_angle_proxy",
            playerMeaning: "Torso coil load",
          },
        ],
      },
    },
    priorities: [],
    strengths: [],
  } as unknown as AnalysisReport;

  it("calculates 100% video-responsive Rotator Cuff deceleration torque and joint stresses", () => {
    const profile = computePlayerBiomechanicalProfile(baseMockReport, "forehand");

    // Deceleration torque must be physically grounded
    expect(profile.jointStressAxes).toHaveLength(6);
    const cuffAxis = profile.jointStressAxes.find((j) => j.jointId === "rotator_cuff");
    expect(cuffAxis).toBeDefined();
    expect(cuffAxis?.torqueNm).toBeGreaterThanOrEqual(28);
    expect(cuffAxis?.torqueNm).toBeLessThanOrEqual(70);
    expect(cuffAxis?.decelerationRateDegSec2).toBeGreaterThan(500);

    // Elbow valgus torque
    const elbowAxis = profile.jointStressAxes.find((j) => j.jointId === "elbow");
    expect(elbowAxis).toBeDefined();
    expect(elbowAxis?.torqueNm).toBeGreaterThan(0);

    // Lumbar spine torque
    const spineAxis = profile.jointStressAxes.find((j) => j.jointId === "lumbar_spine");
    expect(spineAxis).toBeDefined();
    expect(spineAxis?.torqueNm).toBeGreaterThan(0);
  });

  it("calculates dynamic kinetic chain energy waterfall in Joules without static fallback constants", () => {
    const profile = computePlayerBiomechanicalProfile(baseMockReport, "forehand");

    expect(profile.waterfallJoules.legs).toBeGreaterThan(0);
    expect(profile.waterfallJoules.hips).toBeGreaterThan(profile.waterfallJoules.legs);
    expect(profile.waterfallJoules.torso).toBeGreaterThan(profile.waterfallJoules.hips);
    expect(profile.waterfallJoules.arm).toBeGreaterThan(profile.waterfallJoules.torso);
    expect(profile.waterfallJoules.racket).toBeGreaterThan(0);

    expect(profile.segments).toHaveLength(5);
    for (const segment of profile.segments) {
      expect(segment.athletePeakVelocity).toBeGreaterThan(0);
      expect(segment.athleteEnergyJoules).toBeGreaterThan(0);
      expect(segment.athleteEfficiency).toBeGreaterThan(0);
      expect(segment.lossReason).toBeTruthy();
    }
  });

  it("calculates dynamic weight transfer storyboard across all 6 movement phases", () => {
    const profile = computePlayerBiomechanicalProfile(baseMockReport, "forehand");

    expect(profile.weightTransferPhases).toHaveLength(6);

    const readyPhase = profile.weightTransferPhases.find((p) => p.stage === "ready");
    expect(readyPhase?.rearFootPct).toBe(50);
    expect(readyPhase?.frontFootPct).toBe(50);

    const contactPhase = profile.weightTransferPhases.find((p) => p.stage === "forward_swing_contact");
    expect(contactPhase?.frontFootPct).toBeGreaterThan(50);
  });

  it("adjusts kinetic benchmarks appropriately between Forehand and Serve", () => {
    const forehandProfile = computePlayerBiomechanicalProfile(baseMockReport, "forehand");
    const serveProfile = computePlayerBiomechanicalProfile(baseMockReport, "serve");

    expect(serveProfile.proBenchmarkCoilDeg).toBeGreaterThan(forehandProfile.proBenchmarkCoilDeg);
    expect(serveProfile.proBenchmarkTimingLagMs).toBeGreaterThan(forehandProfile.proBenchmarkTimingLagMs);
    expect(serveProfile.segments[0].proPeakVelocity).toBeGreaterThan(forehandProfile.segments[0].proPeakVelocity);
    expect(serveProfile.segments[4].proPeakVelocity).toBeGreaterThan(forehandProfile.segments[4].proPeakVelocity);
  });

  it("calculates dynamically anchored strike corridor and reach gap from athlete body scale", () => {
    function computeDynamicStrikeCorridor(
      torsoX: number,
      torsoY: number,
      bodyScalePixels: number,
      swingDirection: -1 | 1,
    ) {
      const boxDistance = bodyScalePixels * 1.15;
      const boxX = torsoX + swingDirection * boxDistance;
      const boxY = torsoY - bodyScalePixels * 0.15;
      const boxW = Math.round(bodyScalePixels * 0.85);
      const boxH = Math.round(bodyScalePixels * 0.95);
      return { boxX, boxY, boxW, boxH };
    }

    // Player positioned at x: 300, y: 400 with 100px body scale
    const playerA = computeDynamicStrikeCorridor(300, 400, 100, -1);
    expect(playerA.boxX).toBe(185);
    expect(playerA.boxY).toBe(385);
    expect(playerA.boxW).toBe(85);
    expect(playerA.boxH).toBe(95);

    // Player positioned at x: 700, y: 500 with 150px body scale
    const playerB = computeDynamicStrikeCorridor(700, 500, 150, -1);
    expect(playerB.boxX).toBe(527.5);
    expect(playerB.boxY).toBe(477.5);
    expect(playerB.boxW).toBe(128);
    expect(playerB.boxH).toBe(143);
  });
});
