# Athlete profile and data strategy

AceCoach uses progressive profiling: account creation stays minimal, required coaching context is collected after sign-in, and advanced fields are optional.

## Required essentials
- First and last name
- Age band
- Country
- Primary sport
- Playing level
- Dominant side
- Primary goal
- Service-processing consent

## Optional enrichment
- Years playing and training frequency
- Competition level, role, style, ranking system and rating
- Language and measurement system
- Height, weight and movement considerations (stored separately)

## Consent boundaries
- Service processing is required to deliver analysis.
- Anonymized derived-metric improvement is optional and defaults off.
- Raw video/frame model training is separately optional and defaults off.
- Consent records are versioned and independently updateable.

## Training-data priority
Prefer structured, lower-risk signals over raw media: sport/action labels, pose landmarks, joint angles, timings, capture quality, user corrections, helpfulness and observed outcomes. Raw media may only enter training/evaluation datasets when explicit consent is active.

## Future safeguards
Under-13 and 13–17 users require a dedicated guardian-consent flow before production launch. Sensitive movement or injury context must never be used for diagnosis and must remain excluded from model training unless explicitly covered by a future consent policy.
