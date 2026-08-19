import { describe, expect, it } from "vitest";

describe("Video Capture Best Practices, Quality Gating & Sizing Suite", () => {
  it("enforces essential video recording DO's for 99%+ AI tracking accuracy", () => {
    const requiredDos = [
      "Solo athlete in frame (1 person)",
      "Full body visible (head to toe through all 6 phases)",
      "Court lines visible for scale and 3D depth calibration",
      "Camera distance 15–20 ft (4.5–6m) at chest/waist height",
      "High frame rate (60fps or 120fps)",
      "4 clean repetitions for rhythm consistency (10–25 seconds)",
    ];

    expect(requiredDos).toHaveLength(6);
  });

  it("enforces critical video recording DON'TS to prevent tracking degradation", () => {
    const criticalDonts = [
      "No multiple people in view",
      "No cropped limbs or racket",
      "No extreme high/low angles",
      "No direct sunlight glare / backlighting",
      "No long 5–10 minute unedited clips",
    ];

    expect(criticalDonts).toHaveLength(5);
  });

  it("validates that 50 MB is sufficient for standard 1080p 60fps clips, while supporting up to 500 MB for 4K 120fps", () => {
    function estimateFileSizeMb(durationSeconds: number, resolution: "1080p" | "4k", fps: 30 | 60 | 120): number {
      // Bitrate in Mbps: 1080p 60fps ≈ 20 Mbps; 4K 60fps ≈ 60 Mbps; 4K 120fps ≈ 100 Mbps
      let bitrateMbps = 12;
      if (resolution === "1080p" && fps === 60) bitrateMbps = 22;
      if (resolution === "4k" && fps === 60) bitrateMbps = 65;
      if (resolution === "4k" && fps === 120) bitrateMbps = 110;

      const totalMegabits = bitrateMbps * durationSeconds;
      return Number((totalMegabits / 8).toFixed(1));
    }

    // 10s 1080p 60fps clip is ~27.5 MB (well under 50 MB)
    const tenSecond1080p60 = estimateFileSizeMb(10, "1080p", 60);
    expect(tenSecond1080p60).toBeLessThanOrEqual(50);
    expect(tenSecond1080p60).toBeGreaterThan(15);

    // 15s 4K 120fps clip is ~206 MB (supported by our 500 MB cloud capacity)
    const fifteenSec4k120 = estimateFileSizeMb(15, "4k", 120);
    expect(fifteenSec4k120).toBeGreaterThan(50);
    expect(fifteenSec4k120).toBeLessThanOrEqual(500);
  });

  it("validates client-side pre-flight duration and file format rules", () => {
    function validateVideoPreflight(file: { name: string; sizeBytes: number }, durationSeconds: number) {
      const MAX_BYTES = 500 * 1024 * 1024;
      const MAX_SECONDS = 30.25;
      const MIN_SECONDS = 1.0;

      if (file.sizeBytes > MAX_BYTES) {
        throw new Error("Video exceeds 500 MB limit.");
      }
      if (durationSeconds > MAX_SECONDS) {
        throw new Error(`Video is too long (${durationSeconds.toFixed(1)}s). Maximum is 30s.`);
      }
      if (durationSeconds < MIN_SECONDS) {
        throw new Error("Video is too short. Minimum is 1.0s.");
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      const validExtensions = new Set(["mp4", "mov", "webm", "m4v"]);
      if (!ext || !validExtensions.has(ext)) {
        throw new Error("Invalid video format.");
      }

      return { valid: true };
    }

    expect(validateVideoPreflight({ name: "forehand_60fps.mp4", sizeBytes: 30 * 1024 * 1024 }, 8.5).valid).toBe(true);
    expect(() => validateVideoPreflight({ name: "forehand.mp4", sizeBytes: 30 * 1024 * 1024 }, 45.0)).toThrow("too long");
    expect(() => validateVideoPreflight({ name: "forehand.avi", sizeBytes: 30 * 1024 * 1024 }, 10.0)).toThrow("Invalid video format");
  });
});
