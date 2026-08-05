# Internal Red-Team Review — AceCoach AI v3.4.0

This is an internal engineering, scientific-claims, and UX review. It is not an independent penetration test or biomechanics-laboratory validation.

## Risks reviewed

### False synchronization

**Risk:** Playing three unrelated videos at the same timestamp creates the appearance of synchronization without matching movement phases.

**Mitigation:** The player video is the only media clock. Reference twins are generated from the measured primary repetition's normalized phase progress.

### Overclaiming a category or elite norm

**Risk:** A silhouette may be mistaken for a validated age percentile or one ideal professional technique.

**Mitigation:** The UI labels both twins as deterministic simulations and repeatedly states that they illustrate coaching principles rather than normative joint-angle targets.

### Camera-coordinate mismatch

**Risk:** Player landmarks can misalign with the video when the container aspect ratio differs from the source.

**Mitigation:** The measured-video panel uses the source width and height stored in the report to preserve the video coordinate space.

### Left-handed errors

**Risk:** Reference paths may always follow the right wrist.

**Mitigation:** Swing-path selection uses the saved or inferred dominant side.

### Category mismatch

**Risk:** A beginner and an advanced athlete receive exactly the same category silhouette.

**Mitigation:** The category template range is adjusted conservatively by saved playing level. Age is retained as a coaching lens but is not used to invent unsupported age-specific joint angles.

### Marker credibility

**Risk:** Directional arrows could be interpreted as precise measured correction vectors.

**Mitigation:** Markers are described as coaching vectors. They do not display fabricated degree or distance gaps.

### Visual overload

**Risk:** Three panels, paths, vectors, controls, and detailed text may overwhelm the athlete.

**Mitigation:** The interface stays checkpoint-driven and shows one active phase, one active coaching area, and one principal cue at a time. Real source videos are collapsed by default.

### Missing pose data

**Risk:** The measured overlay may be blank when landmarks are unavailable.

**Mitigation:** The player video remains usable, while the report's reliability gate and capture messages remain authoritative.

### Reference-source availability

**Risk:** External videos can be unavailable, blocked, or removed.

**Mitigation:** Synchronized silhouette references are local and deterministic. External source videos are supplementary only.

## Validation gates

- TypeScript type checking
- ESLint
- deterministic Python analysis tests
- static motion-twin integrity checks
- package secret and generated-file scan
- production build attempt

## Remaining limitations

- No racket, bat, ball, or shuttle tracking
- No true camera-calibrated 3D motion comparison
- No validated population percentiles
- No independently reviewed sport-specific silhouette templates
- Directional markers are coaching heuristics, not laboratory measurements
