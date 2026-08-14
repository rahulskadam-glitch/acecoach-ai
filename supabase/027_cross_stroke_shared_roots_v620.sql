-- AceCoach AI v6.2.0 — cross-stroke shared-root insights.
-- Additive and idempotent. Apply after migration 026.

create extension if not exists "pgcrypto";

create table if not exists public.shared_root_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport_id text not null,
  construct_id text not null,
  context_class text not null,
  archetype text not null default 'SHARED_ROOT_CONSTRUCT'
    check (archetype = 'SHARED_ROOT_CONSTRUCT'),
  action_types text[] not null,
  supporting_session_ids uuid[] not null,
  confidence numeric not null check (confidence between 0 and 1),
  shared_cue text,
  stroke_specific_cues jsonb not null default '{}'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  ontology_version text not null,
  last_observed_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sport_id, construct_id, context_class)
);

create index if not exists shared_root_insights_active_idx
  on public.shared_root_insights(user_id, sport_id, updated_at desc)
  where active = true;
create index if not exists shared_root_last_session_idx
  on public.shared_root_insights(last_observed_session_id);

alter table public.shared_root_insights enable row level security;
drop policy if exists "shared_root_insights_select_own" on public.shared_root_insights;
create policy "shared_root_insights_select_own" on public.shared_root_insights
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.upsert_shared_root_insight_v620(
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
  p_last_observed_session_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state_id uuid;
  v_owned_session_count integer;
begin
  if cardinality(p_action_types) < 2 or cardinality(p_supporting_session_ids) < 4 then
    raise exception 'Shared root requires independent evidence from at least two strokes';
  end if;
  select count(*) into v_owned_session_count
  from public.analysis_sessions
  where id = any(p_supporting_session_ids) and user_id = p_user_id;
  if v_owned_session_count <> cardinality(p_supporting_session_ids) then
    raise exception 'One or more supporting sessions are not owned by user';
  end if;
  if not exists (
    select 1 from public.analysis_sessions
    where id = p_last_observed_session_id and user_id = p_user_id
  ) then
    raise exception 'Last observed session is not owned by user';
  end if;

  update public.shared_root_insights
  set active = false, updated_at = now()
  where user_id = p_user_id and sport_id = p_sport_id and active = true;

  insert into public.shared_root_insights (
    user_id, sport_id, construct_id, context_class, action_types,
    supporting_session_ids, confidence, shared_cue, stroke_specific_cues,
    evidence_summary, ontology_version, last_observed_session_id, active
  ) values (
    p_user_id, p_sport_id, p_construct_id, p_context_class, p_action_types,
    p_supporting_session_ids, p_confidence, p_shared_cue,
    coalesce(p_stroke_specific_cues, '{}'::jsonb),
    coalesce(p_evidence_summary, '{}'::jsonb), p_ontology_version,
    p_last_observed_session_id, true
  ) on conflict (user_id, sport_id, construct_id, context_class) do update set
    action_types = excluded.action_types,
    supporting_session_ids = excluded.supporting_session_ids,
    confidence = excluded.confidence,
    shared_cue = excluded.shared_cue,
    stroke_specific_cues = excluded.stroke_specific_cues,
    evidence_summary = excluded.evidence_summary,
    ontology_version = excluded.ontology_version,
    last_observed_session_id = excluded.last_observed_session_id,
    active = true,
    updated_at = now()
  returning id into v_state_id;
  return v_state_id;
end;
$$;

revoke all on function public.upsert_shared_root_insight_v620(
  uuid, text, text, text, text[], uuid[], numeric, text, jsonb, jsonb, text, uuid
) from public, anon, authenticated;
grant execute on function public.upsert_shared_root_insight_v620(
  uuid, text, text, text, text[], uuid[], numeric, text, jsonb, jsonb, text, uuid
) to service_role;

create or replace function public.deactivate_shared_root_insights_v620(
  p_user_id uuid,
  p_sport_id text,
  p_last_observed_session_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.analysis_sessions
    where id = p_last_observed_session_id and user_id = p_user_id
  ) then
    raise exception 'Observed session is not owned by user';
  end if;
  update public.shared_root_insights
  set active = false, updated_at = now()
  where user_id = p_user_id and sport_id = p_sport_id and active = true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.deactivate_shared_root_insights_v620(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.deactivate_shared_root_insights_v620(uuid, text, uuid)
  to service_role;

notify pgrst, 'reload schema';
