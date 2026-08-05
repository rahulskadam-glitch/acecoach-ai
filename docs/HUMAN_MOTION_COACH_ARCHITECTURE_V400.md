# AceCoach AI v4.0 — Human Motion Coach Architecture

## Product contract

The player report has four primary sections:

1. Coach summary
2. Watch and compare
3. Three improvements
4. Practice and reassessment

Technical measurements, evidence, confidence, and engine provenance are available inside one collapsed advanced-analysis section.

## Feature architecture

The report is isolated under `src/features/report`:

- `components/` — report composition and four player sections
- `model/` — plain-language translation and view-model selection
- `motion/` — deterministic pose templates and SVG human silhouette renderer
- `types.ts` — boundary contract between the report feature and the application route

The legacy `components/analysis/AnalysisReport.tsx` is now only a compatibility export. This preserves route stability while moving the implementation behind a feature boundary.

## Human silhouette policy

Silhouette styling is selected from the saved profile (`male`, `female`, or `neutral`) and can be changed in the report. AceCoach does not infer gender from video appearance.

The silhouettes are deterministic coaching illustrations. They are not motion-capture avatars, peer percentiles, force estimates, or exact professional joint-angle templates.

## Synchronization

The player video is the master clock. Category and best-in-class silhouettes use the measured primary-repetition start, phase anchors, and end time. Phase controls seek the uploaded video and both visual models together.

## Language policy

Biomechanics terms are retained where useful, followed by simple explanations. The main report prioritizes one change and removes duplicated strengths, priorities, drills, charts, and scientific disclaimers.
