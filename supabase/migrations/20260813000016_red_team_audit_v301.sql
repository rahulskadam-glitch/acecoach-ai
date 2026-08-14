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

select
  to_regclass('public.profile_sports') as profile_sports,
  to_regclass('public.physical_profiles') as physical_profiles,
  to_regclass('public.consents') as consents,
  to_regclass('public.migration_integrity_findings') as migration_integrity_findings,
  exists (
    select 1 from pg_trigger
    where tgname = 'enforce_video_storage_ownership_v301'
      and not tgisinternal
  ) as video_ownership_guard_ready,
  exists (
    select 1 from pg_trigger
    where tgname = 'enforce_consent_age_guard_v301'
      and not tgisinternal
  ) as minor_consent_guard_ready;
