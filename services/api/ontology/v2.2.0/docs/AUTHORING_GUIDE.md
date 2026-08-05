# Ontology authoring guide

A new fault definition must answer:

1. What is directly measured?
2. What is inferred?
3. In which phase does the likely cause begin?
4. In which phase does the visible symptom appear?
5. Which context gates must pass?
6. Which valid variations must be excluded?
7. Which camera views support it?
8. What evidence is required?
9. When must scoring be withheld?
10. What simple player message is approved?
11. What coach detail is approved?
12. Which overlay recipe shows it clearly?
13. Which drill targets the likely root cause?
14. What reassessment metric proves progress?

Never add a rule based only on a professional player’s appearance. Use a movement envelope and coach-approved variation families.

## Added checks, v2.2.0

Every new or edited fault must also pass:

15. Does `player_message` stay at or under grade-6 reading level and 12 words, with no term from `accessibility.json`'s banned-jargon list? (Put the technical language in `coach_message_template` instead.)
16. Does the title or any message avoid medical/injury/diagnostic language, per `safeguarding.json` `language_and_diagnosis_boundary`? Describe the movement, not the anatomy.
17. Should any `context_gates` entry reference `context_model.json` fields (age_band, player_level, adaptive_play) that didn't exist before v2.2.0? Most faults authored before v2.2.0 still have empty `context_gates` — revisit them opportunistically, not as a blocking migration.
18. Which `visual_grammar.json` color token and marker family does each `overlay_markers` entry resolve to? (Run `bundle.color_token_for_marker(...)` — it raises on an unmapped marker, which is your check.)
19. If this fault could plausibly apply to an adaptive-play player (wheelchair tennis, visual-impairment-adapted), does it degrade to `CONTEXT_DEPENDENT` rather than `FAULT_SUSPECTED` when `adaptive_play` is set, per `context_model.json`?
