# Advanced reasoning and safety contracts

## Keypoint visual-story lab

`services/api/ontology/v4.1.0/examples/visual_story_prototype.html` renders all six cause-to-effect beats from `visual_story_keypoints.synthetic.json`. Controls inject deterministic coordinate noise and raise the landmark-confidence cutoff, allowing ghost alignment and graceful suppression behavior to be tested without a production video dependency.

Serve the examples directory over HTTP before opening the lab; browser `file://` loading may block the JSON fixture. Automated tests validate the fixture, beat count, landmark coverage, and control wiring. A manual browser click-through remains required in an environment exposing browser control.

## Dual-camera fusion

The fusion contract synchronizes two views using shared detected events and rejects the pair when median residual alignment exceeds 50 ms. Each metric has its own capability requirements. Racket-face quality cannot improve without racket tracking in both views and high calibration quality; pose-only dual video never unlocks grip, force, joint load, or exact 3D ball trajectory.

This stage supplies the reasoning and measurement gate, not a second-video upload UI. Until capture UX and calibration are added, the runtime continues using the safe single-view path.

## Recorded practice volume

The load-pattern feature consumes athlete-logged attempts and self-rated effort. It needs two prior same-stroke check-ins, at least 40 current attempts, a 1.5× rise over the recent median, and a current effort rating of `hard`. It describes recorded practice volume only. It does not diagnose injury, estimate tissue or joint load, set universal safe limits, or infer total training load from partial logging.

## Tactical companion

The tactical ontology is separate from mechanics. It remains dormant until the engine manifest can prove validated ball tracking, court calibration, shot events, outcomes, and point boundaries. Tactical correlations never create mechanical causes.

## Cohorts and level transitions

Landlinger and USTA sources provide qualitative fallback shapes only. Numeric cohorts remain empty. Automatic skill promotion is prohibited until validated age/context cohorts, eight comparable sessions, three stable constructs, two retention checks, two transfer contexts, and explicit coach or player confirmation exist.
