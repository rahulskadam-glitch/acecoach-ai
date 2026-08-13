# Integration into AceCoach

## Target architecture

Use the existing feature-based structure:

```text
src/features/analysis-session
src/features/movement-recognition
src/features/biomechanics
src/features/report
src/features/practice
src/features/reassessment
src/features/coach-review
src/platform/database
src/platform/jobs
src/platform/events
src/platform/observability
src/sports/tennis
services/analysis-api
```

## Placement

```text
src/sports/tennis/ontology/                 <- client-safe subset
services/analysis-api/ontology/             <- complete bundle
services/analysis-api/app/ontology/         <- Python loader
src/features/biomechanics/contracts/        <- TypeScript contracts
supabase/migrations/                         <- SQL migration
```

## Runtime sequence

1. Load and validate bundle once when the analysis service starts.
2. Reject startup if IDs, phases, markers or drill references are invalid.
3. Hash the manifest and store the active ontology version.
4. On analysis creation, calculate `source_video_hash` and `input_config_hash`.
5. Check the idempotency key before running expensive processing.
6. Detector services emit structured measurements only.
7. The rules engine evaluates context gates and exclusions.
8. Confidence policy determines `FAULT_SUSPECTED`, `FAULT_CONFIRMED`, or no-score status.
9. Root-cause graph selects one primary correction.
10. Overlay service renders the selected recipe.
11. Report service receives structured facts, never raw detector guesses.
12. Store output hash and every component version.

## Four server-confirmed UI stages

Keep the approved flow:

1. Checking video quality
2. Confirming movement
3. Measuring technique
4. Building report

Each stage writes durable progress and can resume idempotently.

## Invalidation rules

- Player corrects stroke type -> rerun context, phase-dependent measurements, faults, report and overlays for that stroke only.
- Player corrects phase boundary -> rerun affected features, faults, report and overlays for that stroke only.
- Coach overrides fault -> retain AI observation; update selected coaching priority and report.
- Prompt changes -> regenerate language only.
- Overlay recipe changes -> regenerate overlays only.
- Scoring changes -> regenerate category scores and report ordering, not detections.
- Model changes -> create a new analysis version; never silently overwrite history.

## Minimum release scope

Start with forehand, two-handed backhand and serve. Support:

- stroke classification and correction
- phase segmentation and correction
- preparation timing
- contact location
- spacing
- head stability
- basic racket path
- recovery
- confidence and camera limitations
- one primary correction
- one drill and measurable reassessment target

Do not activate advanced racket-face or pronation faults until view-specific validation passes.
