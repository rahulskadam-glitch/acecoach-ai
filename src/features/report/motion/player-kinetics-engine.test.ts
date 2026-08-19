import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "@/modules/analysis/types";
import { computePlayerBiomechanicalProfile } from "./player-kinetics-engine";

describe("computePlayerBiomechanicalProfile", () => {
  it("computes dynamic player-specific kinematics and segment energies from video frames", () => {
    const mockReport = {
      frameSummary: {
        fps: 60,
        frameMetrics: [
          { shoulderPelvisSeparation: 12, dominantKneeAngle: 155, baseWidthNormalized: 1.2, wristSpeedNormalizedPerSecond: 1.1 },
          { shoulderPelvisSeparation: 31, dominantKneeAngle: 122, baseWidthNormalized: 1.25, wristSpeedNormalizedPerSecond: 3.4 },
          { shoulderPelvisSeparation: 18, dominantKneeAngle: 148, baseWidthNormalized: 1.18, wristSpeedNormalizedPerSecond: 5.2 },
        ],
      },
      repetitions: [{ durationSeconds: 0.95 }],
    } as unknown as AnalysisReport;

    const profile = computePlayerBiomechanicalProfile(mockReport, "forehand");
    expect(profile.measuredTorsoCoilDeg).toBe(31);
    expect(profile.measuredKneeFlexionDeg).toBe(122);
    expect(profile.isModelEstimated).toBe(true);
    expect(profile.segments).toHaveLength(5);
    expect(profile.segments[0].athleteEnergyJoules).toBeGreaterThan(0);
    expect(profile.waterfallJoules.racket).toBeGreaterThan(0);
    expect(profile.weightTransferPhases).toHaveLength(6);
    expect(profile.jointStressAxes).toHaveLength(6);
    expect(profile.telemetryMetrics.length).toBeGreaterThanOrEqual(5);
  });

  it("handles empty frames gracefully with robust fallback kinematics", () => {
    const emptyReport = {
      frameSummary: { frameMetrics: [] },
    } as unknown as AnalysisReport;

    const profile = computePlayerBiomechanicalProfile(emptyReport, "serve");
    expect(profile.measuredTorsoCoilDeg).toBe(32);
    expect(profile.proBenchmarkCoilDeg).toBe(38);
    expect(profile.isModelEstimated).toBe(true);
    expect(profile.segments).toHaveLength(5);
    expect(profile.jointStressAxes).toHaveLength(6);
  });

  it("produces distinct, video-specific kinematics, torques, and energy between two different player videos", () => {
    // Video 1: Player with deep knee bend, high coil, and gradual deceleration
    const video1 = {
      frameSummary: {
        fps: 30,
        frameMetrics: [
          { shoulderPelvisSeparation: 10, dominantKneeAngle: 160, pelvisLineDegrees: 10, shoulderLineDegrees: 15, wristSpeedNormalizedPerSecond: 0.5 },
          { shoulderPelvisSeparation: 36, dominantKneeAngle: 112, pelvisLineDegrees: 35, shoulderLineDegrees: 55, wristSpeedNormalizedPerSecond: 2.8 },
          { shoulderPelvisSeparation: 22, dominantKneeAngle: 135, pelvisLineDegrees: 60, shoulderLineDegrees: 95, wristSpeedNormalizedPerSecond: 6.2 },
          { shoulderPelvisSeparation: 12, dominantKneeAngle: 150, pelvisLineDegrees: 70, shoulderLineDegrees: 100, wristSpeedNormalizedPerSecond: 2.1 },
        ],
      },
    } as unknown as AnalysisReport;

    // Video 2: Player with shallow knee bend, low coil, and abrupt deceleration
    const video2 = {
      frameSummary: {
        fps: 30,
        frameMetrics: [
          { shoulderPelvisSeparation: 8, dominantKneeAngle: 165, pelvisLineDegrees: 5, shoulderLineDegrees: 8, wristSpeedNormalizedPerSecond: 0.2 },
          { shoulderPelvisSeparation: 22, dominantKneeAngle: 145, pelvisLineDegrees: 20, shoulderLineDegrees: 25, wristSpeedNormalizedPerSecond: 1.5 },
          { shoulderPelvisSeparation: 14, dominantKneeAngle: 155, pelvisLineDegrees: 40, shoulderLineDegrees: 110, wristSpeedNormalizedPerSecond: 3.8 },
          { shoulderPelvisSeparation: 6, dominantKneeAngle: 160, pelvisLineDegrees: 45, shoulderLineDegrees: 45, wristSpeedNormalizedPerSecond: 0.4 },
        ],
      },
    } as unknown as AnalysisReport;

    const profile1 = computePlayerBiomechanicalProfile(video1, "forehand");
    const profile2 = computePlayerBiomechanicalProfile(video2, "forehand");

    // Kinematics must be uniquely distinct
    expect(profile1.measuredTorsoCoilDeg).not.toEqual(profile2.measuredTorsoCoilDeg);
    expect(profile1.measuredKneeFlexionDeg).not.toEqual(profile2.measuredKneeFlexionDeg);
    expect(profile1.estimatedKineticEfficiencyPct).not.toEqual(profile2.estimatedKineticEfficiencyPct);
    expect(profile1.waterfallJoules.racket).not.toEqual(profile2.waterfallJoules.racket);
    expect(profile1.jointStressAxes[0].torqueNm).toBeDefined();
    expect(profile2.jointStressAxes[0].torqueNm).toBeDefined();
  });
});
