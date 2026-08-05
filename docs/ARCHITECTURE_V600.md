# AceCoach AI v6.0.0 architecture

## Presentation boundary

The six active journey routes are thin route components. User-facing logic lives under:

- `src/features/journey`
- `src/features/sport-selection`
- `src/features/authentication`
- `src/features/athlete-intake`
- `src/features/analysis-session`
- `src/features/report`
- `src/features/coaching-conversation`

## Orchestration

- Journey actions persist sport, intake, and session linkage.
- Upload remains direct-to-private Supabase storage with server-side metadata registration.
- `queueAnalysisVideo` creates or restores an idempotent session.
- `runAnalysisSession` claims and executes the existing deterministic analysis pipeline.
- `getAnalysisStatus` supplies the status page with stored server state.
- The report reads the same v5 analysis contract through a compatibility mapper.
- Coaching messages are generated only from sanitized stored report fields and approved fallback logic.

## Trust boundary

- Browser clients upload media but cannot write analysis results.
- Service-role operations remain in server actions.
- Anonymous journey tokens are stored only as SHA-256 hashes.
- Coaching message writes are server-only.
- OAuth buttons are configuration-gated.
- Unsupported measurement and medical questions are refused.
