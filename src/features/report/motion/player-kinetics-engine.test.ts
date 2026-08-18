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
});
