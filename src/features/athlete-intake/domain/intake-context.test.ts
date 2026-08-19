import { describe, expect, it } from "vitest";

describe("Intake Context & Video Variables Validation Suite", () => {
  const validCameraAngles = ["side", "rear", "front", "diagonal", "unknown"];
  const validCourtSurfaces = ["hard_court", "clay", "grass", "indoor", "all_court", "unknown"];
  const validFootworkStances = ["open", "semi_open", "neutral_square", "closed", "auto_detect", "unknown"];
  const validSituations = ["controlled_practice", "neutral_rally", "attacking", "defensive_on_run", "return_of_serve", "unknown"];

  function normalizeCaptureContext(input?: Record<string, unknown> | null) {
    const rawAngle = typeof input?.cameraAngle === "string" ? input.cameraAngle.trim().slice(0, 32) : "side";
    const rawSurface = typeof input?.courtSurface === "string" ? input.courtSurface.trim().slice(0, 32) : "hard_court";
    const rawStance = typeof input?.footworkStance === "string" ? input.footworkStance.trim().slice(0, 32) : "auto_detect";
    const rawSituation = typeof input?.shotSituation === "string" ? input.shotSituation.trim().slice(0, 64) : "controlled_practice";

    return {
      cameraAngle: validCameraAngles.includes(rawAngle) ? rawAngle : "side",
      courtSurface: validCourtSurfaces.includes(rawSurface) ? rawSurface : "hard_court",
      footworkStance: validFootworkStances.includes(rawStance) ? rawStance : "auto_detect",
      shotSituation: validSituations.includes(rawSituation) ? rawSituation : "controlled_practice",
    };
  }

  it("normalizes standard capture variables correctly", () => {
    const ctx = normalizeCaptureContext({
      cameraAngle: "diagonal",
      courtSurface: "clay",
      footworkStance: "open",
      shotSituation: "attacking",
    });

    expect(ctx.cameraAngle).toBe("diagonal");
    expect(ctx.courtSurface).toBe("clay");
    expect(ctx.footworkStance).toBe("open");
    expect(ctx.shotSituation).toBe("attacking");
  });

  it("falls back to calibrated smart defaults for invalid or missing inputs", () => {
    const ctx = normalizeCaptureContext({
      cameraAngle: "nonexistent_angle",
      courtSurface: "carpet_grass_fake",
      footworkStance: "flying_kick",
      shotSituation: "party_trick",
    });

    expect(ctx.cameraAngle).toBe("side");
    expect(ctx.courtSurface).toBe("hard_court");
    expect(ctx.footworkStance).toBe("auto_detect");
    expect(ctx.shotSituation).toBe("controlled_practice");
  });

  it("validates mandatory stroke requirement", () => {
    function assertMandatoryStroke(stroke?: string | null) {
      if (!stroke || stroke.trim().length === 0 || stroke === "unselected") {
        throw new Error("Movement selection is mandatory before proceeding to video recording.");
      }
      return stroke.trim().toLowerCase();
    }

    expect(() => assertMandatoryStroke(null)).toThrow("Movement selection is mandatory");
    expect(() => assertMandatoryStroke("")).toThrow("Movement selection is mandatory");
    expect(() => assertMandatoryStroke("unselected")).toThrow("Movement selection is mandatory");
    expect(assertMandatoryStroke("forehand")).toBe("forehand");
    expect(assertMandatoryStroke("backhand")).toBe("backhand");
    expect(assertMandatoryStroke("serve")).toBe("serve");
  });
});
