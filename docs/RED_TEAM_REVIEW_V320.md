# Internal Red-Team Review — v3.2.0

## Threats reviewed

- Review-washing: fixed by separating feature coverage from user satisfaction.
- Score inflation: capability categories with unimplemented object tracking or validation remain below 4.
- Feedback-loop poisoning: product feedback is server-write-only and cannot change live scoring automatically.
- Analytics overclaiming: repetition statistics are explicitly self-reference measures, not technique grades or percentiles.
- Signal-processing nondeterminism: SciPy processing uses fixed algorithms and no random state.
- Performance overload: the analytics lab sits below the primary coaching message.
- Migration safety: v3.2 adds one independent feedback table and does not modify existing analysis tables.

## Remaining material gaps

- No racket, bat, ball, or shuttle tracking.
- No trained real-world movement classifier.
- No independent motion-capture validation.
- No durable production job queue or offline synchronization.
- No full coach roster, annotations, messaging, or assignment workflow.
- No native high-frame-rate capture experience.
