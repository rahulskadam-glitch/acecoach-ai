# AceCoach AI v5.0.0 — Review-Led Athlete Improvement

## Visible athlete changes

- Clean original player video by default in Watch and Compare.
- Optional single-difference guide instead of permanent annotations.
- Tapered, filled, semi-transparent human reference silhouettes.
- Player-proportioned, neutral, female, and male reference-body selector without gender inference.
- Previous/next frame controls in the synchronized comparison.
- Main correction appears once; supporting findings no longer repeat it.
- Coach Summary adds “Show me” and a measurable success target.
- Trust Summary shows original-video, movement, capture, and score status.
- Original video download in Upload History and Video Library.
- Practice, Methodology, Plans, and Support destinations.

## Reliability and architecture

- Upload transition contract and safe interrupted-upload records.
- Bounded transient storage retry.
- Client SHA-256 duplicate protection after migration 021.
- Owner-checked 60-second signed download.
- Domain contracts for media, jobs, analysis measurements, reliability, drills, reassessment, billing, and telemetry.
- Safe support requests and governed feedback-release evidence.

## Migration

Run `supabase/021_review_led_trust_platform_v500.sql` after migrations through 020.

## Honest limitations

v5 does not add trained racket/ball tracking, calibrated 3D, forces, injury diagnosis, population percentiles, photorealistic player reconstruction, background inpainting, or a complete coach marketplace. The current reference bodies are deterministic coaching visualizations.
