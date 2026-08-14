# Live migration verification v6.2.2

On 2026-08-14, migrations 026–029 were applied to the healthy Supabase project whose ref matches the repository's configured `NEXT_PUBLIC_SUPABASE_URL`.

Verified live:

- `construct_session_distributions`, `player_development_state`, `cue_history`, and `shared_root_insights` exist.
- Delayed-retention, transfer, and comparability fields exist on `reassessment_links`.
- All four athlete read policies use the optimized `(select auth.uid())` form.
- Service-only development/shared-root RPCs are not executable by `anon` or `authenticated`.
- Five session foreign-key indexes and the cue-history user index exist.
- Repeating the same development observation leaves one distribution, one cue-history row, and revision 1.
- A shared-root record can be activated and deactivated with four owned supporting sessions.
- Every exercise ran inside an explicit transaction that was rolled back; no test rows were retained.

Supabase's post-migration security advisor reported no findings for the four new tables or their RPCs. Newly created indexes can appear as unused until real traffic exercises them; that is expected and is not evidence that the foreign-key indexes are dead.
