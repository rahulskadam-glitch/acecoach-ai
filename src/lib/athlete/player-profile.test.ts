import { describe, expect, it } from "vitest";

describe("Player Profile & Athlete Domain Workflow Suite", () => {
  function normalizeDominantSide(value: string) {
    const normalized = value.toLowerCase().trim();
    if (normalized.startsWith("left")) return "left";
    if (normalized.startsWith("right")) return "right";
    throw new Error("Choose a valid dominant side.");
  }

  function validatePlayingLevel(level: string) {
    const validLevels = new Set(["beginner", "intermediate", "advanced", "competitive", "pro"]);
    const norm = level.toLowerCase().trim();
    return validLevels.has(norm) ? norm : "intermediate";
  }

  function validateHeightCm(height?: number | string | null): number | null {
    if (!height) return null;
    const num = Number(height);
    if (isNaN(num) || num < 100 || num > 250) {
      throw new Error("Height must be between 100cm and 250cm.");
    }
    return Math.round(num);
  }

  it("normalizes dominant side input correctly", () => {
    expect(normalizeDominantSide("Right")).toBe("right");
    expect(normalizeDominantSide("Left-handed")).toBe("left");
    expect(normalizeDominantSide("righty")).toBe("right");
    expect(() => normalizeDominantSide("ambidextrous_foot")).toThrow("Choose a valid dominant side");
  });

  it("validates and bounds player height in cm", () => {
    expect(validateHeightCm(185)).toBe(185);
    expect(validateHeightCm("178")).toBe(178);
    expect(validateHeightCm(null)).toBeNull();
    expect(() => validateHeightCm(50)).toThrow("Height must be between 100cm and 250cm");
    expect(() => validateHeightCm(320)).toThrow("Height must be between 100cm and 250cm");
  });

  it("normalizes playing levels cleanly", () => {
    expect(validatePlayingLevel("Advanced")).toBe("advanced");
    expect(validatePlayingLevel("PRO")).toBe("pro");
    expect(validatePlayingLevel("unknown_tier")).toBe("intermediate");
  });
});
