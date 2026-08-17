import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "@/modules/analysis/types";
import { computePlayerBiomechanicalProfile } from "./player-kinetics-engine";

describe("computePlayerBiomechanicalProfile", () => {
  it("computes player-specific kinematics from video frames", () => {
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
    expect(profile.estimatedRecoverableMph).toBeGreaterThan(0);
    expect(profile.scientificBasis).toContain("Winter/Dempster");
  });

  it("handles empty frames gracefully with robust defaults", () => {
    const emptyReport = {
      frameSummary: { frameMetrics: [] },
    } as unknown as AnalysisReport;

    const profile = computePlayerBiomechanicalProfile(emptyReport, "serve");
    expect(profile.measuredTorsoCoilDeg).toBe(28);
    expect(profile.proBenchmarkCoilDeg).toBe(38);
    expect(profile.isModelEstimated).toBe(true);
  });
});
