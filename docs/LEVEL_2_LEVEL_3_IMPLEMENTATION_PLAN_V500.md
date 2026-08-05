# AceCoach AI v5 — Level 2 and Level 3 implementation plan

## Execution rule

Every Level 3 task requires: user problem, current-state evidence, desired behavior, affected modules, dependencies, database impact, backend work, frontend work, failure states, security review, telemetry, automated tests, manual acceptance, and completion evidence. A task is not complete because a file exists; it must be visible in an active route or exercised by an automated test.

Status values: **Delivered**, **Foundation**, **Next**, **Blocked by validation**.

## L1. Platform architecture

### L2.1 Feature boundaries

- **L3.1.1 Repository inventory — Delivered.** Audit active routes, source, services, migrations, large files, direct infrastructure use, and unsupported capabilities. Evidence: `V500_CURRENT_STATE_AUDIT.md`.
- **L3.1.2 Feature public APIs — Foundation.** Add public `index.ts` boundaries for upload, analysis-session, practice, billing, storage, jobs, and observability.
- **L3.1.3 Move legacy actions behind services — Next.** Split the oversized analysis action into session repository, job orchestrator, report repository, practice application service, and share service.
- **L3.1.4 Dependency enforcement — Next.** Add dependency-cruiser or ESLint boundaries; fail CI on domain imports from React, Next.js, Supabase, or HTTP.

### L2.2 Domain contracts

- **L3.2.1 VideoAsset/CaptureAssessment — Delivered.** `src/platform/storage`.
- **L3.2.2 AnalysisJob/EngineManifest — Delivered.** `src/platform/jobs`.
- **L3.2.3 Reliability and measurement contracts — Delivered.** `src/features/analysis-session`.
- **L3.2.4 Drill and reassessment contracts — Delivered.** `src/features/practice`.
- **L3.2.5 Runtime schema validation — Next.** Add Zod schemas at API and persistence boundaries.

## L1. Authentication, profile, and consent

### L2.3 Authentication lifecycle

- **L3.3.1 Email/password, confirmation, reset — Retained.** Regression-test every callback and expired-link state.
- **L3.3.2 OAuth state/open-redirect protection — Next.** Verify callback state and allow only internal return paths.
- **L3.3.3 Session expiry during upload — Next.** Preserve pending metadata and ask for reauthentication before registration.

### L2.4 Athlete context

- **L3.4.1 Required and optional fields — Retained.** Required essentials remain visually separated from optional context.
- **L3.4.2 Multi-sport profiles — Next.** Create sport-profile child records rather than a single primary-sport row.
- **L3.4.3 Reference-body preference — Delivered.** Neutral/female/male plus player-proportioned report mode; no gender inference from video.

### L2.5 Consent

- **L3.5.1 Service processing — Retained and versioned v5.** Server checks remain required.
- **L3.5.2 Derived-data improvement — Retained as optional.** No automatic engine update.
- **L3.5.3 Raw-media training — Retained as optional.** Default off; governed use only.
- **L3.5.4 Youth/guardian workflow — Next.** Required before public youth launch by jurisdiction.

## L1. Capture, upload, and media ownership

### L2.6 Capture Coach

- **L3.6.1 Sport-specific filming cards — Retained.** Change with selected sport.
- **L3.6.2 Browser metadata preflight — Retained.** Duration, resolution, orientation, format, and size.
- **L3.6.3 Live full-body/equipment framing — Blocked by validation.** Requires on-device preview model and battery/thermal tests.

### L2.7 Upload reliability

- **L3.7.1 Explicit upload state machine — Delivered.** Transition contract in `src/features/upload`.
- **L3.7.2 Transient retry — Delivered.** Bounded retry for storage upload.
- **L3.7.3 Safe refresh recovery record — Delivered.** Local metadata banner; explicitly states file bytes cannot be restored by the browser.
- **L3.7.4 SHA-256 duplicate protection — Delivered after migration 021.** User + checksum unique index.
- **L3.7.5 True resumable byte upload — Next.** Replace standard upload with TUS/resumable provider; do not label current retry as byte resume.
- **L3.7.6 Registration rollback — Retained and strengthened.** Remove uploaded object if metadata registration fails; remove new duplicate object when an existing checksum record is returned.

### L2.8 Media ownership

- **L3.8.1 Signed original download — Delivered.** 60-second owner-checked URL.
- **L3.8.2 Explicit delete — Retained.** Ownership checked in storage and database.
- **L3.8.3 Export package — Next.** Bundle original, report JSON/PDF, practice history, and consent history.
- **L3.8.4 Retention/cancellation policy — Foundation.** Visible in `/pricing`; needs production legal and billing implementation.

## L1. Analysis orchestration

### L2.9 Durable jobs

- **L3.9.1 Stage vocabulary — Delivered.** `ANALYSIS_JOB_STAGES`.
- **L3.9.2 Append-only job events — Delivered after migration 021.** Database foundation.
- **L3.9.3 Atomic worker claim and heartbeat — Next.** Add queue adapter and stale-claim recovery.
- **L3.9.4 Idempotency key — Existing session fingerprint retained; Next:** include checksum, confirmed movement, athlete context, and full engine manifest.
- **L3.9.5 Last successful report preservation — Retained.** Regression-test reanalysis failure.

### L2.10 Processing UX

- **L3.10.1 Honest stage display — Retained.** Do not fabricate percentages.
- **L3.10.2 Last heartbeat and retry state — Next.** Read from job events.
- **L3.10.3 Safe cancellation — Next.** Define cancellable stages and cleanup semantics.

## L1. Recognition and corrections

### L2.11 Athlete selection

- **L3.11.1 Multi-person tracks — Blocked by model work.** Detect all people and require selection when ambiguous.
- **L3.11.2 “This is me” correction — Next after tracks exist.** Persist original and corrected track.

### L2.12 Movement classification

- **L3.12.1 Tennis taxonomy — Retained.** Forehand, one/two-handed backhand, serve, volleys, slice, overhead, unknown, mixed.
- **L3.12.2 Confidence and conflict workflow — Retained.** No movement-specific score before confirmation.
- **L3.12.3 Trained RGB + pose classifier — Blocked by dataset and validation.** Deterministic rules remain fallback.

### L2.13 Timeline correction

- **L3.13.1 Repetition editor — Next.** Add/delete/resize and select primary repetition.
- **L3.13.2 Phase editor — Next.** Ordered preparation, load, swing, contact proxy, finish, recovery.
- **L3.13.3 Downstream partial recompute — Next.** Invalidate only dependent measurements and coaching.

## L1. Pose, equipment, and court intelligence

### L2.14 Pose adapters

- **L3.14.1 Model interface — Next.** MediaPipe/RTMPose/MoveNet/ViTPose adapter contract.
- **L3.14.2 Landmark confidence lineage — Existing data retained; Next:** make interpolation/clipping explicit per frame.
- **L3.14.3 Versioned deterministic smoothing — Retained in engine; add manifest parameters.**

### L2.15 Equipment and ball

- **L3.15.1 Racket detector — Blocked by model validation.** Withhold racket metrics when absent.
- **L3.15.2 Ball/contact detector — Blocked by model validation.** Contact proxy must remain visibly labelled proxy.
- **L3.15.3 Cricket/badminton/squash/table-tennis adapters — Architecture next.** Never run tennis rules blindly.

### L2.16 Court geometry

- **L3.16.1 Lines/net/ground plane — Blocked by calibration work.** Court-relative metrics require confidence gate.

## L1. Biomechanics and scientific integrity

### L2.17 Measurement registry

- **L3.17.1 Metric metadata — Existing report fields retained; Next:** central registry with formula, landmarks, unit, type, camera dependency, threshold, references, version.
- **L3.17.2 Measurement labels — Delivered at methodology level.** Validated/Beta/Proxy/Unavailable.
- **L3.17.3 UI labels per metric — Next.** Derive directly from measurement contract.

### L2.18 Reliability gates

- **L3.18.1 Hard blockers — Retained.** Poor capture, unresolved movement, no repetition, unsupported sport.
- **L3.18.2 Soft blockers — Retained concept; Next:** standardized wording and confidence effect.
- **L3.18.3 Determinism tests — Retained Python tests; extend to complete report hash and motion-twin marker output.**

## L1. Player-matched motion twin

### L2.19 Clean comparison

- **L3.19.1 Clean raw player panel — Delivered.** Difference overlay defaults off.
- **L3.19.2 Optional single guide — Delivered.** One toggle; no persistent skeleton.
- **L3.19.3 Frame and phase stepping — Delivered.** Previous/next frame, phase buttons, rate controls.

### L2.20 Human renderer

- **L3.20.1 Tapered vector body — Delivered.** Filled torso/pelvis, tapered arms/legs, feet, head, racket.
- **L3.20.2 Semi-transparent body — Delivered.** Guide readability preserved.
- **L3.20.3 Player-proportioned mode — Foundation.** Uses saved side/level/body-style context; does not reconstruct face or clothes.
- **L3.20.4 Player-textured digital twin — Blocked by segmentation, appearance, inpainting, and retargeting validation.** Never fake it with a blurred duplicate.

### L2.21 Reference motion and synchronization

- **L3.21.1 Category and elite deterministic references — Retained.** Separate one/two-handed families.
- **L3.21.2 Phase-aware athlete master clock — Retained.**
- **L3.21.3 Learned reference library and independent validation — Blocked by curated data rights and biomechanics review.**

## L1. Report and language

### L2.22 Player report

- **L3.22.1 Four main sections — Delivered.** Advanced content is unnumbered and collapsed.
- **L3.22.2 One primary correction — Delivered.** Removed from supporting cards.
- **L3.22.3 Show me and success target — Delivered.** Summary links to comparison and explains improvement evidence.
- **L3.22.4 Trust Summary — Delivered.** Original video, movement, capture, and score status.

### L2.23 Plain language

- **L3.23.1 Technical dictionary — Retained and expanded incrementally.**
- **L3.23.2 Observation → impact → correction → cue → evidence → practice schema — Next.** Make structurally required.
- **L3.23.3 LLM structured-output guardrail — Existing architecture retained; add runtime validation and adversarial tests.**

## L1. Practice, reassessment, and progress

### L2.24 Practice

- **L3.24.1 First-class Practice route — Delivered.** Session, goal, cue, completion, reassessment remain linked.
- **L3.24.2 Approved drill library only — Existing deterministic drills retained; formal contract delivered.**
- **L3.24.3 Live repetition counting/audio cues — Blocked by real-time model and thermal testing.**

### L2.25 Reassessment

- **L3.25.1 Due date and capture plan — Retained.**
- **L3.25.2 Comparable-session rules — Partly retained; Next:** enforce same sport, confirmed movement, side, camera, capture, engine, target metric.
- **L3.25.3 No false match-performance claim — Retained in language and progress copy.**

## L1. Coach and parent collaboration

### L2.26 Structured review

- **L3.26.1 Secure report share — Retained.**
- **L3.26.2 Approve/reject/edit finding — Next.** Version every coach decision.
- **L3.26.3 Frame annotation and voice-over — Next.** Separate annotation mode from scrub mode.
- **L3.26.4 Athlete question on frame — Next.** Open at exact timestamp.
- **L3.26.5 Parent read-only authorization — Next.** Explicit, scoped, revocable.

## L1. Feedback, support, pricing, and observability

### L2.27 Support

- **L3.27.1 Safe support form — Delivered after migration 021.** App/browser/session/job/stage references; no raw video or secrets.
- **L3.27.2 Request status — Delivered.** received/investigating/resolved/closed.
- **L3.27.3 Internal support console — Next.** Service-role-only triage.

### L2.28 Feedback governance

- **L3.28.1 Structured product feedback — Retained.**
- **L3.28.2 Event and release-decision history — Delivered after migration 021.**
- **L3.28.3 Offline experiment/validation workflow — Next.** No automatic live change.

### L2.29 Pricing trust

- **L3.29.1 Central entitlement source — Delivered.** `src/features/billing`.
- **L3.29.2 Visible plan limits and historical access — Delivered.** `/pricing`.
- **L3.29.3 Payment, renewal, cancellation, refund, export — Blocked until production-ready.** Payment stays disabled.

### L2.30 Observability

- **L3.30.1 Event vocabulary — Delivered.** Privacy-safe names.
- **L3.30.2 Server event sink and dashboards — Next.** Never log raw media, pose frames, profile values, secrets, or signed URLs.

## L1. Security, migrations, tests, and release

### L2.31 Security

- **L3.31.1 Owner-checked download — Delivered.**
- **L3.31.2 RLS/service-role boundaries — Retained and expanded in migration 021.**
- **L3.31.3 SSRF, malicious file, oversized response, prompt injection tests — Existing partial coverage; Next:** complete suite.

### L2.32 Migrations

- **L3.32.1 Migration 021 repeat safety — Delivered by guarded tables/columns/indexes/policies.**
- **L3.32.2 Fresh/partial/upgraded database CI — Next.** Use disposable Postgres/Supabase containers.
- **L3.32.3 Rollback notes — Delivered in install documentation; destructive automatic rollback intentionally avoided.**

### L2.33 Validation and packaging

- **L3.33.1 Static v5 integration verifier — Delivered.**
- **L3.33.2 Typecheck/lint/Python tests/build — Required before package.** Results recorded in `TEST_REPORT_V500.md`.
- **L3.33.3 Active route screenshots — Next when browser automation is available.** Static verification must not be described as visual proof.
- **L3.33.4 Clean ZIP root and secret scan — Required before release.**
