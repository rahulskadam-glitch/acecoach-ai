# AceCoach AI v5.0.0 current-state audit

## Baseline

The source baseline is the uploaded **AceCoach AI Human Motion Coach v4.0.0** package. The complete user-review and Level 1/2/3 instruction history is preserved verbatim in `docs/SOURCE_REQUIREMENTS_AND_USER_REVIEW_INPUT_V500.txt`.

## Existing routes retained

- Public: `/`, `/login`, `/signup`, `/forgot-password`, `/update-password`, `/version`
- Athlete workspace: `/dashboard`, `/upload`, `/library`, `/analysis/[id]`, `/progress`, `/benchmark`, `/feedback`, `/profile`
- Secure sharing: `/share/[token]`

## New v5 routes

- `/practice` — session-linked plans rather than drills buried inside chat
- `/methodology` — validated, beta, proxy, and unavailable capability labels
- `/pricing` — centralized, transparent entitlement preview
- `/support` — safe diagnostics and visible request status

## Existing strengths

- Supabase authentication and private video storage
- Multi-sport registry for tennis, badminton, squash, cricket, and table tennis
- Reliability-gated analysis and movement confirmation
- Four-section player report
- Synchronized category and best-in-class reference silhouettes
- Guided practice plans, check-ins, reassessment status, progress view, secure coach links
- Server-only analysis result persistence
- Existing RLS and security hardening migrations

## Baseline weaknesses found

1. The report still repeated the primary priority inside the improvements cards.
2. Difference vectors were visible on the player video by default, conflicting with the clean-video requirement.
3. Silhouette limbs were mostly thick SVG strokes rather than tapered human body shapes.
4. The library supported deletion but not direct original-video download.
5. Upload interruption state disappeared after refresh and there was no checksum-based duplicate protection.
6. Review-led requirements were distributed across conversation text instead of a traceable delivery ledger.
7. Practice, methodology, support, and pricing trust were not first-class workspace destinations.
8. Feature boundaries existed for the report but not for media, jobs, analysis contracts, practice contracts, billing, or observability.
9. The current engine remains monocular and pose-led. It does not provide validated racket/ball tracking, calibrated 3D, force, joint loading, or genuine cohort percentiles.
10. Player-matched appearance reconstruction, temporal inpainting, and trained RGB-plus-pose classification were requested but are not supported by the current dependency set or local runtime.

## Large and mixed-responsibility files

- `src/app/actions/analysis-actions.ts` — orchestration, persistence, recovery, coaching-plan creation, sharing, and report read flow
- `src/components/upload/VideoUploader.tsx` — preflight, storage upload, metadata registration, local state, analysis launch, delete, and report completion
- `src/features/report/components/SynchronizedHumanComparison.tsx` — playback, synchronization, phase mapping, reference selection, silhouette configuration, and comparison UI
- `services/api/analysis_engine/pipeline.py` — multi-stage deterministic analysis flow

These remain refactoring targets. v5 introduces explicit domain contracts and public boundaries before moving working logic.

## Database baseline

Migrations 001–020 define profiles, videos, analysis sessions/reports, evidence, feedback, practice plans, check-ins, secure report sharing, product feedback, and human silhouette preference. Migration 021 adds:

- video SHA-256 checksum and original-preserved flag;
- safe support requests;
- governed product-feedback events and release decisions;
- append-only analysis job events.

## v5 architecture decision

v5 is a **strangler-pattern foundation**, not a destructive rewrite. Working v4 behavior remains active while new typed boundaries are introduced and wired into high-risk flows first. This avoids a large unverified migration that could break uploads, reports, or existing athlete data.
