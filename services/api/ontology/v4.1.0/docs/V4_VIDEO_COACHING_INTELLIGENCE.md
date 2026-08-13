# AceCoach v4 — Perceptual-Causal Video Coaching Intelligence

## Why v3 was not yet best-in-class
v3 defined good principles but left too much implementation ambiguity between “video” and “insight.” A developer could still build a pose-scoring app and claim compliance. v4 closes that gap with explicit contracts for events, time-series measurements, rep clustering, self-best counterfactual comparison, causal hypothesis testing, claim traceability, insight prioritization and a visual-story compiler.

## The central product idea
AceCoach should answer: **What changed first, what did that force later, and what is the smallest correction that gives the player more options at the ball?**

The engine therefore treats each stroke as an event graph. For every comparable group of strokes it synchronizes key events, compares successful and weak repetitions, identifies the earliest meaningful divergence, traces downstream consequences, looks for counterexamples, then turns the surviving hypothesis into one visual teaching story.

## 1. Perception before coaching
The first six stages do not produce faults. They produce quality gates, court geometry, object tracks, stroke windows, events and context. This separation prevents language-model guesses from masquerading as biomechanics.

### Contact is an interval
Consumer video frequently does not contain a frame that literally captures ball-racket contact. Store a best estimate plus interval and confidence. Do not show millisecond precision that the source video cannot support.

### Preserve time series
Keep keypoint, racket and ball traces across the full pre-contact/contact/post-contact window. Many useful coaching observations are relationships between event timing and trajectory shape rather than isolated joint angles.

## 2. Analyze the tennis problem, not a generic pose
Before judging mechanics, classify incoming depth/height/pace, movement, court position, stance and likely intent. A defensive stretch forehand and an inside-the-court attack may be both effective while looking very different.

## 3. Compare comparable reps
The deepest source of insight is often the player themselves. Build context clusters. Inside a cluster, identify high-quality successful reps and weaker reps. Synchronize them to bounce/contact, then compare construct traces.

## 4. Earliest Meaningful Divergence (EMD)
EMD is the key v4 primitive.

1. Align successful and weak reps by events.
2. For each construct, calculate a robust difference over time.
3. Require minimum effect and support across reps.
4. Select the earliest divergence that precedes the visible problem.
5. Confirm downstream consistency.
6. Search for counterexamples.
7. Only then elevate it toward root-cause status.

This allows insights such as “your preparation is not late; spacing collapses after preparation” instead of generic checklist feedback.

## 5. Causal roles
Every diagnosed issue must be one of ROOT_CAUSE, CONTRIBUTOR, COMPENSATION, SYMPTOM or UNKNOWN. This is more useful than severity alone. A dramatic racket-path difference may be a compensation and should not become the coaching priority.

## 6. Insight anatomy
A primary insight contains:
- a contrastive thesis;
- root event;
- evidence IDs;
- player/self/cohort comparison basis;
- supporting reps and counterexamples;
- causal chain with confidence per edge;
- falsification conditions;
- one strength to protect where relevant;
- one cue;
- one practice constraint;
- one measurable success test;
- one compiled visual story.

## 7. Visual coaching = visual sentences
Player-mode visualization should not be a permanent skeleton/angle dashboard. Each visual story has a grammar:

**subject** (feet/body/racket/ball) → **change** (earlier/later/closer/wider) → **consequence** → **better movement window**.

The default cause-to-effect story is six beats: orient, cause, link, effect, correction, clean replay. Use self-best ghosts only when alignment is valid. Otherwise use synchronized side-by-side. Corridors represent viable ranges; a single ideal pose is discouraged.

## 8. Progressive disclosure
Five-second glance: one thesis + one strength + one cue. Twenty-second understand: cause and consequence. Practice view: drill and success test. Deep-dive view: event timing, metric traces, uncertainty and sources.

## 9. Trust and uncertainty
High-speed athletic pose estimation remains difficult. The app must gate high-speed/3D/velocity claims, carry confidence through derived constructs, and never render an overlay that looks more exact than the evidence. Racket-face orientation is especially easy to overclaim from consumer monocular video.

## 10. Engineering implementation order
1. Implement video QA and metric-specific camera suitability.
2. Implement stable body/ball/racket tracks with confidence traces.
3. Implement event graph and interval timestamps.
4. Implement metric recipes as pure deterministic transforms.
5. Implement context signatures and comparable-rep clustering.
6. Implement self-best EMD analysis.
7. Implement causal hypothesis objects and counterexample checks.
8. Implement deterministic insight prioritization.
9. Implement visual-story JSON compiler.
10. Render player mode from the visual-story contract; do not let the UI invent coaching logic.
11. Add claim traceability tests and golden-video regression tests.
12. Only then add LLM language generation as a constrained realization layer over the structured insight.

## Research design notes
Tennis biomechanics literature supports analyzing strokes as coordinated segment systems and highlights context/task variation. Motor-learning evidence supports careful cue/feedback design, including effect-oriented attentional focus where appropriate. Recent sports-pose benchmarks also justify conservative uncertainty for high-acceleration monocular estimates. See `config/research_sources.json`.
