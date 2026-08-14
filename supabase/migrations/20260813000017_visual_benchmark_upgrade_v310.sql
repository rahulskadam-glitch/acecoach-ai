-- AceCoach AI v3.1.0 consolidated database upgrade
-- Run this single file when upgrading the v3.0/v3.0.1 package.
-- It repairs the known practice-plan prerequisite, reapplies repeat-safe v3
-- migrations, then installs the visual benchmark and feedback changes.

-- AceCoach AI v3.0.1 database repair
-- Creates the missing practice_plans prerequisite safely, then allows migrations 016 and 017 to run.
-- Safe to run repeatedly.

create extension if not exists "pgcrypto";

-- Fail early with a useful message if the analysis foundation is absent.
do $$
begin
  if to_regclass('public.analysis_sessions') is null then
    raise exception 'Missing public.analysis_sessions. Apply the analysis-engine foundation before this repair.';
  end if;

  if to_regclass('public.analysis_reports') is null then
    raise exception 'Missing public.analysis_reports. Apply the analysis-engine foundation before this repair.';
  end if;
end
$$;

-- Repair v2.4/v2.5 prerequisite columns that older partial databases may lack.
alter table public.analysis_sessions
  add column if not exists analysis_action_type text;

alter table public.analysis_reports
  add column if not exists analysis_action_type text,
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

-- Repair partially created copies of the table.
alter table public.practice_plans
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists session_id uuid references public.analysis_sessions(id) on delete cascade,
  add column if not exists sport_id text,
  add column if not exists action_type text,
  add column if not exists primary_goal text,
  add column if not exists coaching_cue text,
  add column if not exists why_it_matters text,
  add column if not exists plan jsonb not null default '{}'::jsonb,
  add column if not exists completion jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'active',
  add column if not exists reassessment_due_at timestamptz,
  add column if not exists reassessment_session_id uuid references public.analysis_sessions(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.practice_plans
  drop constraint if exists practice_plans_status_check;

alter table public.practice_plans
  add constraint practice_plans_status_check
  check (status in ('active', 'ready_for_reassessment', 'completed', 'archived'));

create unique index if not exists uq_practice_plans_session
  on public.practice_plans(session_id);

create index if not exists idx_practice_plans_user_status
  on public.practice_plans(user_id, status, created_at desc);

create index if not exists idx_practice_plans_reassessment_due
  on public.practice_plans(user_id, reassessment_due_at)
  where status in ('active', 'ready_for_reassessment');

create or replace function public.touch_practice_plan_updated_at()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.enforce_practice_plan_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_owner uuid;
  source_sport text;
  source_action text;
  reassessment_owner uuid;
  reassessment_sport text;
begin
  select
    user_id,
    sport_id,
    coalesce(analysis_action_type, action_type)
  into source_owner, source_sport, source_action
  from public.analysis_sessions
  where id = new.session_id;

  if source_owner is null then
    raise exception 'Practice plan source session does not exist';
  end if;

  if source_owner <> new.user_id then
    raise exception 'Practice plan user does not own the source session';
  end if;

  if source_sport <> new.sport_id then
    raise exception 'Practice plan sport does not match the source session';
  end if;

  if source_action is distinct from new.action_type then
    raise exception 'Practice plan movement does not match the analyzed movement';
  end if;

  if new.reassessment_session_id is not null then
    select user_id, sport_id
    into reassessment_owner, reassessment_sport
    from public.analysis_sessions
    where id = new.reassessment_session_id;

    if reassessment_owner is null
       or reassessment_owner <> new.user_id
       or reassessment_sport <> new.sport_id then
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

drop policy if exists "practice_plans_own" on public.practice_plans;
drop policy if exists "practice_plans_select_own" on public.practice_plans;
drop policy if exists "practice_plans_insert_own" on public.practice_plans;
drop policy if exists "practice_plans_update_own" on public.practice_plans;
drop policy if exists "practice_plans_delete_own" on public.practice_plans;

create policy "practice_plans_select_own"
on public.practice_plans
for select to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';


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


-- AceCoach AI v3.0.1 — internal red-team corrective migration.
-- Run after 016_review_driven_major_upgrade_v30.sql.
-- Repeat-safe. Repairs profile/consent regressions, strengthens tenant boundaries,
-- and adds database-level integrity checks for future writes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Progressive athlete context and consent
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age_band text,
  add column if not exists country_code text,
  add column if not exists language_code text not null default 'en',
  add column if not exists measurement_system text not null default 'metric',
  add column if not exists primary_sport_id text,
  add column if not exists onboarding_status text not null default 'account_created',
  add column if not exists years_playing smallint,
  add column if not exists training_sessions_per_week smallint,
  add column if not exists competition_level text;

create table if not exists public.profile_sports (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport_id text not null,
  playing_level text,
  ranking_system text,
  ranking_value text,
  dominant_side text,
  goals text[] not null default '{}'::text[],
  is_primary boolean not null default false,
  years_playing smallint,
  competition_level text,
  primary_role text,
  playing_style text,
  sport_attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, sport_id)
);

alter table public.profile_sports
  add column if not exists playing_level text,
  add column if not exists ranking_system text,
  add column if not exists ranking_value text,
  add column if not exists dominant_side text,
  add column if not exists goals text[] not null default '{}'::text[],
  add column if not exists is_primary boolean not null default false,
  add column if not exists years_playing smallint,
  add column if not exists competition_level text,
  add column if not exists primary_role text,
  add column if not exists playing_style text,
  add column if not exists sport_attributes jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.physical_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  mobility_considerations text,
  updated_at timestamptz not null default now()
);

alter table public.physical_profiles
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists mobility_considerations text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.consents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  service_processing boolean not null default false,
  derived_data_improvement boolean not null default false,
  raw_media_training boolean not null default false,
  marketing boolean not null default false,
  parental_consent boolean not null default false,
  consent_version text not null default '2026-07-v3.0.1',
  granted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.consents
  add column if not exists service_processing boolean not null default false,
  add column if not exists derived_data_improvement boolean not null default false,
  add column if not exists raw_media_training boolean not null default false,
  add column if not exists marketing boolean not null default false,
  add column if not exists parental_consent boolean not null default false,
  add column if not exists consent_version text not null default '2026-07-v3.0.1',
  add column if not exists granted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_age_band_check,
  add constraint profiles_age_band_check
    check (age_band is null or age_band in ('under_13','13_17','18_24','25_34','35_44','45_54','55_plus')),
  drop constraint if exists profiles_measurement_system_check,
  add constraint profiles_measurement_system_check
    check (measurement_system in ('metric','imperial')),
  drop constraint if exists profiles_onboarding_status_check,
  add constraint profiles_onboarding_status_check
    check (onboarding_status in ('account_created','essentials_complete','profile_enriched'));

-- Normalize any duplicate primary rows left by earlier releases.
with ranked_primary_sports as (
  select
    profile_id,
    sport_id,
    row_number() over (
      partition by profile_id
      order by updated_at desc nulls last, created_at desc nulls last, sport_id
    ) as row_rank
  from public.profile_sports
  where is_primary = true
)
update public.profile_sports ps
set is_primary = false,
    updated_at = now()
from ranked_primary_sports ranked
where ps.profile_id = ranked.profile_id
  and ps.sport_id = ranked.sport_id
  and ranked.row_rank > 1;

create or replace function public.enforce_single_primary_profile_sport_v301()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_primary then
    update public.profile_sports
    set is_primary = false,
        updated_at = now()
    where profile_id = new.profile_id
      and sport_id <> new.sport_id
      and is_primary = true;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists enforce_single_primary_profile_sport_v301 on public.profile_sports;
create trigger enforce_single_primary_profile_sport_v301
before insert or update of is_primary on public.profile_sports
for each row execute function public.enforce_single_primary_profile_sport_v301();

create unique index if not exists uq_profile_sports_one_primary
  on public.profile_sports(profile_id)
  where is_primary = true;

create or replace function public.enforce_consent_age_guard_v301()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  athlete_age smallint;
begin
  select age into athlete_age from public.profiles where id = new.profile_id;
  if athlete_age is not null and athlete_age < 18 then
    -- The controlled research beta has no verified guardian workflow yet.
    new.service_processing = false;
    new.raw_media_training = false;
    new.parental_consent = false;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists enforce_consent_age_guard_v301 on public.consents;
create trigger enforce_consent_age_guard_v301
before insert or update on public.consents
for each row execute function public.enforce_consent_age_guard_v301();

update public.consents c
set service_processing = false,
    raw_media_training = false,
    parental_consent = false,
    updated_at = now()
from public.profiles p
where p.id = c.profile_id
  and p.age is not null
  and p.age < 18
  and (c.service_processing or c.raw_media_training or c.parental_consent);

-- Save the related athlete-context rows atomically. Browser clients cannot call
-- this function; the authenticated server action supplies the verified user ID.
create or replace function public.save_athlete_profile_v301(
  p_profile_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_age smallint,
  p_age_band text,
  p_country text,
  p_country_code text,
  p_primary_sport_id text,
  p_playing_level text,
  p_dominant_side text,
  p_goals text[],
  p_years_playing smallint,
  p_training_sessions smallint,
  p_competition_level text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_mobility_considerations text,
  p_service_processing boolean,
  p_derived_data_improvement boolean,
  p_raw_media_training boolean,
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_profile_id is null or p_first_name is null or p_last_name is null then
    raise exception 'Required athlete profile values are missing';
  end if;
  if p_age < 5 or p_age > 100 then
    raise exception 'Athlete age is outside the supported range';
  end if;
  if p_age >= 18 and not p_service_processing then
    raise exception 'Service-processing consent is required for analysis';
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, display_name, age, age_band, country,
    country_code, language_code, measurement_system, primary_sport_id,
    playing_level, dominant_hand, goals, years_playing,
    training_sessions_per_week, competition_level, onboarding_status
  ) values (
    p_profile_id, p_email, p_first_name, p_last_name,
    btrim(p_first_name || ' ' || p_last_name), p_age, p_age_band, p_country,
    p_country_code, 'en', 'metric', p_primary_sport_id, p_playing_level,
    p_dominant_side, coalesce(p_goals, '{}'::text[]), p_years_playing,
    p_training_sessions, p_competition_level,
    case when p_years_playing is not null or p_competition_level is not null
      then 'profile_enriched' else 'essentials_complete' end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    display_name = excluded.display_name,
    age = excluded.age,
    age_band = excluded.age_band,
    country = excluded.country,
    country_code = excluded.country_code,
    language_code = excluded.language_code,
    measurement_system = excluded.measurement_system,
    primary_sport_id = excluded.primary_sport_id,
    playing_level = excluded.playing_level,
    dominant_hand = excluded.dominant_hand,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    training_sessions_per_week = excluded.training_sessions_per_week,
    competition_level = excluded.competition_level,
    onboarding_status = excluded.onboarding_status,
    updated_at = now();

  update public.profile_sports
  set is_primary = false,
      updated_at = now()
  where profile_id = p_profile_id
    and sport_id <> p_primary_sport_id
    and is_primary = true;

  insert into public.profile_sports (
    profile_id, sport_id, playing_level, dominant_side, goals,
    years_playing, competition_level, is_primary, updated_at
  ) values (
    p_profile_id, p_primary_sport_id, p_playing_level, p_dominant_side,
    coalesce(p_goals, '{}'::text[]), p_years_playing, p_competition_level,
    true, now()
  )
  on conflict (profile_id, sport_id) do update set
    playing_level = excluded.playing_level,
    dominant_side = excluded.dominant_side,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    competition_level = excluded.competition_level,
    is_primary = true,
    updated_at = now();

  insert into public.physical_profiles (
    profile_id, height_cm, weight_kg, mobility_considerations, updated_at
  ) values (
    p_profile_id, p_height_cm, p_weight_kg, p_mobility_considerations, now()
  )
  on conflict (profile_id) do update set
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    mobility_considerations = excluded.mobility_considerations,
    updated_at = now();

  insert into public.consents (
    profile_id, service_processing, derived_data_improvement,
    raw_media_training, parental_consent, consent_version, granted_at, updated_at
  ) values (
    p_profile_id,
    case when p_age < 18 then false else p_service_processing end,
    p_derived_data_improvement,
    case when p_age < 18 then false else p_raw_media_training end,
    false,
    p_consent_version,
    case when p_age < 18 then null else now() end,
    now()
  )
  on conflict (profile_id) do update set
    service_processing = excluded.service_processing,
    derived_data_improvement = excluded.derived_data_improvement,
    raw_media_training = excluded.raw_media_training,
    parental_consent = excluded.parental_consent,
    consent_version = excluded.consent_version,
    granted_at = excluded.granted_at,
    updated_at = now();
end;
$$;

create or replace function public.reset_coaching_profile_v301(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.consents where profile_id = p_profile_id;
  delete from public.physical_profiles where profile_id = p_profile_id;
  delete from public.profile_sports where profile_id = p_profile_id;
  update public.profiles
  set age = null,
      age_band = null,
      primary_sport_id = null,
      playing_level = null,
      dominant_hand = null,
      goals = '{}'::text[],
      years_playing = null,
      training_sessions_per_week = null,
      competition_level = null,
      onboarding_status = 'account_created',
      updated_at = now()
  where id = p_profile_id;
end;
$$;

revoke all on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) to service_role;
revoke all on function public.reset_coaching_profile_v301(uuid) from public, anon, authenticated;
grant execute on function public.reset_coaching_profile_v301(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Video tenant-boundary and metadata integrity
-- ---------------------------------------------------------------------------

alter table public.videos
  add column if not exists sport_id text not null default 'tennis',
  add column if not exists action_type text not null default 'forehand',
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text,
  add column if not exists content_hash text;

alter table public.videos
  drop constraint if exists videos_file_size_check_v301,
  add constraint videos_file_size_check_v301
    check (file_size_bytes is null or (file_size_bytes > 0 and file_size_bytes <= 524288000)),
  drop constraint if exists videos_duration_check_v301,
  add constraint videos_duration_check_v301
    check (duration is null or (duration >= 1.5 and duration <= 30.25)),
  drop constraint if exists videos_content_hash_check_v301,
  add constraint videos_content_hash_check_v301
    check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$');

create or replace function public.enforce_video_storage_ownership_v301()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.storage_path is null
     or new.storage_path not like new.user_id::text || '/' || new.sport_id || '/%'
     or position('..' in new.storage_path) > 0
     or position(E'\\' in new.storage_path) > 0
     or char_length(new.storage_path) > 500 then
    raise exception 'Video storage path does not match the owning user and sport';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_video_storage_ownership_v301 on public.videos;
create trigger enforce_video_storage_ownership_v301
before insert or update of user_id, sport_id, storage_path on public.videos
for each row execute function public.enforce_video_storage_ownership_v301();

-- Existing rows created by early releases may not include the sport folder.
-- Do not silently rewrite storage paths. Flag them for operator review instead.
create table if not exists public.migration_integrity_findings (
  id uuid primary key default gen_random_uuid(),
  finding_type text not null,
  record_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

insert into public.migration_integrity_findings (finding_type, record_id, details)
select
  'legacy_video_storage_path',
  id,
  jsonb_build_object('storage_path', storage_path, 'user_id', user_id, 'sport_id', sport_id)
from public.videos
where storage_path not like user_id::text || '/' || sport_id || '/%'
  and not exists (
    select 1 from public.migration_integrity_findings f
    where f.finding_type = 'legacy_video_storage_path'
      and f.record_id = videos.id
      and f.resolved_at is null
  );

-- ---------------------------------------------------------------------------
-- RLS and controlled browser access
-- ---------------------------------------------------------------------------

alter table public.profile_sports enable row level security;
alter table public.physical_profiles enable row level security;
alter table public.consents enable row level security;
alter table public.migration_integrity_findings enable row level security;

drop policy if exists "profile_sports_own" on public.profile_sports;
drop policy if exists "profile_sports_select_own" on public.profile_sports;
drop policy if exists "profile_sports_insert_own" on public.profile_sports;
drop policy if exists "profile_sports_update_own" on public.profile_sports;
drop policy if exists "profile_sports_delete_own" on public.profile_sports;
create policy "profile_sports_select_own" on public.profile_sports
for select to authenticated using (auth.uid() = profile_id);
create policy "profile_sports_insert_own" on public.profile_sports
for insert to authenticated with check (auth.uid() = profile_id);
create policy "profile_sports_update_own" on public.profile_sports
for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "profile_sports_delete_own" on public.profile_sports
for delete to authenticated using (auth.uid() = profile_id);

drop policy if exists "physical_profiles_own" on public.physical_profiles;
drop policy if exists "physical_profiles_select_own" on public.physical_profiles;
drop policy if exists "physical_profiles_insert_own" on public.physical_profiles;
drop policy if exists "physical_profiles_update_own" on public.physical_profiles;
drop policy if exists "physical_profiles_delete_own" on public.physical_profiles;
create policy "physical_profiles_select_own" on public.physical_profiles
for select to authenticated using (auth.uid() = profile_id);
create policy "physical_profiles_insert_own" on public.physical_profiles
for insert to authenticated with check (auth.uid() = profile_id);
create policy "physical_profiles_update_own" on public.physical_profiles
for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "physical_profiles_delete_own" on public.physical_profiles
for delete to authenticated using (auth.uid() = profile_id);

drop policy if exists "consents_own" on public.consents;
drop policy if exists "consents_select_own" on public.consents;
drop policy if exists "consents_insert_own" on public.consents;
drop policy if exists "consents_update_own" on public.consents;
drop policy if exists "consents_delete_own" on public.consents;
create policy "consents_select_own" on public.consents
for select to authenticated using (auth.uid() = profile_id);
create policy "consents_insert_own" on public.consents
for insert to authenticated with check (auth.uid() = profile_id);
create policy "consents_update_own" on public.consents
for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "consents_delete_own" on public.consents
for delete to authenticated using (auth.uid() = profile_id);

-- Findings are operator-only. No browser policies are created.

-- ---------------------------------------------------------------------------
-- Share and report hardening
-- ---------------------------------------------------------------------------

update public.report_shares
set revoked_at = coalesce(revoked_at, now())
where revoked_at is null and expires_at <= now();

-- Keep only the newest unrevoked share for each athlete/session before adding
-- the partial unique index. Earlier releases could create more than one.
with ranked_active_shares as (
  select
    id,
    row_number() over (
      partition by user_id, session_id
      order by created_at desc, id desc
    ) as row_rank
  from public.report_shares
  where revoked_at is null
)
update public.report_shares rs
set revoked_at = now()
from ranked_active_shares ranked
where rs.id = ranked.id
  and ranked.row_rank > 1;

create unique index if not exists uq_report_shares_one_active_v301
  on public.report_shares(user_id, session_id)
  where revoked_at is null;

notify pgrst, 'reload schema';




-- ===========================================================================
-- AceCoach AI v3.1.0 Visual Benchmark Coach upgrade
-- Removes the temporary age-based product block, adds visual/reference feedback,
-- and exposes a service-role-only learning view for governed improvement.
-- ===========================================================================

drop trigger if exists enforce_consent_age_guard_v301 on public.consents;
drop function if exists public.enforce_consent_age_guard_v301();

create or replace function public.save_athlete_profile_v301(
  p_profile_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_age smallint,
  p_age_band text,
  p_country text,
  p_country_code text,
  p_primary_sport_id text,
  p_playing_level text,
  p_dominant_side text,
  p_goals text[],
  p_years_playing smallint,
  p_training_sessions smallint,
  p_competition_level text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_mobility_considerations text,
  p_service_processing boolean,
  p_derived_data_improvement boolean,
  p_raw_media_training boolean,
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_profile_id is null or p_first_name is null or p_last_name is null then
    raise exception 'Required athlete profile values are missing';
  end if;
  if p_age < 5 or p_age > 100 then
    raise exception 'Athlete age is outside the supported range';
  end if;
  if not p_service_processing then
    raise exception 'Service-processing consent is required for analysis';
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, display_name, age, age_band, country,
    country_code, language_code, measurement_system, primary_sport_id,
    playing_level, dominant_hand, goals, years_playing,
    training_sessions_per_week, competition_level, onboarding_status
  ) values (
    p_profile_id, p_email, p_first_name, p_last_name,
    btrim(p_first_name || ' ' || p_last_name), p_age, p_age_band, p_country,
    p_country_code, 'en', 'metric', p_primary_sport_id, p_playing_level,
    p_dominant_side, coalesce(p_goals, '{}'::text[]), p_years_playing,
    p_training_sessions, p_competition_level,
    case when p_years_playing is not null or p_competition_level is not null
      then 'profile_enriched' else 'essentials_complete' end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    display_name = excluded.display_name,
    age = excluded.age,
    age_band = excluded.age_band,
    country = excluded.country,
    country_code = excluded.country_code,
    language_code = excluded.language_code,
    measurement_system = excluded.measurement_system,
    primary_sport_id = excluded.primary_sport_id,
    playing_level = excluded.playing_level,
    dominant_hand = excluded.dominant_hand,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    training_sessions_per_week = excluded.training_sessions_per_week,
    competition_level = excluded.competition_level,
    onboarding_status = excluded.onboarding_status,
    updated_at = now();

  update public.profile_sports
  set is_primary = false,
      updated_at = now()
  where profile_id = p_profile_id
    and sport_id <> p_primary_sport_id
    and is_primary = true;

  insert into public.profile_sports (
    profile_id, sport_id, playing_level, dominant_side, goals,
    years_playing, competition_level, is_primary, updated_at
  ) values (
    p_profile_id, p_primary_sport_id, p_playing_level, p_dominant_side,
    coalesce(p_goals, '{}'::text[]), p_years_playing, p_competition_level,
    true, now()
  )
  on conflict (profile_id, sport_id) do update set
    playing_level = excluded.playing_level,
    dominant_side = excluded.dominant_side,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    competition_level = excluded.competition_level,
    is_primary = true,
    updated_at = now();

  insert into public.physical_profiles (
    profile_id, height_cm, weight_kg, mobility_considerations, updated_at
  ) values (
    p_profile_id, p_height_cm, p_weight_kg, p_mobility_considerations, now()
  )
  on conflict (profile_id) do update set
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    mobility_considerations = excluded.mobility_considerations,
    updated_at = now();

  insert into public.consents (
    profile_id, service_processing, derived_data_improvement,
    raw_media_training, parental_consent, consent_version, granted_at, updated_at
  ) values (
    p_profile_id,
    p_service_processing,
    p_derived_data_improvement,
    p_raw_media_training,
    false,
    p_consent_version,
    now(),
    now()
  )
  on conflict (profile_id) do update set
    service_processing = excluded.service_processing,
    derived_data_improvement = excluded.derived_data_improvement,
    raw_media_training = excluded.raw_media_training,
    parental_consent = excluded.parental_consent,
    consent_version = excluded.consent_version,
    granted_at = excluded.granted_at,
    updated_at = now();
end;
$$;



revoke all on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) to service_role;

alter table public.analysis_feedback
  add column if not exists visual_clarity smallint,
  add column if not exists reference_helpfulness smallint,
  add column if not exists priority_fit smallint;

alter table public.analysis_feedback
  drop constraint if exists analysis_feedback_visual_clarity_check,
  drop constraint if exists analysis_feedback_reference_helpfulness_check,
  drop constraint if exists analysis_feedback_priority_fit_check;

alter table public.analysis_feedback
  add constraint analysis_feedback_visual_clarity_check
    check (visual_clarity is null or visual_clarity between 1 and 5),
  add constraint analysis_feedback_reference_helpfulness_check
    check (reference_helpfulness is null or reference_helpfulness between 1 and 5),
  add constraint analysis_feedback_priority_fit_check
    check (priority_fit is null or priority_fit between 1 and 5);

drop view if exists public.analysis_feedback_learning_v310;
create view public.analysis_feedback_learning_v310
with (security_invoker = true)
as
select
  f.id as feedback_id,
  f.session_id,
  s.sport_id,
  coalesce(s.analysis_action_type, s.action_type) as analysis_action_type,
  s.engine_version,
  f.movement_accuracy,
  f.coaching_clarity,
  f.visual_clarity,
  f.reference_helpfulness,
  f.priority_fit,
  f.drill_relevance,
  f.report_usefulness,
  f.issue_category,
  f.comment,
  f.created_at,
  f.updated_at
from public.analysis_feedback f
join public.analysis_sessions s on s.id = f.session_id;

revoke all on public.analysis_feedback_learning_v310 from public, anon, authenticated;
grant select on public.analysis_feedback_learning_v310 to service_role;

notify pgrst, 'reload schema';

select
  to_regclass('public.practice_plans') as practice_plans,
  to_regclass('public.practice_checkins') as practice_checkins,
  to_regclass('public.report_shares') as report_shares,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'analysis_feedback'
      and column_name = 'reference_helpfulness'
  ) as visual_feedback_ready,
  not exists (
    select 1 from pg_trigger where tgname = 'enforce_consent_age_guard_v301' and not tgisinternal
  ) as age_product_block_removed;
