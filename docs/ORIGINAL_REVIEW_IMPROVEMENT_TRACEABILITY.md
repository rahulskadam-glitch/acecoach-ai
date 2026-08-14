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
