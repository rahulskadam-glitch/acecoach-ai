# AceCoach AI Multi-Sport Architecture

## Objective

AceCoach AI is a multi-sport motion-intelligence and coaching platform. Tennis remains the first and most mature sport pack, but the platform is not tennis-specific. The initial supported sports are tennis, badminton, squash, cricket, and table tennis.

## Core architectural rule

Shared platform capabilities must not contain sport-specific business logic. Sport-specific concepts are implemented through versioned **Sport Intelligence Packs**.

```text
Experience layer
  Web, mobile, coach and academy portals
        ↓
Platform layer
  Identity, athlete profile, media, jobs, reports, progress, permissions
        ↓
Motion intelligence layer
  Ingestion, quality checks, transcoding, pose, object tracking, segmentation
        ↓
Sport Intelligence Pack
  Actions, biomechanics, terminology, scoring, ranking systems, coaching rules
        ↓
AI orchestration
  Provider router, prompt/evaluation registry, quality policy, cost tracing
        ↓
Digital athlete record
  Longitudinal technique, goals, reports, recommendations and progress
```

## Shared platform capabilities

- Authentication and role-based access
- Athlete, coach, academy and administrator identities
- Secure video storage and processing jobs
- Pose and movement landmark infrastructure
- Provider-agnostic AI routing
- Reports, progress tracking and model traceability
- Observability, cost attribution and quality evaluations
- Regional configuration, language and currency readiness

## Sport Intelligence Pack contract

Every sport pack defines:

- Stable sport identifier
- Supported actions and movement categories
- Capture guidance and video-quality rules
- Sport-specific biomechanics metric schema
- Level and ranking systems
- Scoring rules and confidence thresholds
- Coaching vocabulary and knowledge sources
- Drill catalogue and progression logic
- Evaluation datasets and regression tests

The product registry lives in `src/lib/sports/registry.ts`. The active Python movement-intelligence pipeline lives under `services/api/analysis_engine`; sport-specific calibrated rule packs should be added there behind the shared contracts.

## Initial sport packs

### Tennis
Forehand, backhand, serve, volley, footwork and match movement.

### Badminton
Overhead clear, smash, drop shot, serve, net play and court footwork.

### Squash
Forehand drive, backhand drive, serve, volley, lunging and T-position recovery.

### Cricket
Front-foot batting, back-foot batting, fast bowling, spin bowling, fielding throw and wicketkeeping.

### Table Tennis
Forehand drive, backhand drive, forehand loop, serve, push and footwork.

## Data model

- `sports`: platform-managed catalogue and configuration
- `profiles`: identity-level athlete information and primary sport
- `profile_sports`: per-athlete, per-sport level, ranking, dominant side, goals and preferences
- `videos`: sport, action type, capture context and processing status
- `analysis`: sport, action, flexible metrics JSON, model trace and schema version

Legacy tennis fields remain temporarily for backward compatibility. New product code uses `sport_id` and `action_type`.

## Extensibility

Adding a sport should require:

1. Registering a sport pack.
2. Adding its action taxonomy and metric schema.
3. Adding capture guidance and coaching knowledge.
4. Adding evaluation fixtures and quality thresholds.
5. Enabling the sport through configuration.

It should not require changes to authentication, storage, general upload, AI provider adapters, reporting infrastructure or billing.

## Deliberate implementation boundaries

The MVP remains a modular monolith plus an independently deployable analysis service. Event buses, distributed workflow engines and sport-specific model services are introduced only when job volume or team boundaries justify them. The contracts are designed now so those migrations do not break clients.
