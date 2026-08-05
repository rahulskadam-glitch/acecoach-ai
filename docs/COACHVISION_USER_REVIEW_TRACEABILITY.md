# CoachVision user-review traceability

This document turns the supplied tennis swing-analysis reviews into product requirements. It is intentionally explicit about what AceCoach measures, estimates, asks the athlete to confirm, and does not claim.

## Product promise

AceCoach is a visual coaching loop, not a score generator:

1. **Observe** the original clip with synchronized body landmarks.
2. **Understand** one phase and the six whole-body timing links.
3. **Adjust** one prioritized constraint with a short cue and an illustrative next-position ghost.
4. **Prove** the change in a comparable recording and a concrete success test.

## Review feedback mapped to the product

| User-review need | Implemented response | Trust boundary |
| --- | --- | --- |
| Video and slow motion must be the center of the experience | CoachVision keeps the original video central, adds frame stepping and 0.25×/0.5× playback, and synchronizes the explanation to the active phase. | The clean-video lens removes every overlay; the source video is never modified. |
| Athletes need to see body position, not decode charts | Five visual lenses show the tracked skeleton, joint angles, balance point, hand trail, six chain links, or a clean clip. | Occluded or unavailable landmarks are not invented. |
| Show the correction visually | A dashed, level-aware next-position ghost is registered to the athlete’s shoulder line and linked to the current joint with a directional guide. | It is labeled as an illustration, not a reconstructed 3D body, measured racket face, medical model, or professional ideal. |
| Explain like a real coach | Every phase answers: what to watch, why it matters, and what to feel. The report leads with one constraint, one cue, one drill, and one success test. | Detailed evidence remains available without becoming the default reading path. |
| Biomechanics must show linkage, not isolated angles | The exact 106-check profile is grouped into six phases and six time-linked transfers from base to hitting hand. | These are pose-kinematic relationships from monocular video, not force, torque, load, spin, or ball-speed measurements. |
| Generic advice is not useful | Intake captures level, age band, dominant side, shot situation, intention, camera view, primary goal, and the athlete’s own question. | Tactical context is marked athlete-supplied. If situation or intention is missing, tactical judgment is withheld. |
| AI classifications can be wrong | The movement label and confidence are visible; the athlete can correct the label and rebuild the report. | AceCoach does not silently replace the athlete’s selection. |
| Users distrust false precision | Values are rounded, confidence and measurement basis remain visible, and reliability gates can withhold the score and prescription. | Estimated image-plane proxies are not presented as laboratory measurements. |
| Poor capture destroys trust | The upload checks file integrity locally, then the engine checks pose coverage, clipping, athlete size, repetitions, and capture score before coaching. | Low-quality captures produce filming guidance, not technique advice. |
| One unusual swing should not drive a redesign | Scoring requires multiple detected repetitions; one repetition can produce observations but not an execution score. | A repeatable baseline is required before progress claims. |
| Players need action, not more metrics | The coaching path prioritizes a single root constraint and uses secondary observations as optional support. | The complete 106-check audit is still accessible for advanced users and coaches. |
| Results should improve over time | Practice output defines dosage, cue, success test, transfer challenge, and a same-context recording plan. | Progress is a within-athlete comparison, not a population percentile or ranking. |
| Human coaching should remain available | The report provides a coach handoff path with the video, evidence, cue, and success target. | Pain, rehabilitation, injury risk, ambiguous captures, and advanced tactical interpretation require a qualified human professional. |
| Privacy and control matter | The interface states that the original remains private/downloadable and separates service processing from optional training/research permission. | No consent is inferred from product use. |

## Deliberate non-claims

- No line calling, ball tracking, bounce placement, shot speed, spin, racket-face angle, joint torque, joint loading, or ground-reaction force is claimed from a single ordinary camera.
- The visual ghost is a coaching illustration derived from the product’s motion model. It is not a biomechanical simulation of internal tissue loads or a digital twin.
- “Professional comparison” is a development lens only; body proportions, style, age, level, intent, and incoming-ball context prevent one universal ideal technique.
- The current workflow analyzes short athlete-selected movement clips. Automatic full-match trimming, scoring, and event classification are separate product capabilities and are not represented as complete here.

## Definition of done

- The report remains useful without reading a chart.
- Every visible claim can be traced to a frame, a supplied context label, or an explicit illustration.
- The athlete can correct AI classification and see the clean original.
- Missing evidence results in “unavailable” or a withheld judgment—not fabricated certainty.
- The next action is understandable in under one minute: one cue, one drill, one success test.
