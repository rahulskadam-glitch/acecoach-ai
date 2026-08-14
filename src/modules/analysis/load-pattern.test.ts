import assert from "node:assert/strict";
import { test } from "vitest";
import { detectRecordedLoadPattern, type PracticeLoadEntry } from "./load-pattern.ts";

const policy = { minimumPriorCheckins: 2, minimumCurrentAttempts: 40, volumeSpikeRatio: 1.5 };
function entry(id: string, attempts: number, effort: PracticeLoadEntry["effort"], day: number): PracticeLoadEntry {
  return { id, sportId: "tennis", actionType: "serve", attempts, effort, createdAt: `2026-08-${String(day).padStart(2,"0")}T10:00:00Z` };
}
test("flags only a high-effort recorded-volume spike", () => {
  const flags = detectRecordedLoadPattern([entry("current", 60, "hard", 4), entry("prior-2", 30, "just_right", 3), entry("prior-1", 28, "easy", 2)], policy);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].archetype, "LOAD_PATTERN_FLAG");
  assert.match(flags[0].clinicalBoundary, /not a medical assessment/i);
});
test("suppresses incomplete history and non-hard sessions", () => {
  assert.equal(detectRecordedLoadPattern([entry("current", 80, "hard", 4), entry("prior", 20, "easy", 3)], policy).length, 0);
  assert.equal(detectRecordedLoadPattern([entry("current", 80, "just_right", 4), entry("p2", 20, "easy", 3), entry("p1", 20, "easy", 2)], policy).length, 0);
});
