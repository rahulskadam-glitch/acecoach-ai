# AceCoach Product, UX & Governance Specification v2.2.0

v2.1.0 solved the hardest analytics problem well: separating detection from interpretation from coaching, with a real confidence/no-score discipline. What it didn't yet have was a model of *who* is being coached, *how* the experience differs for a player versus a coach, *whether the player is getting better over time*, *who else needs protecting in the frame*, and *whether a 13-year-old and a 45-year-old club coach can both actually use it*. This spec closes those gaps. It is additive — nothing in v2.1.0's fault ontology, confidence policy, or scoring changes.

## 1. Context model (`config/context_model.json`)

**The gap:** `analysis-result.schema.json` had no player-context object at all. Every `context_gates` array in every fault file in `config/faults/*.json` was empty (`"context_gates": []`) — the hook existed in the schema but nothing populated it, because there was no source of context to gate on.

**The fix:** a two-tier context capture — `player_profile` (once, editable) and `session_context` (confirmed per upload). Age band, player level, dominant hand, and camera setup are now required inputs before a session can be analyzed. This does three things:

1. Lets fault definitions actually use their `context_gates` field — e.g., a `western_bent` forehand's higher contact point is expected, not a fault, only if `technique_family` context is known.
2. Sets the age-appropriate policy trigger. `age_band` is the single field that switches on the entire minor-safeguarding profile (Section 5) — deliberately fail-closed: unknown age defaults to the minor policy, not the adult one.
3. Feeds personalization without ever inferring sensitive attributes from the video itself. Age, gender, and body type are explicitly excluded from anything the vision pipeline is allowed to infer (`context_model.json#/explicitly_excluded_from_context`) — self-report only.

## 2. Sharper observation/diagnosis separation

v2.1.0 already had the right three-way split (measurement → interpretation → coaching) and a real `status` enum (`MEASURED`, `ESTIMATED`, `INFERRED`, `FAULT_SUSPECTED`, `FAULT_CONFIRMED`, etc.) in `observation.schema.json`. Two refinements:

- **`no_score_when` must be honored at render time, not just at scoring time.** The original risk: a fault could correctly be excluded from the numeric score while its overlay marker still rendered confidently on screen, silently contradicting the "missing evidence is not zero" policy. `visual_grammar.json`'s confidence-rendering table makes this the engine's job, not a documentation aspiration — `NOT_VISIBLE`/`NOT_SUPPORTED_BY_VIEW` markers are suppressed from the video layer entirely and only surface as a `VISIBILITY_WARNING` chip.
- **`PROJECTED_BALL_PATH` and other physics-estimate markers now have a mandatory "estimate" visual style regardless of their component confidence scores** — a projection is categorically different from a measurement even when the projection math is confident, and the ontology's own philosophy (measurement vs. interpretation) should extend to "measurement vs. simulation," which v2.1.0 didn't yet distinguish.

## 3. Dual player/coach experience

Detailed screen-by-screen in `VISUALIZATION_SPEC.md` Section 4. The product principle: **one visual grammar, two legitimate zoom levels** — not two different products wearing the same logo. A coach opening a player's shared session should recognize every marker; a player should never be shown a marker whose meaning requires training to decode.

New this version: a **player label-correction loop** and **coach override loop** were already specified in the API contract (`/corrections` endpoint) but had no UI description. Section 4.1/4.2 of the visualization spec now define exactly where these live in the flow (a light-touch "did I get that right?" for players vs. full evidence-based override for coaches) so the corrections endpoint isn't an orphaned API with no front-end path.

## 4. Longitudinal learning (`config/longitudinal_model.json`)

**The gap:** every session was scored in isolation. There was no schema field for "you used to do this on 8 of 10 strokes, now it's 3 of 10." For a consumer product this is close to existential — the entire reason a player opens the app a second time is to see whether last week's drill worked.

**The fix, in brief:**
- A rolling recurrence-rate trend per `fault_id`, computed only over sessions where that fault was actually scoreable (never penalizing a trend for a session where the camera angle couldn't measure it).
- `reassessment_linkage`, which is the connective tissue between a `drill.reassessment` instruction and the next comparable-view session — this is what lets the product truthfully say "fixed" instead of just showing a new, unrelated score.
- Explicit **motivation-design rules that avoid dark patterns for minors**: no loss-framed streaks, no leaderboard/ranking by default, compare-to-self before compare-to-peer, and effort (sessions logged, drills completed) is shown as its own signal so a technical plateau doesn't read as "I'm not improving as a person" to a young player. This is a place where a naive "engagement-maximizing" design and a "good for a 13-year-old" design actively diverge, and the spec picks the latter explicitly.

## 5. Safeguarding and privacy (`config/safeguarding.json`)

This is the section that most needed to exist before AceCoach could responsibly claim to serve junior players. Three separate problems were bundled into one and needed separating:

1. **The primary subject is often a minor.** Guardian consent (granular: capture, analysis, coach-sharing, model-improvement opt-in — each separately toggled, model-improvement defaulting OFF) is now required before first upload, not an afterthought. Consent scope is per-purpose, not blanket, and re-triggers on material ontology/data-use changes rather than surviving silently across versions.
2. **Bystanders are not the primary subject and didn't consent to anything.** A tennis court is a semi-public space; a video filmed for stroke analysis will often catch other players, kids on adjacent courts, or a parent in the background. `safeguarding.json` adds a bystander-detection-and-blur step that runs before any frame is shown to anyone other than the account holder, and before any export.
3. **Content moderation of the upload itself was entirely absent.** Nothing in v2.1.0 checked that an uploaded video was tennis footage before it entered a storage and analysis pipeline. This is both a trust-and-safety gap (a pipeline that will process and store *any* uploaded video without a precheck is a real-world liability) and a UX gap (a confusing "no faults found" result for someone who uploaded the wrong file is a bad first experience). The precheck fails soft for benign misclassification and hard-blocks with a safety-review queue entry for anything resembling CSAM/NCII — a bright line, not a judgment call left to the model.

The `language_and_diagnosis_boundary` rule is worth calling out on its own: nothing in the ontology may claim to diagnose an injury or medical condition. `FH-*` fault titles like "late unit turn" describe movement, not anatomy. This was mostly already true in the fault definitions we reviewed, but it wasn't written down as an enforceable rule anywhere, which meant a future contributor adding fault #110 had no guardrail against writing "your elbow is unstable" as a title.

*(Note: this file is explicitly framed as a design input, not a legal sign-off. India's DPDP Act 2023 and equivalents elsewhere need actual counsel review before launch — the spec is built to make that review easy, not to replace it.)*

## 6. Accessibility (`config/accessibility.json`)

Three accessibility dimensions were entirely unaddressed in v2.1.0, and each maps directly to the "13-year-old and a coach, equally" brief:

- **Reading level as an enforced constraint, not a style guide.** `player_message` is capped at grade-6 reading level, ≤12 words, one imperative verb, with a banned-jargon list. This is the actual mechanism behind "can a 13-year-old understand this" — not a hope, a rule an author or a linter can check a new fault definition against (see the updated `AUTHORING_GUIDE.md` checklist item).
- **Color-vision and photosensitivity.** No signal is color-only; everything is redundantly coded by line style and icon shape. A hard 3-flashes-per-second ceiling is set, which matters concretely here because "contact freeze" and "fault pin" emphasis effects are exactly the kind of thing a well-meaning animator adds a pulsing glow to without checking the seizure-safety implication.
- **Motor and cognitive accessibility**, and **localization as a first-class constraint** rather than an afterthought — every player-facing string is externalized with a 35% expansion budget, which matters immediately given AceCoach's likely early markets (Hindi/Marathi alongside English).

## 7. Production validation rigor

`MIGRATION.md` already lays out a sound *process* (shadow mode → calibration → release thresholds → versioned reanalysis). What it didn't yet specify is the *statistical bar* each fault must clear before it's allowed to move from shadow to player-visible. Recommended additions to the calibration step, for the engineering team to formalize as pass/fail gates rather than qualitative review:

- **Inter-rater reliability among the "minimum 2 qualified coach reviewers"** — a target such as Cohen's kappa ≥ 0.7 on fault presence/absence before that fault is eligible for player-visible status. Below that, the fault definition itself is ambiguous and needs rewriting, not just more reviewer training.
- **Equity/bias testing across body types, playing styles, and both self-reported genders** in the calibration sample — a monocular pose-estimation pipeline trained predominantly on adult, able-bodied, one demographic's footage is a well-documented failure mode (differential keypoint accuracy across body types and skin tones is a known issue in pose estimation literature); the calibration sample composition should be an explicit, checked target, not incidental.
- **An explicit false-positive *rate* budget per fault**, not just a qualitative "false-positive review" step — e.g., no fault ships player-visible above a defined false-positive rate on the held-out calibration set, revisited every time `ruleset_version` changes.
- **A defined human-escalation path** for when the model's own confidence disagrees sharply with a coach override pattern at scale (i.e., a fault gets overridden by real coaches often enough that it should be pulled back to shadow mode automatically, not left live until someone notices).

## 8. Schema and API additions

- `schemas/analysis-result.schema.json`: adds `context` (player/session context snapshot) and `progress_summary` (longitudinal trend) objects — see inline diffs in that file.
- `schemas/player_profile.schema.json`, `schemas/consent.schema.json` (new): formalize the objects `context_model.json` and `safeguarding.json` describe in prose.
- `sql/002_context_safeguarding_longitudinal.sql` (new migration): `player_profiles`, `guardian_consent`, `session_context`, `progress_trends`, `content_moderation_log`, `bystander_redaction_log`.
- `api/context-and-safety-contract.yaml` (new): player-profile CRUD, consent recording, moderation precheck, and progress endpoints that v2.1.0's contract had no surface for.

## 9. Updated red-team checklist

`docs/RED_TEAM.md` gains four new sections in `docs/RED_TEAM_V2.md`: **Context & Personalization**, **Longitudinal & Motivational Safety**, **Accessibility**, and **Bystander & Content Safety** — alongside the original Scientific / Coaching / UX / Safety-and-privacy / Engineering sections, which remain valid and unchanged.

## 10. Explicit non-goals (kept out on purpose)

To avoid scope creep turning this into a different product:

- No gamified competitive ranking against other players, ever, for minor accounts.
- No automatic social sharing of a minor's video or skeleton overlay.
- No medical or injury diagnosis, at any confidence level.
- No comparison overlay against a real named professional's actual footage or likeness.
- No "form perfection score" against a single ideal silhouette — the ontology's technique-family and acceptable-variation model stays authoritative over the visualization layer, not the other way around.
