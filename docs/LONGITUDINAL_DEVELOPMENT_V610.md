# Longitudinal development state v6.1

AceCoach now stores a distribution for the active movement construct after each reliable analysis. It does not call a single better repetition “learning.” A trend requires the current session plus at least two earlier sessions that match construct, context, engine, numeric runtime, confidence, and capture-quality tolerances.

The reducer compares the current distribution median with the rolling median of up to three recent comparable sessions. A shift of at least four points produces `PROGRESS_SHIFT`; a backward shift or a result inside the meaningful-change band produces `REGRESSION_OR_PLATEAU`. Regression language deliberately does not assign a cause.

The active cue and success metric persist while a development state is active, improving, plateaued, or regressed. They may change only after an explicit solved, disproven, superseded, or coach-override transition. Reanalysis is idempotent: the session distribution and cue-history entry are upserted, and an unchanged state does not increment its revision.

Migration `supabase/026_longitudinal_development_state_v610.sql` creates:

- `construct_session_distributions`
- `player_development_state`
- `cue_history`
- retention, transfer, and comparability fields on `reassessment_links`
- the service-role-only transactional function `apply_player_development_observation_v610`

Each distribution also stores non-identifying context dimensions for shot situation and intent. Migration 027 uses those dimensions to prevent cross-stroke comparisons from merging materially different practice contexts.

Authenticated athletes receive read-only RLS access to their rows. All writes pass through the transactional server function after analysis-session ownership is verified.
