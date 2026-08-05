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
supabase/migrations/                         <- SQL migration (001 + new 002_context_safeguarding_longitudinal.sql)
src/features/player-profile/                 <- consumes context_model.json + player_profile/consent schemas
src/features/consent/                        <- consumes safeguarding.json, api/context-and-safety-contract.yaml
src/features/progress/                       <- consumes longitudinal_model.json, progress endpoint
src/features/overlay-renderer/               <- consumes visual_grammar.json (colors, geometry, z-order, confidence rendering)
```

## Runtime sequence

1. Load and validate bundle once when the analysis service starts.
2. Reject startup if IDs, phases, markers or drill references are invalid.
3. Hash the manifest and store the active ontology version.
4. On upload, run the `content_moderation_log` precheck (`api/context-and-safety-contract.yaml` `/v1/moderation/precheck`) before the file is durably stored. Hard-block trust-and-safety hits; soft-fail benign mismatches with a plain retry message.
5. Confirm `player_id` exists and `guardian_consent.scope_ai_analysis = true` (or `not_required_adult_self_consent`). Reject with 403 otherwise — do not queue the job and hold it pending consent.
6. On analysis creation, calculate `source_video_hash` and `input_config_hash`.
7. Check the idempotency key before running expensive processing.
8. Detector services emit structured measurements only.
9. The rules engine evaluates context gates (now populated from `session_context`, not empty arrays) and exclusions.
10. Confidence policy determines `FAULT_SUSPECTED`, `FAULT_CONFIRMED`, or no-score status.
11. Root-cause graph selects one primary correction.
12. Overlay service renders the selected recipe using `visual_grammar.json` tokens (color, line style, geometry, z-order) — never ad hoc styling in the frontend.
13. Report service receives structured facts, never raw detector guesses.
14. Longitudinal service updates `progress_trends` and any `reassessment_links` this session closes out.
15. Store output hash and every component version, including `overlay_version` against `visual_grammar.json`'s own revision.

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
- Guardian revokes consent -> cancel any pending analysis for that player immediately; existing completed analyses remain (deletion is a separate, explicit action per `safeguarding.json` data_retention), but no new run, export, or coach access is permitted until re-consent.
- New session closes a `reassessment_link` -> recompute `progress_trends` for the affected `fault_id` only, not the player's full history.

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
