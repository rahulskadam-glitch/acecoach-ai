# Competitive User-Review Learnings — AceCoach AI v3.0

## Scope and method

This release used a broad sample of public App Store, Google Play, Reddit, specialist-forum, review-site, and official product material for SwingVision, Sportsbox AI, Onform, CoachNow, Skillest, Mustard, HomeCourt, Dartfish, V1 Sports, FullTrack, and Baseline Vision.

This is **not** a claim that every review was collected. Public reviews are noisy: some are outdated, non-informative, duplicated, incentivized, or potentially inauthentic. Product decisions therefore use repeated themes, corroboration across sources, and technical feasibility rather than one review or one star rating.

## Repeated user needs

| Review theme | Product risk | v3.0 response |
|---|---|---|
| Accuracy claims fail when setup is poor | Users stop trusting every insight | Capture preflight, server quality gates, explicit confidence, blocked scoring when evidence is inadequate |
| A wrong movement label makes the entire report useless | Confident but irrelevant coaching | Selected and detected movement remain separate; conflict requires confirmation |
| Too many measurements create a steep learning curve | Athletes understand the data but not the next rep | One primary correction, one cue, one success test, progressive disclosure |
| Players want to see the issue, not read a technical paragraph | Reports feel generic and hard to apply | Synchronized annotated playback, key moments, frame stepping, trails, repetition navigation |
| Good measurements do not automatically become good coaching | Data-rich products still require an expert translator | Coaching playbook: finding → likely impact → visual cue → feel cue → drill → pass condition |
| Feedback must continue into practice | The report is opened once and forgotten | Seven-day practice plan, completion, target-rep check-ins, confidence before/after, reassessment |
| Video collections become hard to navigate | Athletes cannot find old clips or reports | Dedicated searchable/filterable video library |
| Processing appears frozen | Users retry, create duplicates, or abandon | Honest processing overlay and concurrent-analysis protection |
| Sync, upload, and retry bugs are more damaging than missing advanced features | Reliability erodes perceived intelligence | Upload cleanup, retry-safe candidate handling, response validation, deterministic session keys |
| Athletes value human communication | Pure AI can feel untrusted or impersonal | Private coach-summary links, report feedback, browser audio summary |
| Hidden paywalls and difficult cancellation cause resentment | Pricing damages trust before coaching is judged | Transparent beta status and planned pricing; no payment collected or implied in this build |
| Users want progress, not merely a score | A one-time grade does not prove improvement | Self-reference repetition lab and comparable-session improvement loop |

## Product principle adopted

AceCoach v3.0 follows this loop:

```text
capture correctly
→ classify honestly
→ show the evidence
→ choose one priority
→ practise with a measurable target
→ reassess under comparable conditions
→ learn from athlete and coach feedback
```

## What was deliberately not copied

- Proprietary videos, private coaching libraries, model weights, or paid content.
- Unsupported claims such as true age-group percentiles without a validated cohort.
- Generic “ideal professional” comparisons that ignore age, level, handedness, intent, and camera view.
- Dozens of visible metrics without a coaching-priority hierarchy.
- Subscription claims or “unlimited” usage that the beta does not enforce.

## Remaining competitive gaps

1. Trained RGB + skeleton + racket + ball action recognition.
2. Validated racket/ball contact and shot-outcome tracking.
3. Calibrated 3D or multi-camera reconstruction validated against motion capture.
4. Native mobile capture with live silhouette/framing guidance.
5. True asynchronous job queue, push notifications, and resilient background processing.
6. Full coach workspace with annotations, voice-over, athlete messaging, and assignments.
7. Consented cohort data for defensible age/level reference ranges and percentiles.
8. Prospective studies showing that prescribed plans improve targeted player outcomes.
