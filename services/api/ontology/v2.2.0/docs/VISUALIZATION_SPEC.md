# AceCoach Technical Visualization Specification v2.2.0

This is the spec the rendering engine applies frame-by-frame to an uploaded video. It sits on top of `config/visual_grammar.json` (machine-readable tokens) and `config/overlay_recipes.json` (which markers appear together for which purpose). This document explains *why* each rule exists, so a future engineer or reviewer doesn't strip out a rule that looks like decoration but is actually doing safety or accessibility work.

## 1. Design principles, in priority order

1. **Never obscure the player or the ball.** If a choice trades clarity of annotation against visibility of the actual movement, the movement wins. This is a hard constraint, not a preference — it's in the v2.1.0 red-team checklist already; this spec makes it enforceable with actual geometry rules (arrow curvature, z-order, opacity floors) instead of leaving it as an aspiration.
2. **One idea at a time in player mode.** A 13-year-old and a 45-year-old club player have the same cognitive constraint here: nobody improves a stroke by being shown eleven angle measurements simultaneously. `scoring_profiles.json` already caps player-facing faults at 1 primary + 2 secondary; this spec extends that discipline to the overlay itself (`max_simultaneous_annotation_arrows: 2` in visual_grammar.json).
3. **Coach mode trades simplicity for auditability.** A coach's job is to check the AI's work, not to be protected from complexity. Coach mode shows the full skeleton, every angle, every confidence score, and the raw evidence frames. This is the deliberate inverse of player mode, not a "more info" toggle on the same view — see Section 4.
4. **Uncertainty is always visible, never hidden or hard-coded away.** A dashed line and a "~" aren't cosmetic — they are the product's honesty mechanism. Removing them to make the overlay "look cleaner" is a regression, not a UI improvement.
5. **The visual language is a shared language between player and coach, not two unrelated skins.** A coach who has only ever seen COACH_TECHNICAL should still recognize FAULT_PIN and CORRECTION_ARROW when they open a player's shared session — same color, same icon, same meaning, just fewer of them.

## 2. Coordinate systems

- **Video-space (normalized):** all body/racket/ball markers are positioned in `[0,1] × [0,1]` normalized frame coordinates, derived from the pose/object detector, then scaled to the actual render surface at draw time. This is what makes the same observation renderable identically on a phone, tablet, or coach-web dashboard.
- **Court-space (homography-corrected):** when `COURT_HOMOGRAPHY` calibration confidence clears its threshold, `PLAYER_COURT_POSITION`, `RECOVERY_TARGET`, and footwork markers are additionally available in real-world court coordinates (meters from baseline/centerline), which is what powers court-position and recovery-distance metrics. Below threshold, these markers are suppressed rather than shown with a guessed, skewed homography — a skewed court grid is worse than no court grid, because it looks authoritative while being wrong.
- **Screen-space (UI chrome):** `CONFIDENCE_BADGE`, `VISIBILITY_WARNING`, labels, captions, and all control chrome live in a fixed screen-space layer that never rotates, scales, or moves with the video content. This is both a usability rule (a badge that tilts with the camera angle is unreadable) and an accessibility rule (screen-reader focus order needs a stable layer to traverse).

## 3. Color, geometry, timing — see `visual_grammar.json`

The full token table (hex values, opacity, line styles, z-order, marker-family geometry, animation timing) is defined machine-readably in `config/visual_grammar.json` so the rendering engine consumes exact values rather than re-deriving them from prose. Three decisions are worth calling out explicitly because they were deliberate departures from the obvious default:

- **No red/green pass-fail coding, anywhere.** The obvious design is red = fault, green = good. We rejected it. A 13-year-old's very first frame of feedback should not look like a report card marked in red pen. Fault focus uses **Focus Coral** with a pin icon (not an X, not an exclamation mark); the target/correction uses **Target Violet** with a flag icon. The tone is "here's where to look" and "here's where you're headed," not "wrong" and "right."
- **Confidence is triple-coded.** Opacity + line style (solid/dashed/dotted) + an explicit text badge. This is what makes the honesty mechanism from Section 1 actually work for colorblind users (~1 in 12 men) and in bright outdoor phone glare, where subtle opacity differences alone disappear.
- **Everything scales as a percentage of the video, with a floor.** A skeleton rendered in fixed pixels looks great on the 4K sample video and vanishes on a compressed 480p upload filmed from the far end of a court — which, realistically, is a large share of real uploads. Percentage-of-frame sizing with an absolute-pixel floor (Section 8 of `visual_grammar.json`) keeps the overlay legible across that whole range.

## 4. Player mode vs. coach mode: two different products, one shared vocabulary

| | **Player mode** | **Coach mode** |
|---|---|---|
| Layers shown | `PLAYER_DEFAULT` recipe: stroke label, phase label, CONTACT_POINT, FAULT_PIN, CORRECTION_ARROW, CONFIDENCE_BADGE | `COACH_TECHNICAL` recipe: full skeleton, all joint angles, all racket/ball tracking, sequencing, confidence badges |
| Max simultaneous faults | 1 | 3 |
| Language | Player message, grade-6 reading level, ≤12 words, one imperative verb (see `accessibility.json`) | Coach message template with evidence summary, technical vocabulary permitted |
| Numbers shown | None by default — the "why" (raw angles, timing deltas) is available behind a tap, not on by default | All observed_metrics, confidence dimensions, evidence frame indices |
| Playback | Normal / 0.35x / contact freeze / clean replay (no overlay) | Above, plus frame-step, evidence-frame filmstrip, side-by-side reference-range chart |
| Correction affordance | "This looks different than usual — did I get that right?" (player label correction) | Full override: confirm / correct / dismiss / override with reason, per `analysis-contract.yaml` corrections endpoint |
| Opens with | The one genuine strength observed this session (`start_with_strength`) | Same strength-first framing, plus the full report underneath |

The **same fault, same colors, same icons** appear in both — a coach opening a shared player session recognizes the vocabulary instantly. What changes is density and vocabulary, not the visual grammar itself. This is what makes the product legible to "a 13-year-old and a coach, equally," per the brief: not by dumbing down the coach view or overloading the player view, but by having one grammar with two legitimate zoom levels.

### 4.1 Player mode screen flow

1. **Clean replay** of the stroke, no overlay, so the player first sees themselves rather than a diagram.
2. **Contact freeze**: the engine holds 400ms on `G6`/`S7`/`V5`/`O5` (contact phase) with a 1.05x soft zoom and a pulsing `CONTACT_POINT` ring — this is the single moment most players intuitively understand, and it anchors everything else.
3. **One strength callout** appears first (text + a matching marker, e.g. a clean `SHOULDER_LINE` if unit-turn timing was good).
4. **One fault pin** fades in (180ms ease-out) with its `CORRECTION_ARROW`, plain-language message, and confidence badge if not high-confidence.
5. **"Why?" (optional, collapsed by default)** expands to show the one or two measurements behind the message, translated into plain language, not raw units.
6. **Drill CTA** with the matching `drill_id`, and — new in v2.2.0 — a **progress strip** if this fault was reassessed from a prior session (see `longitudinal_model.json`).

### 4.2 Coach mode screen flow

1. **Evidence-first layout**: video with full `COACH_TECHNICAL` overlay, phase timeline scrubber with confidence sparkline beneath it, evidence-frame filmstrip alongside.
2. **Category scorecard** (`scoring_profiles.json` categories) with a reference-range band from `coach_reference_ranges`, filtered to the player's `technique_family` and `context_filter` — never a bare number without the comparison band that gives it meaning.
3. **Full fault list**, not capped at 3, sortable by priority (`performance_impact * recurrence * interpretation_confidence * addressability * player_readiness`), each expandable to its own evidence frames and confidence dimensions.
4. **Override controls** inline on every observation.
5. **Session and export tools**: PDF export (for handing to a player or parent), reanalysis trigger with explicit version tuple, longitudinal trend view.

## 5. The phase timeline scrubber

A horizontal filmstrip beneath the video, one chip per phase code (`G0`–`G9`, `S0`–`S10`, `V0`–`V7`, `O0`–`O7` per `phases.json`).

- Chips use **structure-neutral** styling by default; the phase(s) implicated in the active fault's `phase_origin`→`phase_visible_effect` range are highlighted in **cause_amber** (origin) fading to **focus_coral** (visible effect), so the scrubber itself teaches the "cause happens earlier than the symptom you can see" idea from the ontology's own root-cause discipline — visually, without needing the coach vocabulary to explain it.
- Tap-to-seek on any chip. Coach mode adds a thin confidence sparkline under the filmstrip (per-frame pose-detection confidence), so a coach can see at a glance which stretch of the clip is shaky data before trusting a measurement from it.
- Contact phase gets a small notch marker, always, regardless of which fault is active — it's the one landmark every stroke shares.

## 6. Comparison and "ghost" overlays

- **Self-comparison ("past you")**: `TARGET_GHOST` renders the player's own better-performing repetition (same session or a past session) as a translucent dashed white silhouette overlaid on the current attempt. This is the primary comparison mode, and the only one enabled by default for minor accounts, consistent with `longitudinal_model.json`'s "compare to self first."
- **Generic reference silhouette**: an anonymized, non-named reference movement pattern for the target technique family (e.g. "semiwestern forehand — good hip-shoulder separation") — never a real named professional player's likeness or footage. This avoids both a likeness/IP problem and an unrealistic, discouraging comparison for a beginner.
- **Side-by-side vs. overlay-blend**: side-by-side (two panels) is the default because overlay-blend of two different bodies moving at slightly different tempos is visually noisy and can misread as "your body is wrong," which is not the message we want to send. Overlay-blend is available as an explicit coach-mode toggle for cases where exact timing alignment adds real value (e.g. comparing the same player's serve toss height across two sessions).

## 7. Frame-by-frame application algorithm (engine pseudocode)

```
for each frame f in source_video:
    pose = pose_estimator(f)                       # keypoints + per-keypoint confidence
    objects = object_tracker(f)                     # ball, racket keypoints + confidence
    smoothed = temporal_filter(pose, objects, window=5)   # reduces jitter without lag that misses contact

    active_phase = phase_classifier(smoothed, stroke_context)
    active_recipe = overlay_recipes[current_mode]    # PLAYER_DEFAULT | COACH_TECHNICAL | etc.

    for marker in active_recipe.layers:
        family = visual_grammar.marker_families[lookup_family(marker)]
        conf = confidence_for(marker, smoothed, observation_confidence)

        if conf.status in [NOT_VISIBLE, NOT_SUPPORTED_BY_VIEW]:
            suppress(marker)                         # never render a broken/guessed marker
            enqueue_once(VISIBILITY_WARNING)
            continue

        style = visual_grammar.confidence_rendering[conf.band]   # solid/dashed/dotted + opacity
        geometry = family.geometry                    # % of frame, floors applied
        position = project_to_video_space(marker, smoothed, objects, homography_if_available)

        if position.occluded_this_frame:
            fade_out(marker, duration=2 frames)        # never snap or jitter across occlusion
        else:
            draw(marker, position, style, geometry, z=family.z_layer)

    if active_phase in contact_phases:
        hold_freeze(duration=400ms, zoom=1.05)
        pulse(CONTACT_POINT)

    render_screen_space_chrome(active_recipe, conf_summary)   # badges, labels — always upright
```

Key properties this enforces, tying back to `RED_TEAM.md`:

- **A marker is never drawn from a guess presented as a fact.** Below-threshold confidence changes line style and opacity; below-support markers are suppressed and explained via `VISIBILITY_WARNING`, never silently rendered as if measured.
- **The overlay degrades gracefully with camera quality**, per `camera_suitability.json` — a side-view session simply shows fewer/greyer markers for `lateral_spacing`-dependent faults rather than fabricating a confident-looking marker.
- **Occlusion never produces a jump-cut marker.** A 2-frame fade is worth the minor smoothing cost versus a marker that snaps or flickers, which reads as a bug and erodes trust in every other marker on screen.

## 8. Mobile and low-bandwidth constraints

- Player mode is designed mobile-first: single-column, thumb-reachable controls in the bottom 60% of viewport (`accessibility.json` motor accessibility), 44px minimum touch targets.
- Overlay rendering is resolution-independent (Section 3) specifically because a large share of real uploads will be handheld phone video at variable quality, not tripod-mounted 4K.
- For low-bandwidth conditions, the engine ships a **markers-only mode**: the overlay (which is vector data, not pixels) can render over a low-res or even a placeholder video frame while the full-quality video streams in progressively, so feedback isn't blocked on a slow upload/transcode.

## 9. Accessibility hooks (full detail in `config/accessibility.json`)

- Reduced-motion mode swaps animated arrow-growth and pulsing halos for static end-states.
- Every marker family has a redundant non-color signal (line style, icon shape).
- Auto-generated alt-text per observation for screen readers: `"{stroke_name}, {phase_name}. {player_message}. {confidence.language_string}."`
- Font scaling to 200% is tested against the 35% string-expansion budget for non-English locales so Hindi/Marathi labels don't clip.

## 10. What this spec deliberately does *not* do

- It does not attempt pixel-level "form perfection" scoring against a single ideal pose — biomechanics has a movement envelope, not one correct shape, and the ontology's `technique_families`/`ACCEPTABLE_VARIATION` status already encodes that; the visualization layer must not silently reintroduce a single "correct" silhouette as an implicit visual judgment.
- It does not render any medical/injury overlay (e.g., highlighting a "vulnerable" joint) — see `safeguarding.json` language boundary.
- It does not use a real named professional player's video or likeness as the ghost/reference overlay.
