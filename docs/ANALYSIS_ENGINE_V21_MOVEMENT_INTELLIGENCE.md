# Analysis Engine v2.1 — Movement Intelligence

> **Historical document.** This describes an earlier engine and is superseded by `RED_TEAM_REVIEW_V24.md` and the v2.4 implementation. Do not use its capability claims or setup steps as the current source of truth.


## Delivered

- Deterministic tennis movement classification for forehand, backhand, two-handed backhand, serve, overhead and compact volley patterns.
- Transparent mismatch reporting between the upload selection and the detected movement.
- Expanded movement-chain assessment covering readiness, footwork, preparation/backlift, loading/body position, hand path, contact-spacing proxy, finish and recovery.
- Frame-synchronized video playback with pose overlay, phase markers, slow motion, and frame stepping.
- Coaching findings linked to key frames and timestamps.
- Prioritized three-step improvement plan with drills, dosage and success criteria.
- Age-band and level-aware development reference model comparison. It is explicitly not a population percentile.
- Engine/classifier/biomechanics/scoring/knowledge/report version manifest.

## Scientific limitations

The v2.1 classifier is a deterministic kinematic rules engine, not a trained RGB action-recognition model. It is confidence-limited because racket and ball detection are not yet enabled. The contact frame remains a peak-hand-speed proxy. Monocular 2D pose cannot directly measure forces, joint moments, muscle activity or true 3D rotation.

## Required migration

Run `supabase/009_movement_intelligence_v21.sql` after migration 008.
