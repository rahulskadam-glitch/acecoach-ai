# AceCoach AI v3.3.0 — Three-Level Visual Benchmark Lab

## Objective

Make the report immediately understandable through visual comparison rather than adding more technical text.

## Major changes

### Three-level side-by-side comparison

The report now displays:

1. The athlete's uploaded video
2. A category coaching reference selected using saved age band, playing level, and dominant side
3. A best-in-class visual exemplar when a movement-matched public reference has been curated

The experience is checkpoint-driven. Preparation, loading, contact, and recovery update all three coaching lenses while the athlete video seeks to the measured frame.

### Category reference safeguards

The category panel is a development-appropriate coaching lens, not a claim that the reference athlete is a statistical peer. AceCoach does not display unsupported age-group percentiles.

### Best-in-class safeguards

Elite video is used to illustrate organizing principles and variation. It is not used to create a numerical professional-comparison score or require the athlete to copy one exact body shape.

One- and two-handed tennis backhands use different elite references.

### Visual biomechanics body map

A new color-coded body map shows how the movement chain is functioning across:

- feet and spacing
- lower-body loading
- body position
- preparation and backlift
- hand and swing path
- contact window
- finish and recovery
- whole-chain repeatability

Each available zone jumps to the most relevant measured moment.

### Mobile behavior

The three comparison panels stack on smaller screens. External videos are lazy-loaded and never autoplay.

## Reference policy

AceCoach embeds public YouTube videos from the source publisher using the privacy-enhanced YouTube domain. It does not download, rehost, or redistribute third-party videos.

Reference availability can change. The product displays a safe fallback instead of silently replacing a missing reference with an unrelated clip.

## Scientific boundary

The comparison is visual and criterion-based. It does not convert elite footage into validated joint-angle norms, percentile rankings, or medical guidance.

## Database

No database migration is required for v3.3.0.

## Runtime

The Python analysis API remains version 0.9.0 because this release changes the report and reference experience rather than the measurement engine.
