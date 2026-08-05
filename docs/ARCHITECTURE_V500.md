# AceCoach AI v5.0.0 architecture

## Release strategy

v5 applies a strangler architecture around the working v4 product. New domains own contracts and policy while legacy route actions remain operational until replaced behind tested interfaces.

## Layers

### `src/app`

Routes and server actions. Route pages should compose feature public APIs, not calculate biomechanics or storage ownership.

### `src/features`

- `analysis-session` — reliability and measurement contracts
- `billing` — single entitlement source
- `practice` — drill, success, and reassessment contracts
- `report` — player-first presentation, language, and motion visualization
- `support` — safe issue submission
- `upload` — explicit upload state machine and pending metadata

### `src/platform`

- `storage` — media identity, lifecycle, capture contract
- `jobs` — analysis stages and engine manifest
- `observability` — privacy-safe product event vocabulary

### `services/api`

Deterministic video, pose, temporal, classification, sport-rule, biomechanics, evidence, and coaching pipeline. The service remains the only authority for measured values.

## Output authority

1. Video and deterministic engine calculate structured facts.
2. Reliability gate decides whether facts may be shown or scored.
3. Sport rules create deterministic coaching findings.
4. Language service simplifies approved findings.
5. UI displays evidence and limitations.
6. A language model may summarize but may not create measurements, confidence, scores, diagnoses, or percentiles.

## Media flow

`selected → validating → uploading → uploaded → registering → completed → queued → processing → awaiting-confirmation/completed`

- transient upload calls retry;
- safe pending metadata survives refresh;
- browser refresh cannot restore file bytes, so the user reselects the file;
- SHA-256 prevents duplicate database records;
- original video remains downloadable until explicit delete.

## Analysis job evidence

Migration 021 introduces append-only `analysis_job_events`. The current pipeline still uses existing session status fields. A future worker migration should dual-write events before switching the read model.

## Motion twin boundary

v5 provides deterministic, tapered 2D reference silhouettes synchronized to measured phases. It does **not** yet provide player-textured reconstruction, background temporal inpainting, trained motion retargeting, or calibrated 3D. Those require a dedicated rendering service, consent review, benchmarks, and visual quality tests.
