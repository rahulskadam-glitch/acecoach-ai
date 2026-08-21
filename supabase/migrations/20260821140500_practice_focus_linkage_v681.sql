-- Athlentra Tennis v6.8.1 — link practice plans to the belief they're meant to address.
--
-- practice_checkins already links to practice_plans via plan_id, so the missing join is one
-- hop up: practice_plans -> player_development_state. This closes the structural gap where
-- there was no way to tell whether a completed drill corresponded to the athlete's active
-- coaching focus, or what it did to that focus's retention.

alter table public.practice_plans
  add column if not exists primary_construct_id text,
  add column if not exists context_signature text,
  add column if not exists development_state_id uuid references public.player_development_state(id) on delete set null;

create index if not exists practice_plans_development_state_idx
  on public.practice_plans(development_state_id)
  where development_state_id is not null;

create or replace function public.upsert_active_practice_plan_v681(
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
  p_knowledge_manifest_hash text,
  p_construct_id text,
  p_context_signature text,
  p_development_state_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  v_plan_id := public.upsert_active_practice_plan_v650(
    p_user_id, p_session_id, p_sport_id, p_action_type, p_primary_goal,
    p_coaching_cue, p_why_it_matters, p_plan, p_completion, p_reassessment_due_at,
    p_knowledge_policy_version, p_knowledge_manifest_hash
  );
  update public.practice_plans
  set primary_construct_id = p_construct_id,
      context_signature = p_context_signature,
      development_state_id = p_development_state_id
  where id = v_plan_id and user_id = p_user_id;
  return v_plan_id;
end;
$$;

revoke execute on function public.upsert_active_practice_plan_v650(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz, text, text
) from service_role;
revoke all on function public.upsert_active_practice_plan_v681(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.upsert_active_practice_plan_v681(
  uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz, text, text, text, text, uuid
) to service_role;

notify pgrst, 'reload schema';
