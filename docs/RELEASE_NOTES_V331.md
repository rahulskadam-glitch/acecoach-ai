# AceCoach AI v3.3.1 — Visual Benchmark Installation Fix

## Why this release exists

Some users continued to see the older single-video report after installing v3.3.0. The feature code existed in the package, but installation could leave the new `web` folder nested inside the old project, and the three-column layout only activated at the very wide `2xl` breakpoint.

## Fixes

- Moved the three-level comparison directly below movement/reliability confirmation so it is visible near the top of every report.
- Changed the desktop comparison breakpoint from `2xl` to `xl`, so three panels appear side by side on common 1280–1535px laptop and desktop widths.
- Added a prominent report banner: `AceCoach v3.3.1 · Visual benchmark active`.
- Added a highlighted `COMPARE 3 VIDEOS` report-navigation control.
- Added visible build labeling inside the comparison studio.
- Added `/version` for installation verification.
- Added `public/version.json`, an installation guide, and a PowerShell verifier.
- Preserved graceful reference fallbacks and scientific limitations.

## Expected report experience

1. Player video
2. Category coaching-reference video
3. Best-in-class visual exemplar
4. Preparation / loading / contact / recovery checkpoint controls
5. Clicking a checkpoint seeks the player video to the measured frame
6. Category target and elite pattern update for the chosen phase

## Database

No new migration is required if migration `019_trust_progress_analytics_v320.sql` has already succeeded.
