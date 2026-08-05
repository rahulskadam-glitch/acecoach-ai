# AceCoach Ontology v2.2.0 Deployment

This repository now includes the `acecoach-analytics-ontology-v2.2.0` bundle from `acecoachclaude.zip`.

## Installed locations

- `services/api/ontology/v2.2.0/`
  - `manifest.json`
  - `config/`
  - `schemas/`
  - `docs/`
- `services/api/ontology_runtime/acecoach_ontology/`
  - Python loader used by API startup
- `services/api/openapi/`
  - `analysis-contract-v2.2.0.yaml`
  - `context-and-safety-contract-v2.2.0.yaml`
- `src/features/biomechanics/contracts/ontology/`
  - TypeScript contracts (`index.ts`, `types.ts`)
- `supabase/024_context_safeguarding_longitudinal_v220.sql`
  - DB migration for context, consent, moderation, and progress trend tables
- `supabase/025_context_safety_rls_v220.sql`
  - RLS and ownership policies for v2.2.0 context/safety tables

## Runtime behavior

`services/api/app.py` now loads the ontology bundle on startup and exposes `ontology_version` in `/health`.

If the bundle cannot be loaded, API startup still continues with `ontology_version: unavailable` in health output.

The API now also exposes v2.2.0 context and safety endpoints under `/v1`:

- `POST /v1/players`
- `GET|PATCH|DELETE /v1/players/{playerId}`
- `POST|DELETE /v1/players/{playerId}/consent`
- `POST /v1/players/{playerId}/coach-grants`
- `POST /v1/moderation/precheck`
- `GET /v1/players/{playerId}/progress`

The athlete intake flow now calls these safeguards before upload and queue:

- profile and consent readiness (`/v1/players`, `/v1/players/{playerId}/consent`)
- moderation precheck by SHA-256 hash (`/v1/moderation/precheck`)

Context and safety persistence is now Supabase-backed (via service-role REST calls)
when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available.
If config or tables are missing, the API falls back to an in-memory store so
local development remains functional.

Analysis queueing now also attempts to persist:

- `session_context` row keyed by `analysis_session_id`
- `content_moderation_log` row for intake precheck evidence

These writes are best-effort and are skipped safely in environments where v2.2
tables are not yet present.

For rollout verification, set `CONTEXT_PERSISTENCE_DEBUG=1` in the web app
environment to emit queue-time session context persistence outcomes in server
logs (`persisted` or `skipped`) with the `sessionId`.

Set `NEXT_PUBLIC_CONTEXT_PERSISTENCE_DEBUG=1` to display a rollout verification
panel on the analysis page that reads `session_context` and
`content_moderation_log` status for the current `analysis_session_id`.

## Next steps

1. Apply migrations `024_context_safeguarding_longitudinal_v220.sql` and `025_context_safety_rls_v220.sql` in Supabase.
2. Persist `player_id` linking in database records if you want multi-player support per account.
3. Use `src/features/biomechanics/contracts/ontology/` types in report and overlay modules.
