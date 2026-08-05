# Migration plan

## 1. Add bundle without changing current reports

- Copy bundle into analysis service.
- Run validation in CI and service startup.
- Store ontology version `2.1.0` with new analysis sessions.

## 2. Introduce structured observations in shadow mode

- Existing report remains user-visible.
- New ontology produces observations in parallel.
- Compare outputs with coach labels and current engine results.

## 3. Calibrate and approve fault families

For each fault:

- minimum 2 qualified coach reviewers
- camera-view validation
- false-positive review
- junior and adult examples
- technique-family exceptions
- outcome and recurrence analysis

## 4. Enable player evidence view

Activate only faults meeting release thresholds. Show one primary fault and evidence frames.

## 5. Enable coach overrides

Store overrides separately. Never delete original AI observation.

## 6. Replace legacy scoring

Switch category scores only after repeatability and coach-agreement thresholds are met.

## 7. Versioned reanalysis

Historical analysis remains immutable. Offer explicit reanalysis with the newer version tuple.
