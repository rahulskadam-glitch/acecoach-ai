# Coding-agent implementation prompt

Use this prompt with the coding agent that has the AceCoach repository open.

---

Integrate the `acecoach-analytics-ontology-v2.1.0` bundle into the existing AceCoach AI repository without replacing working authentication, upload, storage, or video-processing functionality.

## Non-negotiable behavior

1. Identical `source_video_hash`, `input_config_hash`, and version tuple must yield identical structured output.
2. Store independent versions for ontology, ruleset, scoring, model, evidence, prompt, and overlay.
3. Preserve the original video.
4. Do not score unavailable evidence as zero.
5. Do not allow the language model to invent measurements or fault labels.
6. Show one primary correction, at most two secondary issues, one drill, and one measurable reassessment target.
7. Player and coach corrections must invalidate and regenerate only affected layers.
8. Historical analyses are immutable; a new model creates a new analysis version.

## Step 1 — Copy contracts

Copy:

- `config/`, `schemas/`, and `manifest.json` to `services/analysis-api/ontology/`
- `python/acecoach_ontology/` to `services/analysis-api/app/ontology/`
- `typescript/` to `src/features/biomechanics/contracts/ontology/`
- `sql/001_analytics_ontology.sql` to the next numbered Supabase migration

Do not expose coach-only thresholds or internal rules in a public client bundle. The web app should receive only fault title, player language, evidence references, approved overlay recipe, confidence status, and report fields.

## Step 2 — Startup validation

At FastAPI startup:

- load the ontology bundle once
- validate all fault IDs, phase IDs, overlay markers, and drill links
- calculate and log the bundle checksum
- fail startup if validation fails
- expose ontology version and checksum on the internal health endpoint

## Step 3 — Create versioned analysis context

Create a required `AnalysisVersionContext` containing:

- `source_video_hash`
- `input_config_hash`
- `ontology_version`
- `ruleset_version`
- `scoring_version`
- `model_version`
- `evidence_version`
- `prompt_version`
- `overlay_version`

Use this tuple as the idempotency key for analysis jobs.

## Step 4 — Separate pipeline outputs

Detector services may emit only structured observations and measurements, including frame references and confidence. They must not emit final coaching language.

Create these boundaries:

```text
video quality -> stroke/phase detection -> measurements -> context -> rules ->
root-cause selection -> scoring -> overlays -> report language
```

Persist the output of each boundary so only affected layers need regeneration.

## Step 5 — Implement fault evaluator

For every candidate fault:

1. Find its definition by `fault_id`.
2. Verify camera support.
3. Verify required evidence.
4. Apply context gates.
5. Apply valid-variation exclusions.
6. Calculate detection, measurement, context, and interpretation confidence.
7. Require minimum comparable strokes.
8. Return one of:
   - `NOT_VISIBLE`
   - `NOT_SUPPORTED_BY_VIEW`
   - `INSUFFICIENT_SAMPLE`
   - `ACCEPTABLE_VARIATION`
   - `CONTEXT_DEPENDENT`
   - `FAULT_SUSPECTED`
   - `FAULT_CONFIRMED`
9. Never reduce score for the first three unavailable-evidence statuses.

## Step 6 — Implement root-cause graph

Treat observations as `ROOT_CAUSE`, `CONTRIBUTOR`, `SYMPTOM`, or `UNKNOWN`.

Prefer a primary issue that:

- begins earlier in the stroke
- appears on most failed examples
- is absent on successful examples
- explains multiple downstream symptoms
- has adequate confidence
- has a linked, age-appropriate intervention

Do not display a downstream symptom as primary when a supported upstream cause exists.

## Step 7 — Implement report contract

Return exactly four primary report sections:

1. `strength`
2. `primary_correction`
3. `practice_plan`
4. `progress_target`

The player payload must use simple approved language. The coach payload may include raw measurements, normalized timing, confidence dimensions, camera limitations, root-cause graph, and reference-family information.

## Step 8 — Implement overlays

Use overlay recipes from `config/overlay_recipes.json`.

Player default:

- stroke and phase label
- contact marker
- one fault marker
- one correction arrow
- confidence or limitation badge

Coach mode may enable skeleton, joint values, racket/ball paths, shoulder/pelvis lines, sequence ribbon, raw versus filtered paths, and technique-family envelope.

Never display every overlay simultaneously in player mode.

## Step 9 — Add corrections and overrides

Implement:

- player stroke correction
- player phase-boundary correction
- player dismiss observation
- coach confirm/reject observation
- coach change root cause
- coach replace cue or drill

Retain original AI output and store the override separately with actor, timestamp, previous value, replacement value, and reason.

## Step 10 — Shadow mode

Do not immediately replace current production scoring.

Run ontology v2.1.0 in shadow mode and compare against:

- current engine results
- repeated execution of the same video
- qualified coach labels
- successful versus unsuccessful strokes from the same player
- camera-angle cohorts
- junior and adult cohorts

Activate faults individually only after their release criteria pass.

## Step 11 — Tests

Add automated tests for:

- bundle validation
- duplicate IDs
- broken drill/overlay references
- idempotency
- unchanged result on repeated run
- no score for unavailable evidence
- one-primary-fault rule
- context variation exclusions
- left-handed and mirrored footage
- player corrections causing partial invalidation
- prompt-only changes not rerunning detectors
- model changes creating a new analysis version

## Step 12 — Deliverables

Commit:

- integrated bundle
- database migration
- service loader
- TypeScript contracts
- fault evaluator
- root-cause selector
- API payloads
- overlay adapter
- player and coach report adapters
- shadow-mode feature flag
- test suite
- migration notes

Provide a final changed-files list, test results, known limitations, and flags that remain off pending calibration.
