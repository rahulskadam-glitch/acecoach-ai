# Progressive profile change report

Implemented a low-friction, multi-sport athlete profile:
- Signup now asks only name, email and password.
- Post-login profile has a required essentials section and collapsible optional sections.
- Sport-specific roles, styles, rankings and goals load from the sport registry.
- Physical data is separated from the general profile.
- Required service consent is distinct from optional derived-data and raw-media training consent.
- New analysis-feedback schema supports future supervised evaluation and model improvement.

Run `supabase/005_progressive_athlete_profiles.sql` after migration 004.
