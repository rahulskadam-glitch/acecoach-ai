# AceCoach AI v2.5 — Red-Team Review

## Release decision

**Controlled athlete-testing research beta.**

Version 2.5 improves the product outcome from “read a report” to “complete a measurable improvement loop.” It does not claim new laboratory-grade measurements. The release adds deterministic coaching synthesis, visual evidence navigation, guided practice, and conservative reassessment comparison on top of the v2.4 reliability gates.

## Red-team questions

### Could the app encourage too many technical changes?

**Mitigation:** the visible experience leads with one strongest quality, one first constraint, one cue, and one primary goal. Older active plans for the same movement are archived when a new plan is created.

### Could a practice plan be based on unreliable footage?

**Mitigation:** capture-blocked, incomplete-repetition, and unconfirmed-movement reports produce no technical plan. A one-repetition clip receives a baseline-capture plan rather than a technical prescription.

### Could a user see a misleading improvement claim?

**Mitigation:** direct score deltas require:

- the same analyzed movement,
- both reports passing the reliability gate,
- the same engine version,
- the same numeric runtime signature,
- capture-quality scores within 15 points.

Otherwise the previous report is presented as a separate baseline and no score improvement claim is made. Camera and drill comparability still depend on the athlete following the recording protocol.

### Could practice progress be altered for another user?

**Mitigation:** browser clients have select-only RLS access. Mutations run through server actions that verify the authenticated user and filter by ownership. A database trigger additionally enforces that source and reassessment sessions match the plan user, sport, and analyzed movement.

### Could optimistic UI hide a failed save?

**Mitigation:** the guided-practice component rolls back the checkbox and displays an error when a server mutation fails.

### Could the same video produce different coaching plans?

**Mitigation:** the plan is derived from deterministic measurements and versioned rules. A unit test runs the coaching builder twice with identical inputs and verifies identical output, four ordered sessions, and explicit success criteria.

### Does the movement story overstate causality?

**Residual risk:** `rootCauseHypothesis` is a deterministic coaching hypothesis, not a measured causal relationship. The interface labels it as a movement story and retains the scientific measurement boundary. Racket, ball, force, and calibrated 3D information remain unavailable.

## Quality gates run

- `npm run typecheck`
- `npm run lint`
- `python -m compileall -q services/api`
- Five Python integrity tests
- Next.js production compilation and static route generation
- Secret/generated-file scan before packaging
- `npm audit --omit=dev`: 0 high, 0 critical, 2 moderate transitive findings

## Dependency note

The production audit reports a moderate PostCSS advisory, surfaced through the current Next.js dependency graph. An automatic forced upgrade is not applied in this release because it may change the framework dependency set. Reassess against the public npm registry in a dedicated compatibility branch before public production deployment.

## What v2.5 does not solve

- no trained RGB + skeleton classifier,
- no racket or ball tracking,
- no true contact detection,
- no calibrated multi-camera or validated 3D reconstruction,
- no motion-capture validation,
- no genuine age-group percentile,
- no official injury or legality assessment,
- no production queue or horizontal worker orchestration.

## Release principle

AceCoach should be memorable because the athlete can see the evidence, understand one change, practise it, and prove progress—not because the interface displays more unvalidated numbers.
