# AceCoach AI v3.4.0 — Synchronized Motion Twin Lab

## Product objective

Turn the visual benchmark from three unrelated video players into one synchronized learning experience.

The athlete video is the master clock. AceCoach maps the primary measured repetition to a normalized movement timeline and drives two deterministic SVG silhouette simulations from the same phase progress:

1. category motion twin,
2. best-in-class motion twin.

## New experience

- Player video, category silhouette, and elite silhouette stay phase-aligned.
- Preparation, loading, contact, and recovery controls seek the measured athlete video.
- The two reference silhouettes update from the same timeline.
- Slow-motion controls apply to the athlete video while references remain synchronized.
- The measured primary repetition can loop continuously.
- The athlete pose is drawn over the uploaded video when frame landmarks are available.
- Red directional vectors show a coaching target at the current phase.
- Curved, arrowed hand paths show the reference movement corridor.
- The category template adapts its movement range to the saved playing level.
- Left-handed athletes use the declared dominant-side wrist path.
- Real coaching and elite source videos remain available in a collapsible section.

## Synchronization method

1. Select the primary measured repetition.
2. Read phase anchors from that repetition's phase timeline.
3. Normalize the repetition from 0% to 100%.
4. Interpolate the category and elite silhouette keyframes at the same normalized progress.
5. Update the active phase, coaching target, and directional markers from the same clock.

This approach synchronizes movement phases rather than forcing unrelated source videos to share the same raw timestamp.

## Scientific boundary

The reference twins are deterministic coaching visualizations. They are not:

- motion-capture avatars,
- direct age-group percentiles,
- exact professional joint-angle prescriptions,
- force or joint-moment estimates,
- proof that one visible technique is universally optimal.

The category silhouette uses the saved development context as a coaching lens. The best-in-class silhouette illustrates an organizing principle with a somewhat larger movement range.

## Database

No new migration is required when the database is already upgraded through migration 019.

## Version manifest

- Web: 3.4.0
- Analysis API: 0.9.0
- Report experience: synchronized-motion-twin-v1
