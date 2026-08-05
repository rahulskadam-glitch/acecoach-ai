-- AceCoach AI v2.5: Athlete Improvement Loop
-- Adds player-first report intelligence, guided practice plans, and reassessment tracking.
-- Safe to run repeatedly after the v2.4 schema is present.

create extension if not exists "pgcrypto";

alter table public.analysis_reports
  add column if not exists performance_story jsonb not null default '{}'::jsonb,
  add column if not exists visual_moments jsonb not null default '[]'::jsonb,
  add column if not exists measurement_coverage jsonb not null default '{}'::jsonb,
  add column if not exists practice_plan jsonb not null default '{}'::jsonb;

create table if not exists public.practice_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  primary_goal text not null,
  coaching_cue text,
  why_it_matters text,
  plan jsonb not null default '{}'::jsonb,
  completion jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  reassessment_due_at timestamptz,
  reassessment_session_id uuid references public.analysis_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

alter table public.practice_plans
  drop constraint if exists practice_plans_status_check;
alter table public.practice_plans
  add constraint practice_plans_status_check
  check (status in ('active', 'ready_for_reassessment', 'completed', 'archived'));

create index if not exists idx_practice_plans_user_status
  on public.practice_plans(user_id, status, created_at desc);
create index if not exists idx_practice_plans_reassessment_due
  on public.practice_plans(user_id, reassessment_due_at)
  where status in ('active', 'ready_for_reassessment');

create or replace function public.enforce_practice_plan_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_session public.analysis_sessions%rowtype;
  reassessment_session public.analysis_sessions%rowtype;
begin
  select * into source_session
  from public.analysis_sessions
  where id = new.session_id;

  if not found then
    raise exception 'Practice plan source session does not exist';
  end if;

  if source_session.user_id <> new.user_id then
    raise exception 'Practice plan user does not own the source session';
  end if;

  if source_session.sport_id <> new.sport_id then
    raise exception 'Practice plan sport does not match the source session';
  end if;

  if coalesce(source_session.analysis_action_type, source_session.action_type) <> new.action_type then
    raise exception 'Practice plan movement does not match the analyzed movement';
  end if;

  if new.reassessment_session_id is not null then
    select * into reassessment_session
    from public.analysis_sessions
    where id = new.reassessment_session_id;

    if not found
      or reassessment_session.user_id <> new.user_id
      or reassessment_session.sport_id <> new.sport_id then
      raise exception 'Reassessment session is not compatible with the practice plan';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_practice_plan_integrity on public.practice_plans;
create trigger enforce_practice_plan_integrity
before insert or update on public.practice_plans
for each row execute function public.enforce_practice_plan_integrity();

alter table public.practice_plans enable row level security;

drop policy if exists "practice_plans_select_own" on public.practice_plans;
create policy "practice_plans_select_own"
on public.practice_plans for select to authenticated
using (auth.uid() = user_id);

-- Writes are performed by authenticated server actions after ownership checks.
drop policy if exists "practice_plans_insert_own" on public.practice_plans;
drop policy if exists "practice_plans_update_own" on public.practice_plans;
drop policy if exists "practice_plans_delete_own" on public.practice_plans;

create or replace function public.touch_practice_plan_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_practice_plan_updated_at on public.practice_plans;
create trigger touch_practice_plan_updated_at
before update on public.practice_plans
for each row execute function public.touch_practice_plan_updated_at();

notify pgrst, 'reload schema';

select
  to_regclass('public.practice_plans') as practice_plans,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_reports'
      and column_name = 'performance_story'
  ) as report_upgrade_applied;
