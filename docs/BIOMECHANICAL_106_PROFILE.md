# AceCoach 106-point biomechanical profile

## Purpose

AceCoach now produces a transparent 106-check pose-kinematic profile for every detected tennis movement. It keeps the player-facing coaching path simple while making the complete evidence trail inspectable phase by phase.

The number 106 is a registry contract, not a claim of 106 sensors or 106 clinically validated outcomes. Each item declares its calculation, unit, measurement basis, confidence, availability, and plain-language meaning.

## Phase taxonomy

| Phase | Checks | Main questions |
| --- | ---: | --- |
| Preparation | 16 | Is the player balanced, visible, and organized before the movement? |
| Backswing | 18 | How do the hands, arms, shoulder line, hip line, and timing develop? |
| Loading | 18 | How do the legs, hips, base, balance point, and trunk organize? |
| Acceleration / extension | 22 | In what order and at what camera-observed speed do body segments move? |
| Likely contact | 16 | What is the body shape and spacing at the whole-body motion peak? |
| Follow-through / recovery | 16 | How does the movement decelerate, finish, stabilize, and repeat? |
| **Total** | **106** | |

The authoritative item-by-item registry is `services/api/analysis_engine/biomechanical_profile.py`. An import-time assertion and regression test prevent the count or phase distribution from drifting unnoticed.

## Body linkage model

AceCoach independently evaluates six sequential links:

1. Base → knees
2. Knees → hips
3. Hips → hip-line turn
4. Hip-line turn → shoulder-line turn
5. Shoulder-line turn → hitting elbow
6. Hitting elbow → hitting hand

For each node, the engine finds its movement peak between loading and the likely-contact proxy. Each edge is reported as connected, delayed transfer, out of sequence, or unavailable. This is a timing-order model. It does not infer force, torque, power, or energy transfer from a single RGB camera.

## Measurement design

- Angles use pose landmarks when the three required points are sufficiently visible.
- Paths and linear speeds use image-plane displacement normalized by shoulder width, making them body-scaled camera estimates rather than metres or metres per second.
- Shoulder-, hip-, trunk-, upper-arm-, and forearm-line speeds use wrap-safe angular differences so crossing ±180 degrees does not create a false spike.
- The balance-point proxy blends the shoulder midpoint and hip midpoint; it is not a force-plate centre of pressure.
- “Likely contact” is the strongest smoothed whole-chain motion moment. Without racket and ball detection it is never labelled exact impact.
- Missing foot, joint, or phase evidence produces `unavailable`, never a fabricated zero or hidden default.
- Every value is paired with capture-derived confidence and a declared basis such as world-pose angle proxy, image-plane orientation proxy, timing proxy, or between-repetition variability.

## Scientific boundary

A monocular pose model can support accessible movement review, but camera placement, projection, occlusion, motion blur, clothing, and pose-model error all affect the output. AceCoach therefore does not claim to measure:

- ground-reaction force or centre of pressure;
- joint torque, tissue load, or injury risk;
- muscle activation;
- racket-face orientation or racket-head speed;
- ball speed, spin, trajectory, or exact impact time;
- laboratory-grade three-dimensional kinematics.

Those require additional views, calibrated cameras, racket/ball tracking, force plates, inertial sensors, EMG, or other instrumentation.

## Research basis

- Google MediaPipe Pose Landmarker documents the 33-landmark pose output used by the extractor: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- The tennis serve literature describes an eight-stage framework and the linked contribution of lower extremity, trunk, and upper extremity: https://pmc.ncbi.nlm.nih.gov/articles/PMC3445225/
- Forehand research supports phase timing and coordinated lower-body, trunk, and upper-limb kinematic review: https://pmc.ncbi.nlm.nih.gov/articles/PMC3761808/
- A backhand review provides stroke-specific context for one- and two-handed kinetic-chain organization: https://pmc.ncbi.nlm.nih.gov/articles/PMC4306773/
- Markerless monocular pose validation literature is used to bound claims and expose camera-dependent uncertainty: https://pubmed.ncbi.nlm.nih.gov/41046587/

## Product comparison boundary

Tennis AI publicly advertises 107 data points, six movement phases, prioritized corrections, and drills. Its private definitions, reference data, scoring weights, training data, and implementation are not public. AceCoach does not claim to copy those internals. It implements an independent 106-item taxonomy with a visible registry, availability reporting, per-item confidence, camera-honest units, linkage explanations, deterministic tests, and a direct path from the full deep dive to one correction and one drill.
