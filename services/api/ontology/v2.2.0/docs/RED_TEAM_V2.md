# Red-team checklist v2

The five original categories in `RED_TEAM.md` (Scientific, Coaching, UX, Safety and privacy, Engineering) remain valid and are unchanged. These four categories are additive, covering what a single-session, single-user analytics review misses.

## Context & personalization
- Is any personalization derived from context the player/guardian explicitly provided, never inferred from appearance in the video?
- Does a missing required context field correctly force `CONTEXT_DEPENDENT` and block scoring, rather than silently falling back to an adult/able-bodied default?
- If `adaptive_play` is set, are ambulatory-only faults suppressed rather than scored as failures?
- Is `age_band` fail-closed (unknown defaults to minor policy)?

## Longitudinal & motivational safety
- Is any progress claim ("improving") backed by an actual reassessment link, not just a new session's unrelated score?
- Does the product compare a minor to their own history by default, never to a ranked peer set?
- Is there any loss-framed streak mechanic ("don't break your streak") shown to a minor account? If yes, remove it.
- Does a returning player after a gap get treated the same as any other session, without gap-shaming copy?
- Is effort (sessions completed, drills done) visible as its own signal independent of whether a fault trend improved?

## Accessibility
- Does every `player_message` clear the grade-6 / ≤12-word / one-imperative-verb bar?
- Is every semantic overlay color redundantly coded by line style or icon shape?
- Does any emphasis animation exceed 3 flashes per second?
- Is there a reduced-motion path that doesn't remove information, only removes animation?
- Do UI strings tolerate 35% length expansion for non-English locales without clipping?
- Are all core interactions (playback, correction, drill start) operable without a gesture-only or time-pressured input?

## Bystander & content safety
- Has the upload passed a moderation precheck confirming it's plausibly tennis footage before entering the storage/analysis pipeline?
- Are bystanders and other identifiable minors in frame blurred by default in any shared or exported view?
- Is background audio with identifiable third-party conversation stripped from exports?
- Does any fault title, player_message, or coach_message_template cross the line into a medical/injury diagnosis? (Movement description only — see safeguarding.json language_and_diagnosis_boundary.)
- Is guardian consent scope checked (not just present) before the specific action being taken (capture vs. analysis vs. coach-sharing vs. model-improvement use)?
