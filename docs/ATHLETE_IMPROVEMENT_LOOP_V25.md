# AceCoach AI v2.5 — Athlete Improvement Loop

## Product principle

The report is not the product outcome. Athlete improvement is the outcome.

Version 2.5 organizes the experience around a closed loop:

1. Capture a reliable, comparable movement sample.
2. Preserve the strongest visible quality.
3. Select one high-impact, coachable constraint.
4. Show the exact video moment supporting the finding.
5. Complete a progressive 7-day practice plan.
6. Re-record the same drill and camera setup.
7. Compare only when the movement, reliability gate, and engine version match.

## Player-first report hierarchy

The report intentionally reveals information in this order:

- coach verdict,
- movement identity and confidence,
- movement story and root-cause hypothesis,
- frame-synchronized visual evidence,
- guided practice plan,
- progress comparison,
- complete movement-chain review,
- reference lens,
- measurement and scientific detail.

The athlete sees one primary change before technical metrics.

## Measurement boundary

Every report separates:

- **Measured:** decoded timing, 2D pose paths, visibility, image-derived joint-angle and movement proxies.
- **Estimated:** likely contact frame, centre-of-mass proxy, criterion reference lens.
- **Unavailable:** racket face, ball outcome, ground forces, joint moments, laboratory 3D rotation, injury diagnosis.

## Comparison rules

A score delta is shown only when:

- both reports passed the reliability gate,
- the analysis movement matches,
- the complete engine version matches.

Otherwise the older report is shown as a separate baseline, not a direct improvement claim.

## Guided practice plan

Each reliable report produces four deterministic blocks:

- learn the shape,
- stabilize under a feed,
- transfer to live movement,
- record and reassess.

Every block contains an objective, one drill, dosage, and a pass criterion. Completion is persisted in `practice_plans`. Older active plans for the same movement are archived when a new reliable report is created.

## Red-team safeguards

- The LLM does not calculate measurements.
- The same inputs and versions produce the same plan and report.
- Movement conflicts require confirmation.
- Low-quality or incomplete captures do not receive a technique score.
- Comparison is blocked across engine versions.
- Practice-plan writes are server-only and ownership checked.
- Public percentiles are not displayed without a validated cohort.

## Remaining state-of-the-art blockers

The next scientific milestones remain:

- trained RGB + skeleton action recognition,
- racket and ball detection,
- validated contact-event detection,
- calibrated multi-view or validated monocular 3D,
- motion-capture validation,
- accredited coach agreement studies,
- consented cohort benchmarking,
- asynchronous job infrastructure and production observability.
