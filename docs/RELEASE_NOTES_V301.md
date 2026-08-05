# AceCoach AI v3.0.1 — Red-Team Corrective Release

This release is a corrective audit of v3.0.0, not a new claim of scientific validation.

## Version manifest

- Web package: `3.0.1`
- Analysis API: `0.8.1`
- Engine: `movement-intelligence-v0.8.1`
- Report: `3.0.1-red-team-audited`
- Biomechanics: `camera-aware-kinematics-v0.3.1`
- Scoring: `criterion-control-index-v0.3.1`

## Upgrade

If v3.0.0 migration 016 is already installed, run only:

```text
supabase/017_red_team_audit_v301.sql
```

For a v2.5/v2.5.1 database, run:

```text
supabase/016_review_driven_major_upgrade_v30.sql
supabase/017_red_team_audit_v301.sql
```

## Breaking safety behavior

- Analysis requires a 32+ character `ANALYSIS_API_KEY` in both services.
- `VIDEO_ALLOWED_HOSTS` is required; unrestricted video hosts are disabled by default.
- Under-18 profiles can be saved, but video analysis is unavailable until verified guardian consent exists.
- Non-tennis clips receive capture-quality feedback only; technique scoring is withheld.
- Existing videos with legacy paths that do not include user and sport folders are flagged and cannot be analyzed until repaired.

## Health response

```json
{"status":"ok","service":"analysis-api","version":"0.8.1"}
```

See `docs/RED_TEAM_REVIEW_V301.md` for findings, validation, and unresolved risks.
