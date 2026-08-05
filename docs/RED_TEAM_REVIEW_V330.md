# Internal Red-Team Review — AceCoach AI v3.3.0

## Scope

Internal adversarial review of the three-level visual comparison and body-map upgrade.

This is not an independent penetration test, copyright opinion, governing-body certification, or biomechanics-laboratory validation.

## Findings and mitigations

### RT-330-01 — Category reference could be mistaken for a true peer cohort

**Risk:** High. A player may interpret a development video as a statistically matched age-group benchmark.

**Mitigation:** The UI uses the terms `category coaching lens` and `criterion-based`. It explicitly states that the comparison is not an age percentile. The athlete profile selects the teaching lens, not a numerical cohort distribution.

### RT-330-02 — Elite exemplar could encourage copying one professional silhouette

**Risk:** High. Body dimensions, grips, stances, incoming balls, and tactical intent differ.

**Mitigation:** Every checkpoint separates the organizing principle from the individual shape. The report contains a prominent `what not to copy blindly` panel. No elite score is generated.

### RT-330-03 — Wrong backhand family could be shown

**Risk:** High.

**Mitigation:** Elite references are action-specific. One-handed and two-handed backhands select separate references after movement confirmation.

### RT-330-04 — External video disappears or embedding is disabled

**Risk:** Medium.

**Mitigation:** The component fails closed with an explicit source-link card. It does not substitute another sport or movement.

### RT-330-05 — Third-party media rights and redistribution

**Risk:** Medium.

**Mitigation:** Videos are embedded from the public publisher using `youtube-nocookie.com`. AceCoach does not download or rehost them. Source attribution and media-boundary notes are visible.

### RT-330-06 — Three videos create visual overload

**Risk:** Medium.

**Mitigation:** The experience uses one active checkpoint at a time, short text, a clear numbered sequence, and stacked mobile behavior. Technical analytics remain below the coaching-first view.

### RT-330-07 — Bandwidth and mobile performance

**Risk:** Medium.

**Mitigation:** YouTube iframes are lazy-loaded, do not autoplay, and the layout is responsive. A future release should replace simultaneous embeds with thumbnail-to-load behavior for low-bandwidth users.

### RT-330-08 — Body map may imply direct anatomical measurement

**Risk:** Medium.

**Mitigation:** The component states that zones group 2D pose proxies into coaching areas. It does not claim force, joint loading, muscle activation, or clinical assessment.

### RT-330-09 — Missing athlete profile

**Risk:** Low.

**Mitigation:** The reference selector falls back to an `Open age · Development level` lens rather than fabricating profile data.

### RT-330-10 — Accessibility

**Risk:** Medium.

**Mitigation:** Video panels retain native controls, the body map has an accessible SVG label, source links are explicit, and checkpoint controls are buttons. External caption availability remains controlled by the publisher.

## Validation

- TypeScript typecheck: passed
- ESLint: passed
- Next.js production build: passed
- Python deterministic/security tests: 16 passed
- npm audit: 0 critical, 0 high, 2 moderate findings
- No database migration required

## Remaining gaps

- No phase-synchronized control of external reference videos
- No calibrated ghost overlay
- No body-dimension normalization
- No validated age-group percentile dataset
- No rights-cleared elite reference pack for every sport and movement
- No racket, bat, ball, or shuttle tracking
