# AceCoach AI v6.0.0 current-state audit

## Baseline

The implementation started from the verified v5.0.0 package. Existing authentication, video storage, analysis sessions, reports, motion twins, practice plans, progress, support, consent, and RLS migrations were retained.

## Problems found

- The root page was a long dark marketing page with many competing calls to action.
- Login and signup were separate routes and successful login defaulted to the dashboard.
- Sport selection, profile completion, video upload, and analysis were distributed across multiple pages.
- `/analysis/[id]` rendered the completed report, leaving no dedicated processing destination.
- The first-time journey exposed the full workspace sidebar before the first analysis.
- The report was player-first in structure but remained visually dense and dark.
- No persistent report-grounded coaching conversation existed.
- Social authentication exposed only a Google implementation and did not gate provider buttons from environment configuration.

## Preserved v5 assets

- Private Supabase video bucket and signed URLs
- SHA-256 duplicate detection
- Owner-checked deletion and download
- Deterministic Python analysis tests
- Movement-confirmation reliability gate
- Four-section report view model
- Synchronized human motion comparison
- Practice and reassessment records
- Progress-comparison safeguards
- Support and product-feedback tables

## v6 architectural decision

A strangler migration was used. The six-step journey is implemented as new routes and feature modules while working v5 secondary destinations remain available for returning users. This avoids deleting valid data or rewriting the analysis engine solely for visual simplification.
