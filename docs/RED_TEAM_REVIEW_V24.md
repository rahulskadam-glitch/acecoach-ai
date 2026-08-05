# AceCoach AI v2.4.1 — Red-Team Review and Release Decision

## Release decision

**Status: research beta, approved for controlled athlete testing.**

This package is materially safer, more reproducible, and more useful than v2.1. It is **not** represented as laboratory-grade biomechanics or a validated age-group ranking product. The report distinguishes measured pose observations, camera-dependent proxies, coaching interpretation, and unavailable measurements.

## Red-team questions and mitigations

### Could the wrong stroke receive confident coaching?

**Prior risk:** the upload label could silently drive a forehand report for a backhand clip.

**Mitigation:**
- The selected movement and detected movement are stored separately.
- Low-confidence, conflicting, serve/overhead, and volley classifications require athlete confirmation.
- A movement that is not confirmed receives no sport-specific score.
- One-handed and two-handed backhands are no longer treated as interchangeable labels.

**Residual risk:** the current classifier is a deterministic pose-trajectory ensemble. It does not yet track the racket or ball and is not a trained RGB action-recognition model.

### Could the same video receive different scores?

**Prior risk:** development scores were seeded from identifiers and were not measurements.

**Mitigation:**
- ID-seeded scoring code was removed from the active codebase.
- The SHA-256 video hash, athlete context, confirmed movement, and complete model/rule versions form the input fingerprint.
- Every decoded frame is processed in a fixed order.
- The scoring layer is deterministic and covered by repeatability tests.
- A completed session is reused for the same user, video, and engine version.

**Expected behaviour:** identical content, context, confirmation, and engine versions produce identical rounded measurements and score. A changed engine version or changed athlete context is a different analysis and is labelled as such.

### Could a poor recording create misleading technical advice?

**Mitigation:** technique scoring is withheld when any of these reliability gates fail:
- capture score below 58,
- core-pose coverage below 70%,
- edge clipping above 20%,
- median athlete height below 28% of the frame,
- no complete repetition,
- fewer than two complete repetitions for the execution index.

A withheld score is stored as `NULL`, never as zero.

### Could a user alter their own analysis result in the browser?

**Prior risk:** authenticated RLS policies allowed users to update analysis rows directly.

**Mitigation:**
- Analysis sessions and reports are read-only to authenticated browser clients.
- Analysis writes use `SUPABASE_SERVICE_ROLE_KEY` only inside Next.js server actions.
- Every server mutation first verifies the authenticated user and filters by ownership.
- Debug recovery-link and user-deletion routes were removed.
- Server authentication now validates the JWT through `auth.getUser()` rather than trusting only the local session payload.

### Could the analysis API be abused?

**Mitigation:**
- Optional local and mandatory production API-key protection.
- HTTPS-only video URLs.
- Private, loopback, link-local, multicast, and reserved destinations are blocked.
- A video-host allowlist is mandatory in production.
- Download size, duration, frame-count, resolution, and timeout limits are enforced.
- Concurrent analysis slots are bounded; excess requests return HTTP 429.
- Temporary video files are deleted after processing or failure.

### Does the report overclaim science?

**Mitigation:**
- The score is labelled a **provisional execution index**, not an elite score or percentile.
- Contact is labelled a peak whole-chain-motion proxy because the ball and racket are not detected.
- Image-plane and MediaPipe world-coordinate outputs are described as monocular pose proxies.
- Forces, joint moments, muscle activation, racket-face angle, ball speed, and injury diagnosis are explicitly unavailable.
- Age/level output is a qualitative development-reference lens. No peer percentile is shown without a validated cohort.
- Evidence sources are displayed in the report and linked to the coaching model rather than presented as proof of each camera-derived measurement.

## Athlete experience improvements

- Coach-first summary: strongest quality, first priority, why it matters, and practice focus.
- Frame-synchronised video with skeleton, hitting-hand trail, centre-of-mass proxy, slow motion, frame stepping, repetitions, and phase navigation.
- Full movement-chain review: readiness, footwork, preparation, backlift, loading, body position, swing rhythm, contact-spacing proxy, finish, and recovery.
- Maximum three prioritised corrections.
- Each correction includes the observed measurement, impact, cue, drill, dosage, regression/progression, and success criterion.
- Development-reference criteria matched to the supplied age band and level, without invented percentiles.
- Print/save-PDF and copy-practice-plan controls.
- Dashboard sessions link directly to actionable reports and clearly show withheld-score states.

## Automated quality gates run for this package

- TypeScript: `npm run typecheck`
- ESLint: `npm run lint`
- Next.js production build: `npm run build`
- Python source compilation: `python -m compileall -q services/api`
- Determinism and movement-integrity unit tests: `npm run test:analysis`

## Remaining production blockers

The following are required before calling the engine state-of-the-art or clinically/scientifically validated:

1. A labelled, multi-angle tennis dataset covering age, level, handedness, stroke family, camera position, and occlusion.
2. A trained and calibrated RGB + skeleton action classifier with held-out confusion matrices.
3. Racket, ball, bounce, and true contact-event detection.
4. Camera calibration and multi-view or validated monocular 3D reconstruction.
5. Metric validation against marker-based motion capture and force-plate data.
6. Inter-rater comparison with accredited elite coaches and biomechanists.
7. A consented, quality-controlled cohort before any age-group percentile.
8. An asynchronous production queue, retry policy, observability, and load testing.
9. Sport-specific evaluation packs before enabling automatic classification outside tennis.

## Release principle

AceCoach should be impressive because it is **clear, evidence-linked, visual, reproducible, and honest**—not because it displays false precision. This release makes that principle enforceable in code.

## Additional v2.4 package hardening

- The upload flow is sport-aware again; it persists file size, MIME type, duration, sport, and intended movement.
- Client-side duration checks catch clips above the current 30-second processing limit before a large upload completes.
- If metadata persistence fails after storage upload, the client removes the just-uploaded object to avoid an orphan.
- Video deletion removes the private storage object and the owned database row; analysis records cascade through foreign keys.
- The video downloader disables automatic redirects and re-validates every redirect destination against HTTPS, host, DNS, and network-address rules.
- The numeric runtime (Python, NumPy, OpenCV, MediaPipe, operating system/architecture) is stored in the engine manifest and included in the analysis fingerprint.
- The analysis container now uses Python 3.12, a non-root user, one worker, and an explicit health check.
- The Docker build excludes secrets, generated assets, virtual environments, and caches.

## Dependency audit note

The local `npm audit --omit=dev` check reported two moderate transitive findings and no high or critical findings. The attempted automated resolution was blocked by the package mirror available in this build environment, not by a source-code conflict. Re-run `npm audit --omit=dev` against the public npm registry before any production deployment and assess framework upgrades in a dedicated compatibility branch.
