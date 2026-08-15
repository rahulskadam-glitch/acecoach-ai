# Governed knowledge layer v6.4.0

## What is active

- All eight supported tennis strokes have an explicit source registry covering peer-reviewed work, governing-body coaching material, and clearly labelled coach video material.
- The reasoner loads that registry on every analysis and publishes machine-readable source coverage in `ontologyReasoning.knowledgeLayerStatus`.
- Numeric cohort and percentile claims remain off. A web page, coaching manual, or expert video is qualitative provenance; it is not a measured player cohort.
- Each reliable movement-chain construct is persisted for every completed analysis. After three earlier context-matched sessions and 24 reliable repetitions, the report compares the current score with the player’s personal typical and highest reliable scores.
- Validated coach, sensor, or ball-tracker outcome labels can be joined to repetitions during reanalysis. Self-reported labels remain useful collection data but cannot unlock causal or self-best reasoning.

## Stroke source coverage

| Supported stroke | Governing-body coverage | Research coverage | Coach-video supplement |
|---|---|---|---|
| Forehand | ITF, USTA, Tennis Australia, LTA | Reid, Landlinger, He et al. | Mouratoglou |
| Two-handed backhand | ITF, USTA, Tennis Australia | Reid, Genevois, Stepien | Mouratoglou |
| One-handed backhand | ITF, USTA, Tennis Australia | Reid, Genevois, Stepien | Mouratoglou |
| Slice backhand | ITF, USTA, Tennis Australia | Elliott | Mouratoglou |
| Serve | ITF, USTA, Tennis Australia, LTA | Kovacs, Brito, Elliott | Mouratoglou |
| Forehand volley | ITF, USTA, Tennis Australia | Furuya, Chow, Elliott | — |
| Backhand volley | ITF, USTA, Tennis Australia | Furuya, Chow, Elliott | — |
| Overhead | ITF, USTA, Tennis Australia | Elliott | — |

The complete IDs, URLs, scope limitations, and permitted uses live in `research_sources.json` and `stroke_source_registry.json`. AITA and ATF sources document coach-education/governance context only; they do not supply technical or numeric stroke claims.

## Fail-closed release gates

| Capability | Minimum release conditions | Current state |
|---|---|---|
| Personal baseline | 3 prior matching sessions, 24 reps, confidence ≥ 0.65, capture difference ≤ 15, same engine/runtime/context | Active when the player qualifies |
| Matched cohort | ≥ 30 athletes and ≥ 300 reps per complete context cell, ≥ 8 reps per athlete, consent/bias/uncertainty/missingness/validation documentation, unexpired review | Dormant; no validated cohort exists |
| Outcome comparison | Credentialed-coach, validated-sensor, or validated-ball-tracker label with matching verification status | Contract and reanalysis path active; no dataset bundled |
| Expert annotation | 3 independent verified and blinded raters, versioned rubric, Fleiss’ kappa ≥ 0.60, disagreements retained | Collection contract ready |
| Intervention validation | 3 baseline, 3 post, 2 retention, 2 transfer contexts, stable cue and matched outcome | Collection contract ready; causal claims prohibited |
| Ball/racket/contact tracking | Held-out athlete, camera, occlusion/blur, trajectory/path/face and timing error artifacts as applicable | Dormant pending validated models |
| Multi-camera 3D | Calibration, synchronization and reprojection error reports plus held-out athlete testing | Dormant pending validated capture workflow |
| Joint force/load | Validated kinetics instrumentation, held-out athlete test and uncertainty report | Dormant; pose cannot unlock it |

## Persistence and governance

Migration 030 adds outcome labels, expert studies and annotations, intervention validations, cohort versions and cells, model-capability validations, capture calibrations, and a server-only batch RPC for all construct distributions. Migration 031 explicitly removes Supabase default Data API privileges before granting the minimum player access, and migration 032 prevents duplicate session-level labels from the same expert rater. Every table has row-level security; sensitive governance tables are service-role only. Cohorts and capabilities carry status, expiry, uncertainty, bias/coverage artifacts, and withdrawal fields so a previously available benchmark can be removed automatically when it no longer qualifies.

## Important interpretation boundary

The internal 0–100 area score is a criterion-based coaching index. It is not an elite norm, percentile, probability, medical assessment, force estimate, or 3D measurement. Research and coaching sources guide qualitative constructs and language; only player measurements or a future validated cohort may support numeric comparisons.
