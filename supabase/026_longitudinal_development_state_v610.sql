-- AceCoach AI v6.1.0 — durable longitudinal development state.
-- Additive and idempotent. Apply after migrations 001 through 025.

create extension if not exists "pgcrypto";

create table if not exists public.construct_session_distributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  construct_id text not null,
  context_signature text not null,
  context_dimensions jsonb not null default '{}'::jsonb,
  sample_count integer not null check (sample_count > 0),
  median_score numeric not null check (median_score between 0 and 100),
  spread numeric not null check (spread between 0 and 100),
  success_rate numeric check (success_rate is null or success_rate between 0 and 1),
  confidence numeric not null check (confidence between 0 and 1),
  capture_score numeric not null check (capture_score between 0 and 100),
  engine_version text not null,
  runtime_signature text,
  evidence_ids text[] not null default '{}',
  recorded_at timestamptz not null default now(),
  unique (analysis_session_id, construct_id, context_signature)
);

create table if not exists public.player_development_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  context_signature text not null,
  primary_construct_id text not null,
  active_cue text,
  success_metric text,
  status text not null default 'active' check (status in (
    'active', 'improving', 'plateaued', 'regressed', 'solved', 'superseded'
  )),
  started_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  last_confirmed_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  evidence_summary jsonb not null default '{}'::jsonb,
  ontology_version text not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sport_id, action_type, context_signature)
);

create table if not exists public.cue_history (
  id uuid primary key default gen_random_uuid(),
  development_state_id uuid not null references public.player_development_state(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  previous_cue text,
  next_cue text,
  change_reason text not null check (change_reason in (
    'initialized', 'stable', 'solved', 'disproven', 'superseded', 'coach_override'
  )),
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (development_state_id, analysis_session_id)
);

alter table public.reassessment_links
  add column if not exists immediate_performance_status text,
  add column if not exists delayed_retention_status text,
  add column if not exists transfer_status text,
  add column if not exists comparability_status text not null default 'not_evaluated',
  add column if not exists evaluated_at timestamptz;

do $$ begin
  alter table public.reassessment_links add constraint reassessment_comparability_status_check
    check (comparability_status in ('not_evaluated', 'comparable', 'not_comparable'));
exception when duplicate_object then null; end $$;

create index if not exists construct_distributions_history_idx
  on public.construct_session_distributions(user_id, sport_id, action_type, construct_id, context_signature, recorded_at desc);
create index if not exists development_state_active_idx
  on public.player_development_state(user_id, sport_id, action_type, updated_at desc)
  where status not in ('solved', 'superseded');
create index if not exists cue_history_state_idx
  on public.cue_history(development_state_id, created_at desc);
create index if not exists construct_distributions_session_idx
  on public.construct_session_distributions(analysis_session_id);
create index if not exists development_state_started_session_idx
  on public.player_development_state(started_session_id);
create index if not exists development_state_last_session_idx
  on public.player_development_state(last_confirmed_session_id);
create index if not exists cue_history_session_idx
  on public.cue_history(analysis_session_id);
create index if not exists cue_history_user_created_idx
  on public.cue_history(user_id, created_at desc);

alter table public.construct_session_distributions enable row level security;
alter table public.player_development_state enable row level security;
alter table public.cue_history enable row level security;

drop policy if exists "construct_distributions_select_own" on public.construct_session_distributions;
create policy "construct_distributions_select_own" on public.construct_session_distributions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "development_state_select_own" on public.player_development_state;
create policy "development_state_select_own" on public.player_development_state
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "cue_history_select_own" on public.cue_history;
create policy "cue_history_select_own" on public.cue_history
  for select to authenticated using ((select auth.uid()) = user_id);

-- Longitudinal writes are server-only so session ownership, idempotency, and
-- cue history are committed in one transaction.
create or replace function public.apply_player_development_observation_v610(
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
  p_cue_change_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_state public.player_development_state%rowtype;
  v_previous_cue text;
begin
  select user_id into v_owner from public.analysis_sessions where id = p_session_id;
  if v_owner is null or v_owner <> p_user_id then
    raise exception 'Development observation session is not owned by user';
  end if;

  insert into public.construct_session_distributions (
    user_id, analysis_session_id, sport_id, action_type, construct_id,
    context_signature, context_dimensions, sample_count, median_score, spread, success_rate,
    confidence, capture_score, engine_version, runtime_signature, evidence_ids
  ) values (
    p_user_id, p_session_id, p_sport_id, p_action_type, p_construct_id,
    p_context_signature, coalesce(p_context_dimensions, '{}'::jsonb), p_sample_count, p_median_score, p_spread, p_success_rate,
    p_confidence, p_capture_score, p_engine_version, p_runtime_signature, coalesce(p_evidence_ids, '{}')
  ) on conflict (analysis_session_id, construct_id, context_signature) do update set
    sample_count = excluded.sample_count,
    context_dimensions = excluded.context_dimensions,
    median_score = excluded.median_score,
    spread = excluded.spread,
    success_rate = excluded.success_rate,
    confidence = excluded.confidence,
    capture_score = excluded.capture_score,
    engine_version = excluded.engine_version,
    runtime_signature = excluded.runtime_signature,
    evidence_ids = excluded.evidence_ids;

  select * into v_state from public.player_development_state
  where user_id = p_user_id and sport_id = p_sport_id and action_type = p_action_type
    and context_signature = p_context_signature
  for update;
  v_previous_cue := v_state.active_cue;

  insert into public.player_development_state (
    user_id, sport_id, action_type, context_signature, primary_construct_id,
    active_cue, success_metric, status, started_session_id, last_confirmed_session_id,
    evidence_summary, ontology_version
  ) values (
    p_user_id, p_sport_id, p_action_type, p_context_signature, p_construct_id,
    p_active_cue, p_success_metric, p_status, p_session_id, p_session_id,
    coalesce(p_evidence_summary, '{}'::jsonb), p_ontology_version
  ) on conflict (user_id, sport_id, action_type, context_signature) do update set
    primary_construct_id = excluded.primary_construct_id,
    active_cue = excluded.active_cue,
    success_metric = excluded.success_metric,
    status = excluded.status,
    last_confirmed_session_id = excluded.last_confirmed_session_id,
    evidence_summary = excluded.evidence_summary,
    ontology_version = excluded.ontology_version,
    revision = case
      when player_development_state.last_confirmed_session_id = excluded.last_confirmed_session_id
        and player_development_state.primary_construct_id = excluded.primary_construct_id
        and player_development_state.active_cue is not distinct from excluded.active_cue
        and player_development_state.success_metric is not distinct from excluded.success_metric
        and player_development_state.status = excluded.status
        and player_development_state.evidence_summary = excluded.evidence_summary
      then player_development_state.revision
      else player_development_state.revision + 1
    end,
    updated_at = now()
  returning * into v_state;

  insert into public.cue_history (
    development_state_id, user_id, analysis_session_id, previous_cue,
    next_cue, change_reason, evidence_ids
  ) values (
    v_state.id, p_user_id, p_session_id, v_previous_cue,
    p_active_cue, p_cue_change_reason, coalesce(p_evidence_ids, '{}')
  ) on conflict (development_state_id, analysis_session_id) do update set
    next_cue = excluded.next_cue,
    change_reason = excluded.change_reason,
    evidence_ids = excluded.evidence_ids;

  return v_state.id;
end;
$$;

revoke all on function public.apply_player_development_observation_v610(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.apply_player_development_observation_v610(
  uuid, uuid, text, text, text, jsonb, text, integer, numeric, numeric, numeric,
  numeric, numeric, text, text, text[], text, text, text, jsonb, text, text
) to service_role;

notify pgrst, 'reload schema';
