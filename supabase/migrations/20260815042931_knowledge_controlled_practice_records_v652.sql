-- Athlentra Tennis v6.5.2 — only traced recommendations may create practice records.

alter table public.practice_plans
  add column if not exists knowledge_policy_version text,
  add column if not exists knowledge_manifest_hash text;

do $$ begin
  alter table public.practice_plans add constraint practice_plans_knowledge_trace_pair_check
    check (
      (knowledge_policy_version is null and knowledge_manifest_hash is null)
      or (knowledge_policy_version is not null and knowledge_manifest_hash is not null)
    );
exception when duplicate_object then null; end $$;

create index if not exists practice_plans_knowledge_trace_idx
  on public.practice_plans(user_id, knowledge_policy_version, knowledge_manifest_hash, created_at desc)
  where knowledge_policy_version is not null and knowledge_manifest_hash is not null;

create or replace function public.upsert_active_practice_plan_v650(
  p_user_id uuid,
  p_session_id uuid,
  p_sport_id text,
  p_action_type text,
  p_primary_goal text,
  p_coaching_cue text,
  p_why_it_matters text,
  p_plan jsonb,
  p_completion jsonb,
  p_reassessment_due_at timestamptz,
  p_knowledge_policy_version text,
  p_knowledge_manifest_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  if not exists (
    select 1 from public.analysis_reports
    where session_id = p_session_id
      and user_id = p_user_id
      and knowledge_policy_version = p_knowledge_policy_version
      and knowledge_manifest_hash = p_knowledge_manifest_hash
      and knowledge_control->>'status' = 'CONTROLLED'
      and coalesce(knowledge_control #>> '{domains,recommendations,authorized}', 'false') = 'true'
      and knowledge_control #>> '{domains,recommendations,decision}' = 'ontology_fault_links'
      and coalesce(knowledge_control #>> '{domains,records,authorized}', 'false') = 'true'
  ) then
    raise exception 'Source analysis report is not authorized for a practice prescription';
  end if;

  v_plan_id := public.upsert_active_practice_plan_v30(
    p_user_id, p_session_id, p_sport_id, p_action_type, p_primary_goal,
    p_coaching_cue, p_why_it_matters, p_plan, p_completion, p_reassessment_due_at
  );
  update public.practice_plans
  set knowledge_policy_version = p_knowledge_policy_version,
      knowledge_manifest_hash = p_knowledge_manifest_hash
  where id = v_plan_id and user_id = p_user_id;
  return v_plan_id;
end;
$$;

revoke execute on function public.upsert_active_practice_plan_v30(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz
) from service_role;
revoke all on function public.upsert_active_practice_plan_v650(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_active_practice_plan_v650(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz, text, text
) to service_role;

notify pgrst, 'reload schema';
