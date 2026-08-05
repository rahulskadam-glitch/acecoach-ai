# v5 to v6 data compatibility

## Reused without duplication

- `profiles`
- `profile_sports`
- `consents`
- `videos`
- `analysis_sessions`
- `analysis_reports`
- `practice_plans`
- `practice_checkins`
- `analysis_feedback`
- v5 support and product-feedback records

## Additions in migration 022

- `profiles.silhouette_preference`
- `athlete_journeys`
- `coaching_conversations`
- `coaching_messages`
- `oauth_provider_health`

## Compatibility behavior

Existing videos remain downloadable and do not require re-upload. Existing completed analysis sessions render through `/report/[id]`. Existing `/analysis/[id]` links transition through the new status route and redirect to the report when complete. v5 practice and progress records remain linked to their original session IDs.

If migration 022 has not yet reached a connected environment, coaching conversations use a namespaced `acecoachConversationV1` envelope inside the existing `analysis_reports.coaching_playbook` JSONB value. The original playbook fields are preserved, conversation history and moderation flags remain persistent, and dedicated `coaching_conversations` / `coaching_messages` rows are preferred automatically once those tables become available. `npm run verify:runtime` reports which persistence mode is active.

## Rollback

The v6 UI can be rolled back by restoring the v5 folder. Do not drop migration 022 tables before exporting coaching conversation data. The additive migration does not rewrite v5 report payloads.
