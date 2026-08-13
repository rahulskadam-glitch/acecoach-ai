import assert from "node:assert/strict";
import test from "node:test";

import { visualQaReport } from "@/features/visual-qa/report-fixture";
import { buildNextGenerationStory } from "./next-generation-story";

test("buildNextGenerationStory compiles one causal player story", () => {
  const story = buildNextGenerationStory(visualQaReport);
  assert.equal(story.ontologyVersion, "4.1.0");
  assert.equal(story.role, "PRIMARY_CORRECTION");
  assert.equal(story.visualStory.beats.length, 5);
  assert.equal(story.visualStory.beats.at(-1)?.intent, "clean");
  assert.ok(story.playerCoaching.feel.split(/\s+/).length <= 9);
  assert.ok(story.evidenceIds.length > 0);
});
