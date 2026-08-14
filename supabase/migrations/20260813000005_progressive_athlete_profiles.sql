-- Progressive athlete profiling and consent model.
-- Run after 004_multisport_platform.sql.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age_band text,
  add column if not exists country_code text,
  add column if not exists language_code text not null default 'en',
  add column if not exists measurement_system text not null default 'metric',
  add column if not exists onboarding_status text not null default 'account_created',
  add column if not exists years_playing smallint,
  add column if not exists training_sessions_per_week smallint,
  add column if not exists competition_level text;

alter table public.profiles alter column primary_sport_id drop default;

do $$ begin
  alter table public.profiles add constraint profiles_age_band_check
    check (age_band is null or age_band in ('under_13','13_17','18_24','25_34','35_44','45_54','55_plus'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_measurement_system_check
    check (measurement_system in ('metric','imperial'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_onboarding_status_check
    check (onboarding_status in ('account_created','essentials_complete','profile_enriched'));
exception when duplicate_object then null; end $$;

alter table public.profile_sports
  add column if not exists years_playing smallint,
  add column if not exists competition_level text,
  add column if not exists primary_role text,
  add column if not exists playing_style text,
  add column if not exists sport_attributes jsonb not null default '{}'::jsonb;

create table if not exists public.physical_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  mobility_considerations text,
  updated_at timestamptz not null default now()
);

create table if not exists public.consents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  service_processing boolean not null default false,
  derived_data_improvement boolean not null default false,
  raw_media_training boolean not null default false,
  marketing boolean not null default false,
  parental_consent boolean not null default false,
  consent_version text not null default '2026-07',
  granted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analysis(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  detected_action_correct boolean,
  helpfulness_score smallint check (helpfulness_score between 1 and 5),
  recommendation_followed boolean,
  outcome text,
  comments text,
  created_at timestamptz not null default now()
);

alter table public.physical_profiles enable row level security;
alter table public.consents enable row level security;
alter table public.analysis_feedback enable row level security;

create policy "physical_profiles_own" on public.physical_profiles for all to authenticated
using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "consents_own" on public.consents for all to authenticated
using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "analysis_feedback_own" on public.analysis_feedback for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  selected_sport text := nullif(new.raw_user_meta_data ->> 'primary_sport_id', '');
begin
  insert into public.profiles (
    id, email, first_name, last_name, display_name, country,
    role, primary_sport_id, onboarding_status
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    trim(coalesce(new.raw_user_meta_data ->> 'first_name', '') || ' ' || coalesce(new.raw_user_meta_data ->> 'last_name', '')),
    '',
    'athlete',
    selected_sport,
    'account_created'
  ) on conflict (id) do update set email = excluded.email;

  if selected_sport is not null then
    insert into public.profile_sports (profile_id, sport_id, is_primary)
    values (new.id, selected_sport, true)
    on conflict (profile_id, sport_id) do nothing;
  end if;

  return new;
end;
$$;
