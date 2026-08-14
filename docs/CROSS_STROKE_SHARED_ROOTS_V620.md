# Cross-stroke shared roots v6.2

AceCoach can now identify a player-level movement construct that is independently supported across multiple strokes. This is deliberately stricter than matching fault names.

A `SHARED_ROOT_CONSTRUCT` requires:

- At least two eligible stroke actions.
- At least two independent sessions for each action.
- The same normalized construct.
- Matching shot situation and shot intent.
- Confidence of at least 0.65 for every supporting action.
- Capture scores within 15 points.
- A construct median that remains below the limiter ceiling.

The reducer suppresses the insight when any requirement fails. It also preserves stroke-specific cues. A shared cue is displayed only when every supporting stroke already uses the same cue.

Migration `supabase/027_cross_stroke_shared_roots_v620.sql` stores active shared-root insights and exposes them read-only to their athlete through RLS. Server writes validate ownership of every supporting session. Recomputing a sport’s shared root atomically deactivates its previous insight before activating the replacement.

The Progress page displays the normalized construct, supporting strokes, matched context, confidence, and either the genuine shared cue or the separate cue for each stroke.
