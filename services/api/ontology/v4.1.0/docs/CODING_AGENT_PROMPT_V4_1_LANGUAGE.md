# Coding Agent Prompt — Integrate v4.1 Coach Language

Integrate AceCoach v4.1 without weakening the v4 perceptual-causal pipeline.

## Required sequence

1. Run video analysis and insight ranking exactly as before.
2. Select one primary correction.
3. Build semantic language slots from evidence: `root_cause`, `not_problem`, `strength_to_protect`, `movement_consequence`, `ball_consequence`, `visual_anchor`, `cue`, `practice_constraint`, `success_signal`.
4. Load `stroke_coach_lexicon.json` using the classified stroke family.
5. Generate `PLAYER_COACH` copy using `coaching_language.json` + `coach_storytelling.json`.
6. Lint with `natural_language_quality_gates.json` and reject/rewrite failures.
7. Compile visual beats and captions using the same semantic slots; never allow narration and visual evidence to diverge.
8. Store evidence IDs and comparison basis with every diagnostic claim.
9. Expose the COACH_ANALYST layer only through progressive disclosure.

## Do not

- ask an LLM to infer new biomechanics while writing copy;
- copy wording from YouTube sources;
- imitate a named coach;
- display raw metrics in the main player card;
- show multiple corrections in one primary story;
- use a full skeleton by default;
- allow a visual caption to assert something the overlay does not prove.
