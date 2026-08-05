-- AceCoach AI multi-sport platform upgrade.
-- Run after 001, 002 and 003. Additive and safe for existing tennis data.

create table if not exists public.sports (
  id text primary key,
  name text not null unique,
  category text not null default 'motion_sport',
  enabled boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sports (id, name, configuration) values
  ('tennis', 'Tennis', '{"venue":"court"}'::jsonb),
  ('badminton', 'Badminton', '{"venue":"court"}'::jsonb),
  ('squash', 'Squash', '{"venue":"court"}'::jsonb),
  ('cricket', 'Cricket', '{"venue":"ground"}'::jsonb),
  ('table_tennis', 'Table Tennis', '{"venue":"table"}'::jsonb)
on conflict (id) do update set name = excluded.name, configuration = excluded.configuration;

alter table public.profiles
  add column if not exists primary_sport_id text references public.sports(id),
  add column if not exists sport_preferences jsonb not null default '{}'::jsonb;

update public.profiles set primary_sport_id = 'tennis' where primary_sport_id is null;
alter table public.profiles alter column primary_sport_id set default 'tennis';

create table if not exists public.profile_sports (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport_id text not null references public.sports(id),
  playing_level text,
  ranking_system text,
  ranking_value text,
  dominant_side text,
  goals text[] not null default array[]::text[],
  preferences jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, sport_id)
);

insert into public.profile_sports (
  profile_id, sport_id, playing_level, ranking_system, ranking_value,
  dominant_side, goals, is_primary
)
select id, coalesce(primary_sport_id, 'tennis'), playing_level, ranking_system,
       ranking_value, dominant_hand, coalesce(goals, array[]::text[]), true
from public.profiles
on conflict (profile_id, sport_id) do nothing;

alter table public.videos
  add column if not exists sport_id text references public.sports(id),
  add column if not exists action_type text,
  add column if not exists capture_context jsonb not null default '{}'::jsonb;

update public.videos
set sport_id = 'tennis', action_type = coalesce(action_type, stroke_type)
where sport_id is null;
alter table public.videos alter column sport_id set default 'tennis';

alter table public.analysis
  add column if not exists sport_id text references public.sports(id),
  add column if not exists action_type text,
  add column if not exists metrics jsonb not null default '{}'::jsonb,
  add column if not exists model_trace jsonb not null default '{}'::jsonb,
  add column if not exists schema_version text not null default '1.0';

update public.analysis a
set sport_id = coalesce(v.sport_id, 'tennis'), action_type = coalesce(v.action_type, v.stroke_type)
from public.videos v
where a.video_id = v.id and a.sport_id is null;

create index if not exists idx_videos_sport_action on public.videos(sport_id, action_type);
create index if not exists idx_profile_sports_sport on public.profile_sports(sport_id);
create index if not exists idx_analysis_sport_action on public.analysis(sport_id, action_type);

alter table public.sports enable row level security;
alter table public.profile_sports enable row level security;

drop policy if exists "sports_read_enabled" on public.sports;
create policy "sports_read_enabled" on public.sports for select to authenticated, anon using (enabled = true);

drop policy if exists "profile_sports_select_own" on public.profile_sports;
drop policy if exists "profile_sports_insert_own" on public.profile_sports;
drop policy if exists "profile_sports_update_own" on public.profile_sports;
drop policy if exists "profile_sports_delete_own" on public.profile_sports;
create policy "profile_sports_select_own" on public.profile_sports for select to authenticated using (auth.uid() = profile_id);
create policy "profile_sports_insert_own" on public.profile_sports for insert to authenticated with check (auth.uid() = profile_id);
create policy "profile_sports_update_own" on public.profile_sports for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "profile_sports_delete_own" on public.profile_sports for delete to authenticated using (auth.uid() = profile_id);

create or replace function public.set_profile_sport_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp_profile_sports on public.profile_sports;
create trigger set_timestamp_profile_sports
before update on public.profile_sports
for each row execute function public.set_profile_sport_timestamp();

-- Keep exactly one primary sport where possible.
create or replace function public.sync_primary_sport()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_primary then
    update public.profile_sports
      set is_primary = false
      where profile_id = new.profile_id and sport_id <> new.sport_id and is_primary = true;
    update public.profiles set primary_sport_id = new.sport_id where id = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_primary_sport on public.profile_sports;
create trigger sync_profile_primary_sport
after insert or update of is_primary on public.profile_sports
for each row when (new.is_primary = true)
execute function public.sync_primary_sport();


-- Expand platform roles from tennis-specific player to multi-sport athlete.
do $$ begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role in ('athlete', 'player', 'coach', 'academy', 'admin'));
exception when duplicate_object then null; end $$;

-- Extend new-user profile creation with multi-sport metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  selected_sport text := coalesce(nullif(new.raw_user_meta_data ->> 'primary_sport_id', ''), 'tennis');
  selected_level text := coalesce(nullif(new.raw_user_meta_data ->> 'playing_level', ''), nullif(new.raw_user_meta_data ->> 'tennis_level', ''));
begin
  insert into public.profiles (
    id, email, first_name, last_name, country, playing_level,
    dominant_hand, goals, role, primary_sport_id
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    selected_level,
    nullif(new.raw_user_meta_data ->> 'handedness', ''),
    case when coalesce(new.raw_user_meta_data ->> 'primary_goal', '') = '' then array[]::text[] else array[new.raw_user_meta_data ->> 'primary_goal'] end,
    'athlete',
    selected_sport
  )
  on conflict (id) do update set
    email = excluded.email,
    primary_sport_id = excluded.primary_sport_id,
    playing_level = coalesce(public.profiles.playing_level, excluded.playing_level);

  insert into public.profile_sports (
    profile_id, sport_id, playing_level, dominant_side, goals, is_primary
  ) values (
    new.id,
    selected_sport,
    selected_level,
    nullif(new.raw_user_meta_data ->> 'handedness', ''),
    case when coalesce(new.raw_user_meta_data ->> 'primary_goal', '') = '' then array[]::text[] else array[new.raw_user_meta_data ->> 'primary_goal'] end,
    true
  ) on conflict (profile_id, sport_id) do nothing;

  return new;
end;
$$;
