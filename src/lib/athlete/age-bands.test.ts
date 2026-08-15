import { describe, expect, it } from "vitest";

import { normalizePlayerAgeBand, requiresGuardianConfirmation } from "./age-bands";

describe("player age bands", () => {
  it("normalizes profile bands used by the age field", () => {
    expect(normalizePlayerAgeBand("18_24")).toBe("18_24");
    expect(normalizePlayerAgeBand("25_34")).toBe("25_34");
    expect(normalizePlayerAgeBand("55_plus")).toBe("55_plus");
  });

  it("normalizes historical intake bands", () => {
    expect(normalizePlayerAgeBand("16_18")).toBe("13_17");
    expect(normalizePlayerAgeBand("19_29")).toBe("18_24");
    expect(normalizePlayerAgeBand("60_plus")).toBe("55_plus");
  });

  it("requires guardian approval only for the current youth band", () => {
    expect(requiresGuardianConfirmation("13_17")).toBe(true);
    expect(requiresGuardianConfirmation("18_24")).toBe(false);
    expect(requiresGuardianConfirmation("19_29")).toBe(false);
    expect(requiresGuardianConfirmation("")).toBe(false);
  });
});
