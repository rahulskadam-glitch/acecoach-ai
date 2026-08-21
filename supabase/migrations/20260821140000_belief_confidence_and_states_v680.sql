-- Athlentra Tennis v6.8.0 — belief confidence + expanded lifecycle states.
--
-- player_development_state had two dead-end enum values ("solved", "superseded") that
-- nothing ever assigned, so a stable win never resolved into a durable outcome or caught a
-- relapse. This adds a belief-level confidence column and the states the reducer now emits:
-- "emerging" (no prior belief, not enough history yet), "uncertain" (comparable evidence but
-- confidence too low to claim a trend), and "retention_regressed" (a solved belief that
-- regressed during its retention window).

alter table public.player_development_state
  add column if not exists confidence numeric check (confidence is null or confidence between 0 and 1);

alter table public.player_development_state drop constraint if exists player_development_state_status_check;
alter table public.player_development_state add constraint player_development_state_status_check
  check (status in (
    'emerging', 'active', 'improving', 'plateaued', 'regressed', 'retention_regressed',
    'solved', 'uncertain', 'superseded'
  ));

drop index if exists development_state_active_idx;
create index if not exists development_state_active_idx
  on public.player_development_state(user_id, sport_id, action_type, updated_at desc)
  where status not in ('superseded');

create or replace function public.apply_player_development_observation_v680(
  p_user_id uuid,
  p_session_id uuid,
  p_sport_id text,
  p_action_type text,
  p_context_signature text,
  p_context_dimensions jsonb,
  p_construct_id text,
  p_sample_count integer,
  p_median_score numeric,
  p_spread numeric,
  p_success_rate numeric,
  p_confidence numeric,
  p_capture_score numeric,
  p_engine_version text,
  p_runtime_signature text,
  p_evidence_ids text[],
  p_active_cue text,
  p_success_metric text,
  p_status text,
  p_belief_confidence numeric,
  p_evidence_summary jsonb,
  p_ontology_version text,
  p_cue_change_reason text,
  p_knowledge_policy_version text,
  p_knowledge_manifest_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state_id uuid;
begin
  v_state_id := public.apply_player_development_observation_v650(
    p_user_id, p_session_id, p_sport_id, p_action_type, p_context_signature,
    p_context_dimensions, p_construct_id, p_sample_count, p_median_score,
    p_spread, p_success_rate, p_confidence, p_capture_score, p_engine_version,
    p_runtime_signature, p_evidence_ids, p_active_cue, p_success_metric,
    p_status, p_evidence_summary, p_ontology_version, p_cue_change_reason,
    p_knowledge_policy_version, p_knowledge_manifest_hash
  );
  update public.player_development_state
  set confidence = p_belief_confidence
  where id = v_state_id and user_id = p_user_id;
  return v_state_id;
end;
$$;

revoke execute on function public.apply_player_development_observation_v650(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text, text, text
) from service_role;
revoke all on function public.apply_player_development_observation_v680(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, numeric, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.apply_player_development_observation_v680(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, numeric, jsonb, text, text, text, text
) to service_role;

notify pgrst, 'reload schema';
