-- Athlentra Tennis v6.4.0 — governed knowledge, outcomes and validation readiness.
-- Additive and idempotent. Apply after migration 029.

create extension if not exists "pgcrypto";

create table if not exists public.analysis_rep_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  repetition_index integer not null check (repetition_index >= 0),
  labeler_ref text not null default 'self',
  outcome_source text not null check (outcome_source in (
    'player', 'credentialed_coach', 'validated_sensor', 'validated_ball_tracker'
  )),
  validation_status text not null default 'self_reported' check (validation_status in (
    'self_reported', 'coach_verified', 'sensor_verified', 'tracker_verified', 'rejected'
  )),
  execution_result text check (execution_result is null or execution_result in (
    'success', 'in_target', 'weak', 'out_of_target', 'net', 'unknown'
  )),
  depth_zone text,
  direction text,
  placement_zone text,
  net_clearance_cm numeric,
  bounce_x_normalized numeric check (bounce_x_normalized is null or bounce_x_normalized between 0 and 1),
  bounce_y_normalized numeric check (bounce_y_normalized is null or bounce_y_normalized between 0 and 1),
  model_version text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (analysis_session_id, repetition_index, outcome_source, labeler_ref)
);

create table if not exists public.expert_annotation_studies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in (
    'draft', 'collecting', 'agreement_review', 'validated', 'closed', 'withdrawn'
  )),
  rubric_version text not null,
  minimum_independent_raters integer not null default 3 check (minimum_independent_raters >= 3),
  blinded_to_engine_output boolean not null default true,
  agreement_method text not null default 'fleiss_kappa',
  agreement_threshold numeric not null default 0.6 check (agreement_threshold between 0 and 1),
  agreement_result numeric check (agreement_result is null or agreement_result between -1 and 1),
  inclusion_criteria jsonb not null default '{}'::jsonb,
  disagreement_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.expert_annotations (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.expert_annotation_studies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  repetition_index integer check (repetition_index is null or repetition_index >= 0),
  annotator_ref text not null,
  credential_status text not null check (credential_status in ('pending', 'verified', 'rejected', 'expired')),
  blinded_to_engine_output boolean not null default true,
  annotation jsonb not null,
  uncertainty jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (study_id, analysis_session_id, repetition_index, annotator_ref)
);

create table if not exists public.intervention_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  development_state_id uuid not null references public.player_development_state(id) on delete cascade,
  construct_id text not null,
  cue_fingerprint text not null,
  baseline_session_ids uuid[] not null,
  post_session_ids uuid[] not null,
  retention_session_ids uuid[] not null default '{}',
  transfer_contexts text[] not null default '{}',
  primary_outcome_id text not null,
  baseline_median numeric,
  post_median numeric,
  effect_size numeric,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  status text not null default 'collecting' check (status in (
    'collecting', 'insufficient', 'improved', 'unchanged', 'regressed', 'withdrawn'
  )),
  conclusion text,
  causal_claim_allowed boolean not null default false check (causal_claim_allowed = false),
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (development_state_id, cue_fingerprint, primary_outcome_id)
);

create table if not exists public.benchmark_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sport_id text not null,
  owner text not null,
  consent_scope text not null,
  inclusion_criteria jsonb not null,
  exclusion_criteria jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_cohort_versions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.benchmark_cohorts(id) on delete cascade,
  version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'collecting', 'validation', 'validated', 'withdrawn'
  )),
  athlete_count integer not null default 0 check (athlete_count >= 0),
  repetition_count integer not null default 0 check (repetition_count >= 0),
  minimum_athletes_per_cell integer not null default 0 check (minimum_athletes_per_cell >= 0),
  minimum_repetitions_per_cell integer not null default 0 check (minimum_repetitions_per_cell >= 0),
  minimum_repetitions_per_athlete integer not null default 0 check (minimum_repetitions_per_athlete >= 0),
  dimensions text[] not null default '{}',
  camera_coverage jsonb not null default '{}'::jsonb,
  missingness jsonb not null default '{}'::jsonb,
  uncertainty jsonb not null default '{}'::jsonb,
  bias_review jsonb not null default '{}'::jsonb,
  validation_split jsonb not null default '{}'::jsonb,
  validation_metrics jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  review_expires_at timestamptz,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  unique (cohort_id, version)
);

create table if not exists public.benchmark_cohort_cells (
  id uuid primary key default gen_random_uuid(),
  cohort_version_id uuid not null references public.benchmark_cohort_versions(id) on delete cascade,
  stroke text not null,
  age_band text not null,
  playing_level text not null,
  handedness text not null,
  camera_angle text not null,
  stance text not null,
  shot_situation text not null,
  shot_intent text not null,
  athlete_count integer not null check (athlete_count >= 0),
  repetition_count integer not null check (repetition_count >= 0),
  metric_distributions jsonb not null,
  uncertainty jsonb not null,
  created_at timestamptz not null default now(),
  unique (cohort_version_id, stroke, age_band, playing_level, handedness, camera_angle, stance, shot_situation, shot_intent)
);

create table if not exists public.model_capability_validations (
  id uuid primary key default gen_random_uuid(),
  capability text not null check (capability in (
    'ball_tracking', 'racket_tracking', 'contact_event', 'multi_camera_3d', 'joint_force_or_load'
  )),
  model_version text not null,
  status text not null default 'draft' check (status in ('draft', 'validation', 'validated', 'withdrawn')),
  held_out_athlete_count integer not null default 0 check (held_out_athlete_count >= 0),
  camera_coverage text[] not null default '{}',
  artifacts text[] not null default '{}',
  validation_metrics jsonb not null default '{}'::jsonb,
  uncertainty jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  review_expires_at timestamptz,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  unique (capability, model_version)
);

create table if not exists public.capture_calibrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  calibration_type text not null check (calibration_type in ('single_view_court', 'dual_view', 'depth_sensor')),
  status text not null default 'pending' check (status in ('pending', 'valid', 'rejected', 'expired')),
  camera_views text[] not null default '{}',
  synchronization_error_ms numeric,
  reprojection_error_px numeric,
  calibration_payload jsonb not null default '{}'::jsonb,
  model_version text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (analysis_session_id, calibration_type)
);

create index if not exists analysis_rep_outcomes_user_session_idx
  on public.analysis_rep_outcomes(user_id, analysis_session_id, repetition_index);
create index if not exists analysis_rep_outcomes_session_fk_idx
  on public.analysis_rep_outcomes(analysis_session_id);
create index if not exists expert_annotations_study_session_idx
  on public.expert_annotations(study_id, analysis_session_id);
create index if not exists expert_annotations_user_idx
  on public.expert_annotations(user_id);
create index if not exists expert_annotations_session_fk_idx
  on public.expert_annotations(analysis_session_id);
create unique index if not exists expert_annotations_one_label_per_rater_idx
  on public.expert_annotations(study_id, analysis_session_id, coalesce(repetition_index, -1), annotator_ref);
create index if not exists intervention_validations_user_state_idx
  on public.intervention_validations(user_id, development_state_id, updated_at desc);
create index if not exists intervention_validations_state_fk_idx
  on public.intervention_validations(development_state_id);
create index if not exists benchmark_versions_status_review_idx
  on public.benchmark_cohort_versions(status, review_expires_at);
create index if not exists benchmark_versions_cohort_fk_idx
  on public.benchmark_cohort_versions(cohort_id);
create index if not exists benchmark_cells_version_fk_idx
  on public.benchmark_cohort_cells(cohort_version_id);
create index if not exists model_capabilities_status_review_idx
  on public.model_capability_validations(capability, status, review_expires_at);
create index if not exists capture_calibrations_user_session_idx
  on public.capture_calibrations(user_id, analysis_session_id);
create index if not exists capture_calibrations_session_fk_idx
  on public.capture_calibrations(analysis_session_id);

alter table public.analysis_rep_outcomes enable row level security;
alter table public.expert_annotation_studies enable row level security;
alter table public.expert_annotations enable row level security;
alter table public.intervention_validations enable row level security;
alter table public.benchmark_cohorts enable row level security;
alter table public.benchmark_cohort_versions enable row level security;
alter table public.benchmark_cohort_cells enable row level security;
alter table public.model_capability_validations enable row level security;
alter table public.capture_calibrations enable row level security;

drop policy if exists "analysis_rep_outcomes_select_own" on public.analysis_rep_outcomes;
create policy "analysis_rep_outcomes_select_own" on public.analysis_rep_outcomes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "analysis_rep_outcomes_insert_self" on public.analysis_rep_outcomes;
create policy "analysis_rep_outcomes_insert_self" on public.analysis_rep_outcomes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and outcome_source = 'player'
    and validation_status = 'self_reported'
    and exists (
      select 1 from public.analysis_sessions
      where id = analysis_session_id and user_id = (select auth.uid())
    )
  );
drop policy if exists "intervention_validations_select_own" on public.intervention_validations;
create policy "intervention_validations_select_own" on public.intervention_validations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "capture_calibrations_select_own" on public.capture_calibrations;
create policy "capture_calibrations_select_own" on public.capture_calibrations
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.analysis_rep_outcomes, public.expert_annotation_studies, public.expert_annotations,
  public.intervention_validations, public.benchmark_cohorts, public.benchmark_cohort_versions,
  public.benchmark_cohort_cells, public.model_capability_validations, public.capture_calibrations from anon, authenticated;
grant select, insert on public.analysis_rep_outcomes to authenticated;
grant select on public.intervention_validations, public.capture_calibrations to authenticated;
grant all on public.analysis_rep_outcomes, public.expert_annotation_studies, public.expert_annotations,
  public.intervention_validations, public.benchmark_cohorts, public.benchmark_cohort_versions,
  public.benchmark_cohort_cells, public.model_capability_validations, public.capture_calibrations to service_role;

create or replace function public.upsert_construct_session_distributions_v640(
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
  p_observations jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_count integer;
begin
  select user_id into v_owner from public.analysis_sessions where id = p_session_id;
  if v_owner is null or v_owner <> p_user_id then
    raise exception 'Distribution session is not owned by user';
  end if;
  if jsonb_typeof(p_observations) <> 'array' then
    raise exception 'Observations must be a JSON array';
  end if;
  if p_sample_count <= 0 or p_spread < 0 or p_spread > 100 or p_capture_score < 0 or p_capture_score > 100 then
    raise exception 'Invalid distribution values';
  end if;

  insert into public.construct_session_distributions (
    user_id, analysis_session_id, sport_id, action_type, construct_id,
    context_signature, context_dimensions, sample_count, median_score, spread,
    success_rate, confidence, capture_score, engine_version, runtime_signature, evidence_ids
  )
  select
    p_user_id, p_session_id, p_sport_id, p_action_type, observation->>'constructId',
    p_context_signature, coalesce(p_context_dimensions, '{}'::jsonb), p_sample_count,
    (observation->>'medianScore')::numeric, p_spread, null,
    (observation->>'confidence')::numeric, p_capture_score, p_engine_version,
    p_runtime_signature,
    coalesce(array(select jsonb_array_elements_text(observation->'evidenceIds')), '{}'::text[])
  from jsonb_array_elements(p_observations) observation
  where observation ? 'constructId'
    and (observation->>'medianScore')::numeric between 0 and 100
    and (observation->>'confidence')::numeric between 0 and 1
  on conflict (analysis_session_id, construct_id, context_signature) do update set
    context_dimensions = excluded.context_dimensions,
    sample_count = excluded.sample_count,
    median_score = excluded.median_score,
    spread = excluded.spread,
    success_rate = excluded.success_rate,
    confidence = excluded.confidence,
    capture_score = excluded.capture_score,
    engine_version = excluded.engine_version,
    runtime_signature = excluded.runtime_signature,
    evidence_ids = excluded.evidence_ids;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.upsert_construct_session_distributions_v640(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_construct_session_distributions_v640(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb
) to service_role;

notify pgrst, 'reload schema';
