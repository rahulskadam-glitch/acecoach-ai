# Analysis Engine v1.1 Review

> **Historical document.** This describes an earlier engine and is superseded by `RED_TEAM_REVIEW_V24.md` and the v2.4 implementation. Do not use its capability claims or setup steps as the current source of truth.


## Review scope

The analysis-engine additions were reviewed for build integrity, authorization, data consistency, idempotency, sport-pack routing, athlete-context selection, and truthful development-mode disclosure.

## Fixes applied

- Added idempotent session/report creation per user, video, and engine version.
- Prevented repeated Analyze clicks from creating duplicate sessions.
- Restricted analysis-session and report writes to videos owned by the authenticated user.
- Enforced consistency between report, session, sport, action, and video identifiers.
- Added automatic `updated_at` maintenance for analysis sessions.
- Selected athlete level and dominant side from the sport being analyzed, with primary-sport fallback.
- Replaced unsafe cross-movement fallback logic with a neutral generic pack for unsupported actions.
- Reduced development-mode confidence and relabeled the headline score to avoid implying measured video biomechanics.
- Versioned the hardened engine and report as `deterministic-v1.1` and `1.1`.
- Added migration `007_analysis_engine_hardening.sql` for projects where migration 006 was already applied.

## Validation

- ESLint: passed
- TypeScript: passed
- Next.js production build: passed

## Important limitation

This remains a deterministic workflow-validation engine. It does not inspect frames, detect pose landmarks, track equipment, or calculate biomechanical measurements. The UI explicitly discloses this limitation.
