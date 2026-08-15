-- Athlentra Tennis v6.5.0 — fail-closed knowledge-control trace.
-- Additive and idempotent. Legacy rows remain readable but are not eligible for
-- new comparisons, benchmark releases, or longitudinal development writes.

alter table public.analysis_reports
  add column if not exists knowledge_control jsonb,
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;

do $$ begin
  alter table public.analysis_reports add constraint analysis_reports_knowledge_control_complete_check
    check (
      (knowledge_control is null and knowledge_policy_version is null and knowledge_manifest_hash is null)
      or (
        knowledge_control is not null
        and knowledge_policy_version is not null
        and knowledge_manifest_hash is not null
        and jsonb_typeof(knowledge_control) = 'object'
        and knowledge_control->>'status' = 'CONTROLLED'
        and knowledge_control->>'failClosed' = 'true'
        and knowledge_policy_version = knowledge_control->>'policyVersion'
        and knowledge_manifest_hash = knowledge_control->>'manifestHash'
        and coalesce(knowledge_control #>> '{domains,calculations,authorized}', 'false') = 'true'
        and coalesce(knowledge_control #>> '{domains,insights,authorized}', 'false') = 'true'
        and coalesce(knowledge_control #>> '{domains,recommendations,authorized}', 'false') = 'true'
        and coalesce(knowledge_control #>> '{domains,benchmarks,authorized}', 'false') = 'true'
        and coalesce(knowledge_control #>> '{domains,records,authorized}', 'false') = 'true'
        and coalesce(knowledge_control #>> '{domains,report,authorized}', 'false') = 'true'
      )
    );
exception when duplicate_object then null; end $$;

create index if not exists analysis_reports_knowledge_trace_idx
  on public.analysis_reports(user_id, knowledge_policy_version, knowledge_manifest_hash, created_at desc)
  where knowledge_control is not null;

alter table public.construct_session_distributions
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;
alter table public.player_development_state
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;
alter table public.shared_root_insights
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;
alter table public.intervention_validations
  add column if not exists knowledge_manifest_hash text;
alter table public.benchmark_cohort_versions
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text,
  add column if not exists policy_snapshot jsonb not null default '{}'::jsonb;
alter table public.model_capability_validations
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;

do $$ begin
  alter table public.benchmark_cohort_versions add constraint benchmark_validated_knowledge_trace_check
    check (
      status <> 'validated'
      or (
        knowledge_policy_version is not null
        and knowledge_manifest_hash is not null
        and jsonb_typeof(policy_snapshot) = 'object'
        and policy_snapshot <> '{}'::jsonb
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.model_capability_validations add constraint model_validated_knowledge_trace_check
    check (
      status <> 'validated'
      or (knowledge_policy_version is not null and knowledge_manifest_hash is not null)
    );
exception when duplicate_object then null; end $$;

create index if not exists construct_distributions_knowledge_trace_idx
  on public.construct_session_distributions(user_id, knowledge_policy_version, knowledge_manifest_hash, recorded_at desc)
  where knowledge_policy_version is not null and knowledge_manifest_hash is not null;
create index if not exists development_state_knowledge_trace_idx
  on public.player_development_state(user_id, knowledge_policy_version, knowledge_manifest_hash, updated_at desc)
  where knowledge_policy_version is not null and knowledge_manifest_hash is not null;

create or replace function public.upsert_construct_session_distributions_v650(
  p_user_id uuid,
  p_session_id uuid,
  p_sport_id text,
  p_action_type text,
  p_context_signature text,
  p_context_dimensions jsonb,
  p_sample_count integer,
  p_spread numeric,
  p_capture_score numeric,
  p_engine_version text,
  p_runtime_signature text,
  p_observations jsonb,
  p_knowledge_policy_version text,
  p_knowledge_manifest_hash text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_knowledge_policy_version is null or p_knowledge_manifest_hash is null then
    raise exception 'Knowledge control version and manifest hash are required';
  end if;
  if not exists (
    select 1 from public.analysis_reports
    where session_id = p_session_id and user_id = p_user_id
      and knowledge_policy_version = p_knowledge_policy_version
      and knowledge_manifest_hash = p_knowledge_manifest_hash
      and knowledge_control->>'status' = 'CONTROLLED'
      and knowledge_control #>> '{domains,records,authorized}' = 'true'
  ) then
    raise exception 'Source analysis report is not authorized for derived records';
  end if;

  v_count := public.upsert_construct_session_distributions_v640(
    p_user_id, p_session_id, p_sport_id, p_action_type, p_context_signature,
    p_context_dimensions, p_sample_count, p_spread, p_capture_score,
    p_engine_version, p_runtime_signature, p_observations
  );
  update public.construct_session_distributions
  set knowledge_policy_version = p_knowledge_policy_version,
      knowledge_manifest_hash = p_knowledge_manifest_hash
  where analysis_session_id = p_session_id
    and user_id = p_user_id
    and context_signature = p_context_signature;
  return v_count;
end;
$$;

create or replace function public.apply_player_development_observation_v650(
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
  if not exists (
    select 1 from public.analysis_reports
    where session_id = p_session_id and user_id = p_user_id
      and knowledge_policy_version = p_knowledge_policy_version
      and knowledge_manifest_hash = p_knowledge_manifest_hash
      and knowledge_control->>'status' = 'CONTROLLED'
      and knowledge_control #>> '{domains,records,authorized}' = 'true'
  ) then
    raise exception 'Source analysis report is not authorized for development state';
  end if;

  v_state_id := public.apply_player_development_observation_v610(
    p_user_id, p_session_id, p_sport_id, p_action_type, p_context_signature,
    p_context_dimensions, p_construct_id, p_sample_count, p_median_score,
    p_spread, p_success_rate, p_confidence, p_capture_score, p_engine_version,
    p_runtime_signature, p_evidence_ids, p_active_cue, p_success_metric,
    p_status, p_evidence_summary, p_ontology_version, p_cue_change_reason
  );
  update public.construct_session_distributions
  set knowledge_policy_version = p_knowledge_policy_version,
      knowledge_manifest_hash = p_knowledge_manifest_hash
  where analysis_session_id = p_session_id and user_id = p_user_id;
  update public.player_development_state
  set knowledge_policy_version = p_knowledge_policy_version,
      knowledge_manifest_hash = p_knowledge_manifest_hash
  where id = v_state_id and user_id = p_user_id;
  return v_state_id;
end;
$$;

create or replace function public.upsert_shared_root_insight_v650(
  p_user_id uuid,
  p_sport_id text,
  p_construct_id text,
  p_context_class text,
  p_action_types text[],
  p_supporting_session_ids uuid[],
  p_confidence numeric,
  p_shared_cue text,
  p_stroke_specific_cues jsonb,
  p_evidence_summary jsonb,
  p_ontology_version text,
  p_last_observed_session_id uuid,
  p_knowledge_policy_version text,
  p_knowledge_manifest_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state_id uuid;
  v_controlled_support integer;
begin
  select count(distinct session_id) into v_controlled_support
  from public.analysis_reports
  where session_id = any(p_supporting_session_ids)
    and user_id = p_user_id
    and knowledge_policy_version = p_knowledge_policy_version
    and knowledge_manifest_hash = p_knowledge_manifest_hash
    and knowledge_control->>'status' = 'CONTROLLED'
    and knowledge_control #>> '{domains,records,authorized}' = 'true';
  if v_controlled_support <> cardinality(p_supporting_session_ids) then
    raise exception 'Every shared-root source must use the same authorized knowledge policy and manifest';
  end if;

  v_state_id := public.upsert_shared_root_insight_v620(
    p_user_id, p_sport_id, p_construct_id, p_context_class, p_action_types,
    p_supporting_session_ids, p_confidence, p_shared_cue, p_stroke_specific_cues,
    p_evidence_summary, p_ontology_version, p_last_observed_session_id
  );
  update public.shared_root_insights
  set knowledge_policy_version = p_knowledge_policy_version,
      knowledge_manifest_hash = p_knowledge_manifest_hash
  where id = v_state_id and user_id = p_user_id;
  return v_state_id;
end;
$$;

revoke execute on function public.upsert_construct_session_distributions_v640(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb
) from service_role;
revoke execute on function public.apply_player_development_observation_v610(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text
) from service_role;
revoke execute on function public.upsert_shared_root_insight_v620(
  uuid, text, text, text, text[], uuid[], numeric, text, jsonb, jsonb, text, uuid
) from service_role;

revoke all on function public.upsert_construct_session_distributions_v650(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_construct_session_distributions_v650(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb, text, text
) to service_role;
revoke all on function public.apply_player_development_observation_v650(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.apply_player_development_observation_v650(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text, text, text
) to service_role;
revoke all on function public.upsert_shared_root_insight_v650(
  uuid, text, text, text, text[], uuid[], numeric, text, jsonb, jsonb, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_shared_root_insight_v650(
  uuid, text, text, text, text[], uuid[], numeric, text, jsonb, jsonb, text, uuid, text, text
) to service_role;

notify pgrst, 'reload schema';
