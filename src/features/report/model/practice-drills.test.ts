import { describe, expect, it } from "vitest";
import type { AnalysisReport } from "@/modules/analysis/types";
import { resolveThreePracticeDrills } from "./practice-drills";

describe("resolveThreePracticeDrills", () => {
  it("guarantees at least 3 drills when report has 0 drills", () => {
    const emptyReport = {
      drills: [],
      priorities: [{ rank: 1, title: "Early hip rotation", cue: "Turn hips before hands" }],
    } as unknown as AnalysisReport;

    const drills = resolveThreePracticeDrills(emptyReport, "Forehand");
    expect(drills).toHaveLength(3);
    expect(drills[0].number).toBe(1);
    expect(drills[1].number).toBe(2);
    expect(drills[2].number).toBe(3);
    expect(drills[0].cue).toBe("Turn hips before hands");
  });

  it("preserves engine drills and fills remaining slots up to 3", () => {
    const singleDrillReport = {
      drills: [
        {
          id: "custom_drill_1",
          name: "Racket drop ladder",
          purpose: "Deepen lag",
          cue: "Relax the wrist",
          dosage: "3x10",
          successMetric: "8 of 10",
        },
      ],
      priorities: [],
    } as unknown as AnalysisReport;

    const drills = resolveThreePracticeDrills(singleDrillReport, "Serve");
    expect(drills).toHaveLength(3);
    expect(drills[0].name).toContain("Racket drop ladder");
    expect(drills[1].number).toBe(2);
    expect(drills[2].number).toBe(3);
  });

  it("caps at 3 when report has 3 or more drills", () => {
    const multiDrillReport = {
      drills: [
        { id: "d1", name: "Drill 1", purpose: "P1", cue: "C1", dosage: "D1", successMetric: "S1" },
        { id: "d2", name: "Drill 2", purpose: "P2", cue: "C2", dosage: "D2", successMetric: "S2" },
        { id: "d3", name: "Drill 3", purpose: "P3", cue: "C3", dosage: "D3", successMetric: "S3" },
        { id: "d4", name: "Drill 4", purpose: "P4", cue: "C4", dosage: "D4", successMetric: "S4" },
      ],
    } as unknown as AnalysisReport;

    const drills = resolveThreePracticeDrills(multiDrillReport);
    expect(drills).toHaveLength(3);
  });
});
