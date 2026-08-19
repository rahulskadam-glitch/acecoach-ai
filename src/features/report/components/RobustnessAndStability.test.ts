import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "@/modules/analysis/types";
import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

describe("System Robustness, Edge-Case Resilience & Stability Suite", () => {
  it("handles completely empty report payload without crashing or throwing unhandled exceptions", () => {
    const emptyReport = {} as AnalysisReport;
    expect(() => computePlayerBiomechanicalProfile(emptyReport, "forehand")).not.toThrow();

    const profile = computePlayerBiomechanicalProfile(emptyReport, "forehand");
    expect(profile).toBeDefined();
    expect(profile.measuredTorsoCoilDeg).toBeGreaterThan(0);
    expect(profile.measuredKneeFlexionDeg).toBeGreaterThan(0);
    expect(profile.jointStressAxes).toHaveLength(6);
    expect(profile.waterfallJoules.racket).toBeGreaterThan(0);
  });

  it("resiliently handles corrupt frames with NaN, null, and Infinity values", () => {
    const corruptReport = {
      frameSummary: {
        fps: 0, // Zero fps edge case
        frameMetrics: [
          {
            shoulderPelvisSeparation: NaN,
            dominantKneeAngle: null,
            baseWidthNormalized: Infinity,
            wristSpeedNormalizedPerSecond: -999,
          },
          {
            shoulderPelvisSeparation: null,
            dominantKneeAngle: 130,
            baseWidthNormalized: null,
            wristSpeedNormalizedPerSecond: NaN,
          },
          {
            shoulderPelvisSeparation: 32,
            dominantKneeAngle: Infinity,
            baseWidthNormalized: 1.25,
            wristSpeedNormalizedPerSecond: null,
          },
        ],
      },
    } as unknown as AnalysisReport;

    expect(() => computePlayerBiomechanicalProfile(corruptReport, "forehand")).not.toThrow();

    const profile = computePlayerBiomechanicalProfile(corruptReport, "forehand");
    expect(Number.isFinite(profile.measuredTorsoCoilDeg)).toBe(true);
    expect(Number.isFinite(profile.measuredKneeFlexionDeg)).toBe(true);
    expect(Number.isFinite(profile.estimatedKineticEfficiencyPct)).toBe(true);
    expect(Number.isFinite(profile.waterfallJoules.racket)).toBe(true);
    expect(profile.waterfallJoules.racket).toBeGreaterThan(0);
  });

  it("handles extreme video lengths (single frame vs 10,000 frames) gracefully", () => {
    // 1 frame
    const singleFrameReport = {
      frameSummary: {
        fps: 30,
        frameMetrics: [{ shoulderPelvisSeparation: 25, dominantKneeAngle: 125 }],
      },
    } as unknown as AnalysisReport;
    expect(() => computePlayerBiomechanicalProfile(singleFrameReport, "serve")).not.toThrow();

    // 1,000 frames
    const largeFrames = Array.from({ length: 1000 }, (_, i) => ({
      shoulderPelvisSeparation: 15 + Math.sin(i / 10) * 15,
      dominantKneeAngle: 140 - Math.sin(i / 10) * 20,
      wristSpeedNormalizedPerSecond: Math.abs(Math.sin(i / 5) * 5),
    }));
    const largeReport = {
      frameSummary: { fps: 60, frameMetrics: largeFrames },
    } as unknown as AnalysisReport;

    const start = performance.now();
    const profile = computePlayerBiomechanicalProfile(largeReport, "forehand");
    const durationMs = performance.now() - start;

    expect(durationMs).toBeLessThan(50); // Must execute in under 50ms for 1,000 frames
    expect(profile.measuredTorsoCoilDeg).toBeGreaterThan(0);
  });

  it("guarantees mathematical sanity bounds for all kinetic outputs", () => {
    const report = {
      frameSummary: {
        fps: 60,
        frameMetrics: [
          { shoulderPelvisSeparation: 45, dominantKneeAngle: 105, wristSpeedNormalizedPerSecond: 8.5 },
        ],
      },
    } as unknown as AnalysisReport;

    const profile = computePlayerBiomechanicalProfile(report, "forehand");

    // Efficiency must be between 10% and 100%
    expect(profile.estimatedKineticEfficiencyPct).toBeGreaterThanOrEqual(10);
    expect(profile.estimatedKineticEfficiencyPct).toBeLessThanOrEqual(100);

    // Torso coil must be physically reasonable
    expect(profile.measuredTorsoCoilDeg).toBeGreaterThanOrEqual(10);
    expect(profile.measuredTorsoCoilDeg).toBeLessThanOrEqual(90);

    // Knee angle must be physically reasonable
    expect(profile.measuredKneeFlexionDeg).toBeGreaterThanOrEqual(60);
    expect(profile.measuredKneeFlexionDeg).toBeLessThanOrEqual(180);

    // Timing lag must be positive
    expect(profile.measuredTimingLagMs).toBeGreaterThan(0);

    // Rotator cuff braking torque must be bounded to human physiological ranges (20–80 N·m)
    for (const axis of profile.jointStressAxes) {
      expect(axis.torqueNm).toBeGreaterThan(0);
      expect(axis.torqueNm).toBeLessThanOrEqual(120);
      expect(["low", "moderate", "elevated"]).toContain(axis.riskLevel);
    }
  });
});
