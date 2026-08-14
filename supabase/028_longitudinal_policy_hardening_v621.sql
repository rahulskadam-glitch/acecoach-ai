-- AceCoach AI v6.2.1 — harden policies and foreign-key access paths added by 026–027.
-- Apply after migration 027.

drop policy if exists "construct_distributions_select_own" on public.construct_session_distributions;
create policy "construct_distributions_select_own" on public.construct_session_distributions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "development_state_select_own" on public.player_development_state;
create policy "development_state_select_own" on public.player_development_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "cue_history_select_own" on public.cue_history;
create policy "cue_history_select_own" on public.cue_history
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "shared_root_insights_select_own" on public.shared_root_insights;
create policy "shared_root_insights_select_own" on public.shared_root_insights
  for select to authenticated using ((select auth.uid()) = user_id);

create index if not exists construct_distributions_session_idx
  on public.construct_session_distributions(analysis_session_id);
create index if not exists development_state_started_session_idx
  on public.player_development_state(started_session_id);
create index if not exists development_state_last_session_idx
  on public.player_development_state(last_confirmed_session_id);
create index if not exists cue_history_session_idx
  on public.cue_history(analysis_session_id);
create index if not exists shared_root_last_session_idx
  on public.shared_root_insights(last_observed_session_id);

notify pgrst, 'reload schema';
