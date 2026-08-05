> **Superseded notice (v3.1.0):** This historical v3.0.1 review documents the conservative age block that existed in that release. Version 3.1.0 intentionally removes the application-level age block while retaining mandatory service-processing consent and a public-launch requirement for market-appropriate youth/guardian governance. See `docs/RED_TEAM_REVIEW_V310.md`.

# AceCoach AI v3.0.1 — Internal Red-Team Review

**Review type:** internal adversarial software, security, privacy, scientific-integrity, and athlete-experience review  
**Baseline:** AceCoach AI review-led v3.0.0 source package  
**Release status:** controlled research beta  
**Not performed:** independent penetration test, legal certification, biomechanics-laboratory validation, clinical review, or governing-body approval

## Executive conclusion

Version 3.0.0 compiled and its deterministic unit tests passed, but it was not safe to label fully red-team reviewed. The audit found several material regressions and boundary failures. The most serious were a reverted athlete-profile/consent workflow, a cross-tenant storage-path trust gap, non-tennis technique scoring, camera-invalid recovery logic, and non-atomic analysis execution.

Version 3.0.1 fixes those findings and adds tests and database controls that make the active product materially safer and more reproducible. It remains a monocular-pose research beta and must not be marketed as laboratory biomechanics or a validated age-group ranking system.

## Material findings and corrections

### RT-01 — Progressive profile and consent regression — fixed

**Risk:** v3.0.0 had reverted to the earlier, tennis-specific profile path. It did not reliably persist `profile_sports`, `physical_profiles`, `consents`, or age-band context, although analysis required service-processing consent. New users could be blocked or analyzed with incomplete context.

**Correction:** restored the progressive multi-sport athlete form and atomic database RPC for profile, sport, physical context, and consent. Athlete-context changes remain part of the report fingerprint.

### RT-02 — Minor consent was not production-safe — fixed by conservative restriction

**Risk:** the product accepted athletes younger than 18 without a verified guardian-consent workflow.

**Correction:** profiles may be saved, but video analysis and raw-media model-training consent are disabled for under-18 users in this controlled beta. Both application and database triggers enforce the restriction. A verified guardian workflow is required before youth analysis is re-enabled.

### RT-03 — Cross-tenant storage-path trust gap — fixed

**Risk:** the analysis server used a service-role client to sign the `storage_path` stored in a user-owned video row. Earlier metadata writes did not prove that the path belonged to that user and sport. A maliciously constructed row could potentially reference another known object path.

**Correction:** application validation and a database trigger now require:

```text
<authenticated-user-id>/<validated-sport-id>/<safe-file-name>
```

Traversal, backslashes, excessive path length, wrong user, and wrong sport are rejected. Legacy inconsistent paths are flagged for operator review rather than silently rewritten.

### RT-04 — Analysis execution race — fixed

**Risk:** two server actions could move the same completed or queued session to processing and run expensive analysis concurrently.

**Correction:** session execution now uses an atomic conditional status claim. A second caller receives an “already running” response. Stale queued sessions can be reclaimed after two minutes.

### RT-05 — Weak analysis-service authentication defaults — fixed

**Risk:** the Python service allowed unauthenticated analysis in development when no key was set. Binding that service beyond loopback could accidentally expose an expensive endpoint.

**Correction:** every analysis request now requires the same shared secret in Next.js and Python, with a minimum length of 32 characters. Health remains available for operations checks.

### RT-06 — Unsupported sports could receive technique scoring — fixed

**Risk:** athlete confirmation could cause a non-tennis clip to receive generic or tennis-derived criterion scoring, creating false precision.

**Correction:** the current calibrated technique engine supports tennis only. Other sports receive capture-quality feedback and explicit model-boundary messaging, with no technique score, technical correction, or movement-confirmation controls.

### RT-07 — Invalid recovery interpretation — fixed

**Risk:** MediaPipe pose-world landmarks were treated as absolute player movement when evaluating recovery. Those coordinates are body-centred estimates and are not court-position tracking.

**Correction:** recovery scoring now uses post-peak motion decay and body-relative control. A shoulder-scaled image-motion trace is displayed only as a camera-dependent proxy. Court recovery, force, momentum, and laboratory centre-of-mass velocity are explicitly not claimed.

### RT-08 — Head stability could be polluted by unrelated clip movement — fixed

**Risk:** full-clip head range could influence scoring even when movement occurred outside the primary repetition.

**Correction:** head control is derived from body-relative head movement within the primary detected repetition. New regression tests prove that changing full-clip aggregate head range cannot alter the score.

### RT-09 — Analysis response trust was too broad — fixed

**Risk:** the web layer trusted a large structured response from the Python service with only shallow validation.

**Correction:** response size is capped at 15 MB; JSON must parse; arrays have upper bounds; hashes, confidence, score, manifest version, movement classification, quality gate, and practice-plan structure are validated before any service-role write.

### RT-10 — Video download SSRF and resource boundaries — strengthened

**Correction:** analysis accepts HTTPS only, port 443 only, no embedded credentials, an exact configured storage-host allowlist, revalidation on every redirect, rejection of private/loopback/link-local/reserved addresses, redirect limits, byte/time/frame/resolution/pixel limits, and live decoded-frame enforcement.

**Residual risk:** DNS can change between validation and connection. The exact storage-host allowlist materially reduces exposure, but production infrastructure should additionally use egress controls.

### RT-11 — Profile and reset writes were non-atomic — fixed

**Risk:** a failure between multiple table writes could leave profile, sport, physical context, and consent out of sync.

**Correction:** v3.0.1 uses service-role-only PostgreSQL functions to save or reset all related rows in one transaction.

### RT-12 — Primary-sport uniqueness could fail during a sport change — fixed

**Risk:** setting a new primary sport before clearing the old one could violate the partial unique index.

**Correction:** migration cleanup deduplicates existing rows and a trigger clears the previous primary inside the same statement transaction.

### RT-13 — OAuth callback and onboarding inconsistency — fixed

**Risk:** Google OAuth redirected directly to the dashboard instead of the PKCE callback. Signup also collected tennis-only attributes despite the multi-sport product.

**Correction:** OAuth routes through `/auth/callback`; signup collects only account essentials; sport, level, goal, dominant side, and consent are collected in the editable athlete profile.

### RT-14 — Fake-looking progress completion — fixed

**Risk:** elapsed-time estimates displayed checkmarks, which could be interpreted as confirmed stage completion.

**Correction:** the overlay now highlights only an estimated current step and explicitly states that no step or percentage has been confirmed by the backend.

### RT-15 — Duplicate active coach shares — fixed

**Risk:** earlier releases could leave more than one unrevoked share for a session, causing a future unique-index migration to fail.

**Correction:** expired and older duplicate shares are revoked before the one-active-share index is created. Share-revocation errors are no longer ignored.

## Determinism and scientific-boundary tests

The expanded test suite verifies:

1. repetition detection is deterministic;
2. identical measurements produce identical scores;
3. unconfirmed movements receive no score;
4. conflicting labels require confirmation;
5. improvement plans are deterministic and actionable;
6. self-reference is not presented as an age percentile;
7. legacy world-COM speed cannot change a score;
8. full-clip head range cannot override primary-repetition scoring;
9. unsupported sports never receive a technique score;
10. a strong API key is mandatory;
11. invalid identity UUIDs are rejected;
12. video URLs reject credentials, nonstandard ports, private networks, and unlisted hosts.

## Validation completed

- TypeScript typecheck: passed
- ESLint: passed
- Next.js production build: passed
- Python source compilation: passed
- Python integrity/security tests: **14 passed**
- PostgreSQL parser:
  - migration 016: 59 statements parsed
  - migration 017: 67 statements parsed
- NPM production audit: 0 critical, 0 high, 2 moderate findings
- Secret/generated-file package scan: required before final packaging and recorded in release notes

## Dependency finding

The production audit reports a moderate PostCSS advisory through the Next.js dependency tree. The direct installed PostCSS used by Tailwind is newer, while Next.js 16.2.10 bundles an older PostCSS. No forced package override was applied because an untested dependency override is not an acceptable security fix. Reassess when Next.js publishes a compatible patched dependency update and validate it in a dedicated branch.

The Python vulnerability audit could not complete in this build environment because the vulnerability service could not be resolved. Run `pip-audit -r services/api/requirements.txt` from a networked CI runner before internet-facing deployment.

## Open release blockers

The following remain unresolved and prevent “state of the art,” “laboratory grade,” or clinically validated claims:

- no trained, held-out RGB-plus-skeleton stroke classifier;
- no racket, bat, ball, shuttle, bounce, or true contact-event detector;
- no calibrated multi-view reconstruction or validated monocular 3D;
- no force, joint-moment, muscle-activity, injury, or official legality measurement;
- no motion-capture comparison study;
- no independent accredited-coach inter-rater validation;
- no consented cohort for real age/level percentiles;
- no verified guardian-consent workflow;
- no production queue, durable retry worker, per-user quota, or distributed rate limiter;
- no independent penetration test or production load test;
- no complete real-video MediaPipe acceptance run in this container.

## Approved use

Controlled adult research-beta testing with short, well-lit tennis clips and explicit limitations.

## Prohibited use

Medical or injury decisions, official adjudication, athlete selection, public cohort ranking, safeguarding decisions, or claims of laboratory biomechanics accuracy.
