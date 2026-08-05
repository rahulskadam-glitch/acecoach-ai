# Internal Red-Team Review — AceCoach AI v3.0

**Review type:** internal adversarial engineering, security, scientific-integrity, and athlete-UX review.  
**Not included:** independent penetration test, external biomechanics validation, clinical review, or governing-body certification.

## High-risk findings addressed

### 1. Stale report reuse after profile changes — fixed

The old cache key used only user, video, and engine version. A changed age band, level, dominant side, goal, or selected movement could return an old report. v3.0 adds a SHA-256 athlete-context fingerprint to session/report versioning and changes the database uniqueness key.

### 2. Concurrent duplicate analysis — mitigated

The server checks exact-context sessions before starting, returns an existing queued/processing/completed session, retries failed sessions safely, and uses a database uniqueness constraint to close races.

### 3. Unvalidated analysis-service response — fixed

The web server now rejects malformed hashes, scores, confidence, manifests, movement classifications, quality gates, arrays, and practice-plan structures before persistence. It also rejects a mismatched engine version.

### 4. Required consent not enforced at execution — fixed

Analysis requires saved service-processing consent. The server checks this immediately before creating or rerunning a session.

### 5. Practice-plan replacement could archive the useful plan before the new one saved — fixed

A database function now upserts the replacement and archives older plans atomically in one transaction.

### 6. Legacy feedback table incompatibility — fixed

The migration upgrades the older `analysis_feedback` shape in place, makes the obsolete `analysis_id` optional, adds session-linked fields and constraints, removes browser-write policies, and preserves historical rows.

### 7. Upload retry could duplicate files and leave ghost cards — fixed

Each successful candidate is removed immediately. Failed uploads remove their temporary UI row, revoke preview URLs, and remove orphaned storage objects when metadata registration fails.

### 8. Processing looked frozen — improved

An explicit overlay explains the estimated processing step and elapsed time without claiming fake completion percentages.

### 9. Share-view count race — fixed

View accounting is performed by an atomic database function. Shared pages are dynamic and `noindex`; raw video, athlete profile, and frame-level data are excluded.

### 10. Video resource exhaustion — strengthened

The API enforces download bytes, duration, metadata frame count, live decoded-frame count, minimum and maximum resolution, pixel count, redirects, timeouts, safe hosts, and concurrency.

## Scientific-integrity checks

- The same measurements produce the same score in unit tests.
- Movement conflict with the selected label requires confirmation.
- Unconfirmed movement receives no technique score.
- Repetition comparison is explicitly self-consistency, not a technique grade or age percentile.
- The report distinguishes measured pose observations, camera-dependent proxies, and unavailable quantities.
- Racket face, ball contact, forces, joint moments, and medical diagnosis remain explicitly unsupported.

## Athlete-experience checks

- One visible primary correction before technical detail.
- Finding tied to a visual moment.
- Cue, drill, dose, success test, and transfer challenge.
- Dedicated library and retry path.
- Practice check-ins and reassessment loop.
- Feedback mechanism for wrong movement, clarity, drill relevance, and report usefulness.
- Transparent beta pricing rather than a hidden or non-functional paid promise.

## Automated validation completed for the packaged source

- TypeScript typecheck.
- ESLint.
- Next.js production build.
- Python source compilation.
- Seven deterministic analysis-integrity unit tests.
- Production dependency audit reviewed.
- Secret/generated-file scan before ZIP creation.

## Open release blockers for “state of the art” claims

- No trained racket/ball-aware classifier with held-out athlete evaluation.
- No motion-capture comparison for joint-angle or phase errors.
- No validated age-group cohort.
- No official injury-screening validation.
- No native capture app or live feedback.
- No external security or scientific audit.

**Approved use:** controlled research-beta testing with clear limitations.  
**Not approved:** medical decisions, official line/stroke legality, talent selection, or public cohort ranking.

## Dependency-audit note

`npm audit --omit=dev` reported 0 critical, 0 high, and 2 moderate findings. The reported chain is Next.js → bundled PostCSS 8.4.31 (GHSA-qx2v-qp2m-jg93); the other installed PostCSS path is 8.5.16. No forced framework change was applied during this build. Reassess against the public registry and the next compatible Next.js patch before production deployment.
