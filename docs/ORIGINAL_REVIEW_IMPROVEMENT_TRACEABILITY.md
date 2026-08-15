# Original review improvement traceability

This ledger tracks every concrete improvement requested in the two review documents supplied to Codex:

1. `/Users/rahulk/.codex/attachments/5362f8a6-bdad-4949-8311-d9c6c99667e9/pasted-text.txt`
2. `/Users/rahulk/.codex/attachments/a519699c-2595-4ee9-8f54-7e3a39771625/pasted-text.txt`

Status meanings: **Complete** is implemented and verified; **Manual inspection pending** requires an unavailable UI control surface rather than additional code.

| ID | Original recommendation | Status | Implementation evidence |
|---|---|---|---|
| R1 | Remove ambiguity between the active insight formula and legacy `scoring_profiles.json` formula | Complete | Config-driven weights in `insight_reasoner.json`; legacy scoring and visualization configs removed from the runtime bundle and repository |
| R2 | Add intentional visual stories for `PROGRESS_SHIFT` and `LIMITATION` | Complete | `TREND_ARC` and `TRANSPARENT_LIMITATION` in `visual_story_compiler.json`; unknown archetypes fail closed |
| R3 | Build a real interactive visual-story prototype using keypoint data and pose-noise handling | Complete; manual inspection pending | Interactive six-beat canvas prototype, versioned keypoint fixture, noise/confidence controls, structural and HTTP-loading tests |
| R4 | Add a cross-stroke shared-root construct | Complete live | `cross_stroke_constructs.json`, reducer, `SHARED_ROOT_MAP`, migration 027, Progress UI; live RPC exercised inside rollback transaction |
| R5 | Add conservative injury/load-pattern signaling without medical diagnosis | Complete | Practice-log policy and reducer; high-effort volume-spike UI; medical and joint-load claims blocked |
| R6 | Add a synchronized dual-camera path that can relax only specific metric gates | Complete contract; capture UI not enabled | Fusion config, shared-event synchronizer, tracker-specific metric gates, fail-closed tests |
| R7 | Decide and define the tactical/point-construction boundary | Complete gated companion | Tactical event graph and deterministic ball/outcome/sample gates; remains dormant without validated tracking |
| R8 | Add a mobile/viewport rendering contract | Complete | `mobile_viewport_contract` in `visual_story_compiler.json` |
| R9 | Persist cross-session development state instead of reconstructing it | Complete live | `player_development_state`, session distributions, and cue history in migration 026; idempotency exercised against live Postgres |
| R10 | Add regression/plateau reasoning symmetric with progress | Complete live | `REGRESSION_OR_PLATEAU`, deterministic rolling reducer, trend storyboard, and live persistence |
| R11 | Separate immediate performance from delayed retention and transfer | Complete live contract | Extended `reassessment_links` fields exist in live Postgres |
| R12 | Add multi-session visualization | Complete live | Construct median/spread chart and stable cue in Progress dashboard |
| R13 | Turn level into a reasoning strategy rather than a vocabulary switch | Complete | `level_analysis_profiles.json`, pipeline propagation, scope and confirmation gates |
| R14 | Add drill `level_adjustments` | Complete | All 108 drills include level-specific dosage and success expectations |
| R15 | Lower beginner sample floors and define a graceful fallback ladder | Complete | Beginner cluster thresholds and fallback mode in level profiles |
| R16 | Add a stopgap level-matched cohort/research strategy | Complete gated contract | Qualitative Landlinger/USTA seeds; numeric cohorts are empty and percentile claims fail closed |
| R17 | Treat skill-level transition as a longitudinal output | Complete evidence-collection contract | Eight-session/retention/transfer/validated-cohort requirements; declared level never changes automatically |

## Verification boundary

Migrations 026–029 were applied to the healthy `acecoach-ai` Supabase project on 2026-08-14. Live rollback-only exercises verified idempotent distribution/state/cue writes, shared-root activation/deactivation, ownership checks, RLS policies, RPC privileges, and supporting indexes without retaining test rows. Browser control remains unavailable in this session, so visual click-through inspection is the sole manual verification item.

## Red-team hardening follow-up — 2026-08-14

| Finding | Resolution | Evidence |
|---|---|---|
| Missing construct evidence could become an overall score or synthetic `50` | Fixed | Longitudinal distributions now fail closed unless construct, consistency, and capture measurements are finite; covered by a regression test |
| Longitudinal writes could fail without durable recovery | Fixed | Live `analysis_postprocessing_jobs` outbox records payload, attempts, retry time, and failure state; Progress offers an ownership-checked retry action |
| Public execution of privileged trigger functions | Fixed live | Anonymous and authenticated execution revoked from five `SECURITY DEFINER` trigger functions; service role retained and live privileges verified |
| Mutable trigger-function search paths | Fixed live | Four timestamp trigger functions now use an empty search path; live advisers no longer report mutable search paths |
| Progress queries silently treated failures as empty data | Fixed | Partial-data warnings distinguish load failures from genuinely empty history |
| Charts lacked equivalent accessible data | Fixed | Both progress charts now include keyboard-accessible semantic data tables |
| TypeScript tests were not runnable as one suite | Fixed | Vitest, alias resolution, and `npm test` added; 11 tests pass |
| No continuous-integration quality gate | Fixed | GitHub Actions gates web quality, Python tests, dependency audit, and a fresh Supabase reset |
| Supabase project was not initialized for local reconstruction | Fixed in repository | `supabase/config.toml` and timestamped migrations are present; fresh reset is enforced in CI |

Managed Supabase leaked-password protection still requires enabling in the project Auth dashboard because the available database/MCP interfaces do not expose that setting. Local Supabase reset could not be exercised on this workstation because Docker/Podman is not installed; the CI database job is the reproducible verification path.

## Knowledge-layer execution hardening — 2026-08-14

| Finding | Resolution | Evidence |
|---|---|---|
| The reasoner selected the first ontology fault that shared a broad chapter/domain | Fixed | Every compatible fault is now evaluated against measured metric IDs, direction, camera support, and required evidence; ambiguous candidates are rejected with `non_discriminative_evidence` |
| Pose-derived chapter scores could be presented as fault-specific evidence | Fixed | Biomechanics emits metric-level evidence records and the reasoner cites only matched records; unavailable ball, racket, contact, and court evidence fails closed |
| A causal graph and earliest-divergence policy were listed as applied without being executed | Fixed | Applied/skipped policy provenance is truthful; causal edges require measured findings at both graph nodes plus a validated self-best divergence |
| Self-best comparison lacked validated outcome labels | Fixed and gated | Earliest meaningful divergence runs only with at least two externally outcome-labelled successful and two weak repetitions; otherwise it is explicitly skipped |
| Legacy reports received synthetic ontology IDs and a fabricated trace in the UI | Fixed | Synthetic legacy trace construction was removed; old reports ask for reanalysis and evidence-gated runs can render a `NO_SUPPORTED_FAULT` state |
| Ontology selection could force a drill when no fault was supportable | Fixed | Evaluation-only traces preserve generic coaching output and do not claim ontology-derived drill linkage |

Verification: 46 analysis tests, ESLint, TypeScript, 11 web tests, and the production build pass. A non-persisting live-video run returned HTTP 200 on engine `movement-intelligence-v1.11.0` / ontology `4.1.0`, rejected 19 unsupported or non-discriminative candidates, and emitted zero findings and zero causal claims. Interactive browser control was not callable for the final rendering pass, so the existing manual inspection boundary still applies.

## Governed knowledge and validation expansion — 2026-08-15

| Requested improvement | Resolution | Evidence |
|---|---|---|
| Personal baseline first | Implemented | All reliable movement-chain constructs persist; the report releases current/typical/highest-reliable comparisons only after 3 matching prior videos and 24 repetitions |
| Sources for every stroke | Implemented | Explicit eight-stroke source registry with authority, use-policy, variation, and claim-route checks; analysis output includes source-coverage status |
| Validated matched cohorts | Implemented as a fail-closed collection/release system | Cohort/version/cell schema plus sample, context, documentation, expiry, bias, drift and withdrawal gates; no cohort or percentile is currently released |
| Outcome-labelled repetitions | Implemented as a governed ingestion/reanalysis path | Player, coach, sensor and tracker storage; only correctly paired coach/sensor/tracker verification can enter self-best reasoning |
| Ball and racket tracking | Implemented as validation gates, not simulated | Model-validation registry and required held-out/error artifacts; pose-only analysis cannot unlock ball, racket-face or exact-contact claims |
| Expert annotation studies | Implemented as a governed study contract | Independent raters, credential state, blinding, rubric, agreement and retained disagreement schema/gates |
| Longitudinal intervention validation | Implemented as a governed collection contract | Baseline/post/retention/transfer fields and deterministic release rules; uncontrolled causal claims stay prohibited |
| Benchmark governance | Implemented | Version, owner, inclusion/exclusion, coverage, uncertainty, bias, expiry and withdrawal records with RLS and service-only writes |
| Multi-camera and depth validation | Implemented as calibration/model gates | Capture calibration storage and synchronization/reprojection/held-out validation requirements; capture UI remains dormant |

The detailed operational contract is in `docs/GOVERNED_KNOWLEDGE_LAYER_V640.md`.

## Player reassessment loop — 2026-08-15

| Requested improvement | Resolution | Evidence |
|---|---|---|
| Jump from every Stroke Map phase to its video moment | Implemented | All six tiles use repetition-local stored phase timestamps first, dispatch an exact seek to CoachVision, and fall back to the report timeline only for older analyses |
| Compare the same phase with the previous matched video | Implemented, fail closed | Six-phase deltas require the same stroke, camera view, shot situation, shot intention, engine/runtime, reliability state, and comparable capture quality |
| Keep one primary correction across the three drills | Implemented | Practice-plan generation is rebuilt after ontology selection; every session stores the same selected cue and the mobile report repeats it across all three drills |
| Show ball depth, direction, clearance and placement when tracking is validated | Implemented, dormant until evidence exists | The report reads only `validated_ball_tracker` + `tracker_verified` rows and hides the entire outcome card when no qualifying outcome dimensions exist |
| Adapt cue complexity to player level | Implemented | Beginners receive only the stored feel cue, intermediate players receive one concise mechanical sentence, and advanced players receive the full stored evidence-backed correction |
| End reassessments with a clear verdict | Implemented | Context-matched score changes produce `Improved`, `Unchanged`, or `Needs another comparable recording`; first reports do not pretend to be reassessments |
