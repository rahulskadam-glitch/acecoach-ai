-- AceCoach AI v3.0: review-led athlete experience and integrity upgrade.
-- Built to tolerate v2.5 databases that contain either the legacy or current
-- analysis_feedback shape. Safe to run repeatedly after migrations through v2.5.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Versioned analysis context and richer report payloads
-- ---------------------------------------------------------------------------

alter table public.analysis_sessions
  add column if not exists athlete_context_fingerprint text;

update public.analysis_sessions
set athlete_context_fingerprint = 'legacy'
where athlete_context_fingerprint is null;

alter table public.analysis_sessions
  alter column athlete_context_fingerprint set default 'legacy',
  alter column athlete_context_fingerprint set not null;

alter table public.analysis_reports
  add column if not exists athlete_context_fingerprint text,
  add column if not exists coaching_playbook jsonb not null default '{}'::jsonb,
  add column if not exists repetition_insights jsonb not null default '{}'::jsonb;

update public.analysis_reports
set athlete_context_fingerprint = 'legacy'
where athlete_context_fingerprint is null;

alter table public.analysis_reports
  alter column athlete_context_fingerprint set default 'legacy',
  alter column athlete_context_fingerprint set not null;

-- The old key could return a stale report after the athlete changed level,
-- side, goal, or age band. The context fingerprint is now part of the key.
drop index if exists public.uq_analysis_sessions_user_video_engine;
create unique index if not exists uq_analysis_sessions_user_video_engine_context
  on public.analysis_sessions(user_id, video_id, engine_version, athlete_context_fingerprint);

create index if not exists idx_analysis_sessions_context
  on public.analysis_sessions(user_id, athlete_context_fingerprint, created_at desc);

-- ---------------------------------------------------------------------------
-- Athlete feedback. Upgrade the legacy table in place when it already exists.
-- ---------------------------------------------------------------------------

create table if not exists public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.analysis_sessions(id) on delete cascade,
  movement_accuracy text not null default 'unsure',
  coaching_clarity smallint,
  drill_relevance smallint,
  report_usefulness smallint,
  issue_category text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analysis_feedback
  add column if not exists session_id uuid references public.analysis_sessions(id) on delete cascade,
  add column if not exists movement_accuracy text not null default 'unsure',
  add column if not exists coaching_clarity smallint,
  add column if not exists drill_relevance smallint,
  add column if not exists report_usefulness smallint,
  add column if not exists issue_category text,
  add column if not exists comment text,
  add column if not exists updated_at timestamptz not null default now();

-- A legacy analysis_id column was required in the early profile migration.
-- Keep the data, but allow modern session-linked feedback to be inserted.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_feedback'
      and column_name = 'analysis_id'
  ) then
    execute 'alter table public.analysis_feedback alter column analysis_id drop not null';
  end if;
end $$;

alter table public.analysis_feedback
  drop constraint if exists analysis_feedback_movement_accuracy_check,
  drop constraint if exists analysis_feedback_clarity_check,
  drop constraint if exists analysis_feedback_drill_check,
  drop constraint if exists analysis_feedback_usefulness_check,
  drop constraint if exists analysis_feedback_comment_length;

alter table public.analysis_feedback
  add constraint analysis_feedback_movement_accuracy_check
    check (movement_accuracy in ('accurate', 'incorrect', 'unsure')),
  add constraint analysis_feedback_clarity_check
    check (coaching_clarity is null or coaching_clarity between 1 and 5),
  add constraint analysis_feedback_drill_check
    check (drill_relevance is null or drill_relevance between 1 and 5),
  add constraint analysis_feedback_usefulness_check
    check (report_usefulness is null or report_usefulness between 1 and 5),
  add constraint analysis_feedback_comment_length
    check (comment is null or char_length(comment) <= 2000);

create unique index if not exists uq_analysis_feedback_user_session
  on public.analysis_feedback(user_id, session_id);

-- ---------------------------------------------------------------------------
-- Guided-practice evidence and secure coach summaries
-- ---------------------------------------------------------------------------

create table if not exists public.practice_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.practice_plans(id) on delete cascade,
  session_item_id text not null,
  target_hits integer,
  attempts integer,
  effort text,
  confidence_before smallint,
  confidence_after smallint,
  note text,
  created_at timestamptz not null default now(),
  constraint practice_checkins_target_check check (target_hits is null or target_hits >= 0),
  constraint practice_checkins_attempts_check check (attempts is null or attempts >= 0),
  constraint practice_checkins_counts_check check (target_hits is null or attempts is null or target_hits <= attempts),
  constraint practice_checkins_effort_check check (effort is null or effort in ('easy', 'just_right', 'hard')),
  constraint practice_checkins_confidence_before_check check (confidence_before is null or confidence_before between 1 and 5),
  constraint practice_checkins_confidence_after_check check (confidence_after is null or confidence_after between 1 and 5),
  constraint practice_checkins_note_length check (note is null or char_length(note) <= 1000)
);

create index if not exists idx_practice_checkins_plan_created
  on public.practice_checkins(plan_id, created_at desc);

create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_shares_expiry_check check (expires_at > created_at),
  constraint report_shares_view_count_check check (view_count >= 0)
);

create index if not exists idx_report_shares_session_active
  on public.report_shares(user_id, session_id, expires_at desc)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Ownership and timestamps
-- ---------------------------------------------------------------------------

create or replace function public.touch_review_led_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_analysis_feedback_updated_at on public.analysis_feedback;
create trigger touch_analysis_feedback_updated_at
before update on public.analysis_feedback
for each row execute function public.touch_review_led_updated_at();

create or replace function public.enforce_feedback_session_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_owner uuid;
begin
  if new.session_id is null then
    raise exception 'A session-linked feedback record is required';
  end if;
  select user_id into session_owner from public.analysis_sessions where id = new.session_id;
  if session_owner is null or session_owner <> new.user_id then
    raise exception 'Feedback session ownership mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_feedback_session_ownership on public.analysis_feedback;
create trigger enforce_feedback_session_ownership
before insert or update of user_id, session_id on public.analysis_feedback
for each row execute function public.enforce_feedback_session_ownership();

create or replace function public.enforce_checkin_plan_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_owner uuid;
begin
  select user_id into plan_owner from public.practice_plans where id = new.plan_id;
  if plan_owner is null or plan_owner <> new.user_id then
    raise exception 'Practice check-in ownership mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_checkin_plan_ownership on public.practice_checkins;
create trigger enforce_checkin_plan_ownership
before insert or update on public.practice_checkins
for each row execute function public.enforce_checkin_plan_ownership();

create or replace function public.enforce_report_share_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_owner uuid;
begin
  select user_id into session_owner from public.analysis_sessions where id = new.session_id;
  if session_owner is null or session_owner <> new.user_id then
    raise exception 'Report share ownership mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_report_share_ownership on public.report_shares;
create trigger enforce_report_share_ownership
before insert or update on public.report_shares
for each row execute function public.enforce_report_share_ownership();

-- ---------------------------------------------------------------------------
-- Atomic practice-plan replacement and share-view accounting
-- ---------------------------------------------------------------------------

create or replace function public.upsert_active_practice_plan_v30(
  p_user_id uuid,
  p_session_id uuid,
  p_sport_id text,
  p_action_type text,
  p_primary_goal text,
  p_coaching_cue text,
  p_why_it_matters text,
  p_plan jsonb,
  p_completion jsonb,
  p_reassessment_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  insert into public.practice_plans (
    user_id, session_id, sport_id, action_type, primary_goal,
    coaching_cue, why_it_matters, plan, completion, status,
    reassessment_due_at
  ) values (
    p_user_id, p_session_id, p_sport_id, p_action_type, p_primary_goal,
    p_coaching_cue, p_why_it_matters, p_plan, p_completion, 'active',
    p_reassessment_due_at
  )
  on conflict (session_id) do update set
    primary_goal = excluded.primary_goal,
    coaching_cue = excluded.coaching_cue,
    why_it_matters = excluded.why_it_matters,
    plan = excluded.plan,
    completion = excluded.completion,
    status = 'active',
    reassessment_due_at = excluded.reassessment_due_at,
    updated_at = now()
  returning id into result_id;

  update public.practice_plans
  set status = 'archived', updated_at = now()
  where user_id = p_user_id
    and sport_id = p_sport_id
    and action_type = p_action_type
    and session_id <> p_session_id
    and status in ('active', 'ready_for_reassessment');

  return result_id;
end;
$$;

create or replace function public.record_report_share_view_v30(p_share_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.report_shares
  set view_count = view_count + 1,
      last_viewed_at = now()
  where id = p_share_id
    and revoked_at is null
    and expires_at > now();
$$;

revoke all on function public.upsert_active_practice_plan_v30(uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_active_practice_plan_v30(uuid, uuid, text, text, text, text, text, jsonb, jsonb, timestamptz) to service_role;
revoke all on function public.record_report_share_view_v30(uuid) from public, anon, authenticated;
grant execute on function public.record_report_share_view_v30(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: browser clients can read only their own experience data. All writes
-- pass through authenticated server actions using the service role.
-- ---------------------------------------------------------------------------

alter table public.analysis_feedback enable row level security;
alter table public.practice_checkins enable row level security;
alter table public.report_shares enable row level security;

drop policy if exists "analysis_feedback_own" on public.analysis_feedback;
drop policy if exists "analysis_feedback_select_own" on public.analysis_feedback;
drop policy if exists "analysis_feedback_insert_own" on public.analysis_feedback;
drop policy if exists "analysis_feedback_update_own" on public.analysis_feedback;
drop policy if exists "analysis_feedback_delete_own" on public.analysis_feedback;
create policy "analysis_feedback_select_own" on public.analysis_feedback
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "practice_checkins_select_own" on public.practice_checkins;
drop policy if exists "practice_checkins_insert_own" on public.practice_checkins;
drop policy if exists "practice_checkins_update_own" on public.practice_checkins;
drop policy if exists "practice_checkins_delete_own" on public.practice_checkins;
create policy "practice_checkins_select_own" on public.practice_checkins
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "report_shares_select_own" on public.report_shares;
drop policy if exists "report_shares_insert_own" on public.report_shares;
drop policy if exists "report_shares_update_own" on public.report_shares;
drop policy if exists "report_shares_delete_own" on public.report_shares;
create policy "report_shares_select_own" on public.report_shares
for select to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';

select
  to_regclass('public.analysis_feedback') as analysis_feedback,
  to_regclass('public.practice_checkins') as practice_checkins,
  to_regclass('public.report_shares') as report_shares,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_sessions'
      and column_name = 'athlete_context_fingerprint'
  ) as context_versioning_ready,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_reports'
      and column_name = 'coaching_playbook'
  ) as report_payload_upgraded;
