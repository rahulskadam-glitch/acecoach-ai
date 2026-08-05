# Multi-Sport Platform Change Report

## Product objective changed

AceCoach AI is now a multi-sport motion-intelligence platform rather than a tennis-only application. Tennis remains the flagship sport pack. Badminton, squash, cricket, and table tennis are first-class supported sports in the product model and code.

## Implemented in code

- Central typed sport registry with actions, goals, rankings, and biomechanics schemas
- Multi-sport onboarding and athlete profile
- Sport-specific ranking/rating options
- Sport and technique selection during video upload
- Sport-scoped storage paths and video metadata
- Multi-sport upload history and dashboard labels
- Generalized AI request contract with sport, action, and quality context
- Python sport-pack registry and generalized analysis API contract
- Multi-sport database catalogue, athlete-sport profiles, video context, flexible metrics, model trace, and schema versioning
- Backward-compatible migration for existing tennis data
- Multi-sport landing-page positioning and sport portfolio section
- Functional and technical architecture documentation

## Architecture choice

The system uses a shared platform plus versioned Sport Intelligence Packs. This avoids five separate applications and avoids hardcoding tennis concepts into shared infrastructure. The current implementation stays a modular monolith for the product application and an independently deployable analysis service, while preserving contracts for future workflow orchestration, eventing, model services, and mobile clients.

## Verification

- TypeScript typecheck passed
- ESLint passed
- Next.js production build passed
- Python compilation passed
