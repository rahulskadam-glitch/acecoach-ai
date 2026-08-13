# Coaching Engine Contract

The coaching engine consumes structured observations. It may summarize and prioritize; it may not create measurements.

## Decision sequence
1. Identify stroke + variant + context.
2. Segment phases with confidence.
3. Extract only supported observables.
4. Build player and cohort references.
5. Create fault candidates.
6. Test upstream explanations and downstream effects.
7. Test recurrence and outcome linkage.
8. Select strengths and one primary correction.
9. Select a visualization storyboard.
10. Generate player language from the structured evidence.

## Insight object
Every primary insight should contain: observation, evidence frames, recurrence, matched context, likely mechanism, outcome linkage, confidence, correction cue, drill/constraint, success metric and visual storyboard.

## Example
Bad: “Your backhand is late. Prepare earlier.”

Better: “Your turn starts on time, but on 6 of 8 deep backhands the racket is still finishing its preparation after the bounce. That leaves less time for your feet to create space, so contact shifts closer to your body and your racket path becomes steeper. Your best two backhands show the solution already: the shoulders finish organizing earlier while the feet keep adjusting. Feel **turn early, feet stay alive**. On the next 10 balls, finish the shoulder turn before the bounce without planting your feet. Success = contact spacing becomes closer to your best-rep band on at least 7/10 balls.”
