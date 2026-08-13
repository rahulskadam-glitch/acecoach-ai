# AceCoach v4.1 — World-Class Coach Language & Storytelling Engine

## Why this layer exists

A technically correct diagnosis can still feel artificial if the report sounds like a laboratory. AceCoach therefore separates **semantic truth** from **player expression**.

The video engine produces evidence and a causal hypothesis. The language engine is not allowed to change that hypothesis. Its job is to express the same truth the way an excellent tennis coach would explain it during video review: quickly, specifically, in tennis language, and with a clear next rep.

## The two voices

### PLAYER_COACH (default)

The player hears this voice. It uses time, space, contact, rhythm, shape, ball outcome and recovery. It can say:

> Your turn is on time. The space disappears after it.

It should not say:

> Lateral contact offset is below the self-best distribution and produces a compensatory racket-path deviation.

### COACH_ANALYST (expandable)

This layer may show evidence counts, timing intervals, normalized distances, confidence, alternative hypotheses and research provenance.

Both voices must point to the same evidence IDs.

## The coach story

Every primary correction is rendered as:

1. **Coach's read** — what the real problem is.
2. **Keep** — a strength that must survive the correction, when supported.
3. **Change** — the one thing to alter.
4. **Why** — cause -> consequence -> ball.
5. **Feel** — one cue, normally nine words or fewer.
6. **Watch** — the one visual proof in the replay.
7. **Train** — a constrained set of reps.
8. **When it's working** — what success looks or feels like.

This sequence mirrors how high-level live coaching tends to work: diagnose, demonstrate/contrast, simplify, rehearse, verify.

## Source use

The v4.1 language corpus was curated from credentialed coach/instructional sources including Patrick Mouratoglou, Rick Macci, Nikola Aracic / Intuitive Tennis, and Simon Konov / Top Tennis Training, covering all AceCoach stroke families. The system stores only metadata and abstracted teaching patterns. It does **not** copy transcripts or imitate any named coach.

## Naturalness rules

- Speak to **you**, never “the player,” in the player report.
- Prefer a spoken sentence to a dashboard noun phrase.
- Use a number only when it helps the player trust the conclusion.
- No generic praise.
- No universal “perfect” positions.
- No multiple active cues.
- No jargon such as “metric deviation,” “causal graph,” “pose confidence,” or “kinematic anomaly” in the primary report.
- Use contractions naturally.
- Make the visual caption sound like a coach pausing the video: “Space disappears here.”
- End with a clean replay and one cue.

## Visual storytelling contract

The caption is part of the coaching, not a label for the graphics. A strong sequence sounds like:

- **The turn is on time.**
- **The last step closes the space.**
- **Your hands get jammed.**
- **The swing has to rescue it.**
- **Keep adjusting one step longer.**

Each caption must correspond to something visibly shown in that beat. If the caption cannot be proven by the frame sequence, the caption or the visual must change.

## Stroke-specific language

`config/stroke_coach_lexicon.json` defines the vocabulary, consequences and cue families for all ten stroke families. This prevents the app from speaking about a return like a rally forehand, a half-volley like a groundstroke, or an overhead like a stationary serve.

## Quality gates

`config/natural_language_quality_gates.json` rejects:

- generic AI prose,
- unsupported praise,
- analyst jargon in player mode,
- multiple cues,
- false precision,
- captions that do not match the visuals,
- copied/distinctive source language,
- diagnoses that could apply to any stroke.

## Implementation principle

The LLM does **not** receive a blank prompt asking it to “coach the player.” It receives a structured, evidence-grounded semantic object containing the root cause, strength, consequence, visual anchor, correction, cue family, drill constraint and success signal. It may vary phrasing inside the v4.1 coach-language rules, but it may not change the coaching truth.
