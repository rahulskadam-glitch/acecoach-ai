-- AceCoach AI v6.0.0 — Simple Athlete Journey
-- Prerequisites: migrations 001 through 021.
-- Additive migration. Existing v5 videos, reports, practice plans, feedback, and access policies are preserved.

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists silhouette_preference text not null default 'player-matched';

-- v6 uses narrower coaching age bands while retaining every legacy v5 value.
alter table public.profiles drop constraint if exists profiles_age_band_check;
alter table public.profiles add constraint profiles_age_band_check
  check (age_band is null or age_band in (
    'under_10','10_12','13_15','16_18','19_29','30_39','40_49','50_59','60_plus',
    'under_13','13_17','18_24','25_34','35_44','45_54','55_plus'
  ));

do $$ begin
  alter table public.profiles add constraint profiles_silhouette_preference_check
    check (silhouette_preference in ('player-matched','neutral','female','male'));
exception when duplicate_object then null; end $$;

create table if not exists public.athlete_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_token_hash text,
  selected_sport_id text not null references public.sports(id),
  current_step text not null default 'sport',
  status text not null default 'active',
  video_id uuid references public.videos(id) on delete set null,
  analysis_session_id uuid references public.analysis_sessions(id) on delete set null,
  report_id uuid references public.analysis_reports(id) on delete set null,
  coaching_conversation_id uuid,
  draft_intake jsonb not null default '{}'::jsonb,
  completed_steps text[] not null default array[]::text[],
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.athlete_journeys add constraint athlete_journeys_step_check
    check (current_step in ('sport','auth','upload','analyze','report','coach'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.athlete_journeys add constraint athlete_journeys_status_check
    check (status in ('active','completed','expired','abandoned'));
exception when duplicate_object then null; end $$;

create unique index if not exists athlete_journeys_active_anon_unique
  on public.athlete_journeys(anonymous_token_hash)
  where anonymous_token_hash is not null and status = 'active';
create index if not exists athlete_journeys_user_sport_idx
  on public.athlete_journeys(user_id, selected_sport_id, updated_at desc);
create index if not exists athlete_journeys_expiry_idx
  on public.athlete_journeys(expires_at)
  where status = 'active';

create table if not exists public.coaching_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  status text not null default 'active',
  coaching_context_version text not null default 'report-grounded-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.coaching_conversations add constraint coaching_conversations_status_check
    check (status in ('active','archived','closed'));
exception when duplicate_object then null; end $$;

create unique index if not exists coaching_conversations_active_session_unique
  on public.coaching_conversations(user_id, analysis_session_id)
  where status = 'active';
create index if not exists coaching_conversations_user_updated_idx
  on public.coaching_conversations(user_id, updated_at desc);

create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coaching_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  message text not null,
  structured_references jsonb not null default '[]'::jsonb,
  model_manifest jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'accepted',
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.coaching_messages add constraint coaching_messages_role_check
    check (role in ('user','assistant','coach','system'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_messages add constraint coaching_messages_moderation_check
    check (moderation_status in ('accepted','flagged','blocked','reviewed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.coaching_messages add constraint coaching_messages_length_check
    check (char_length(message) between 1 and 5000);
exception when duplicate_object then null; end $$;

create index if not exists coaching_messages_conversation_created_idx
  on public.coaching_messages(conversation_id, created_at);
create index if not exists coaching_messages_user_idx
  on public.coaching_messages(user_id, created_at desc);

create table if not exists public.oauth_provider_health (
  provider text primary key,
  enabled boolean not null default false,
  public_status text not null default 'not_configured',
  last_configuration_check timestamptz,
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.oauth_provider_health add constraint oauth_provider_health_status_check
    check (public_status in ('healthy','degraded','not_configured','disabled'));
exception when duplicate_object then null; end $$;

insert into public.oauth_provider_health(provider, enabled, public_status)
values
  ('google', false, 'not_configured'),
  ('apple', false, 'not_configured'),
  ('azure', false, 'not_configured'),
  ('facebook', false, 'not_configured'),
  ('email', true, 'healthy')
on conflict (provider) do nothing;

alter table public.athlete_journeys enable row level security;
alter table public.coaching_conversations enable row level security;
alter table public.coaching_messages enable row level security;
alter table public.oauth_provider_health enable row level security;

drop policy if exists "athlete_journeys_select_own" on public.athlete_journeys;
drop policy if exists "athlete_journeys_update_own" on public.athlete_journeys;
create policy "athlete_journeys_select_own" on public.athlete_journeys
  for select to authenticated using (auth.uid() = user_id);
create policy "athlete_journeys_update_own" on public.athlete_journeys
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anonymous journey creation and attachment are server-only through the service-role client.
-- No anon insert/select policy is intentionally provided.

drop policy if exists "coaching_conversations_select_own" on public.coaching_conversations;
drop policy if exists "coaching_conversations_insert_own" on public.coaching_conversations;
drop policy if exists "coaching_conversations_update_own" on public.coaching_conversations;
create policy "coaching_conversations_select_own" on public.coaching_conversations
  for select to authenticated using (auth.uid() = user_id);
create policy "coaching_conversations_insert_own" on public.coaching_conversations
  for insert to authenticated with check (auth.uid() = user_id);
create policy "coaching_conversations_update_own" on public.coaching_conversations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "coaching_messages_select_own" on public.coaching_messages;
create policy "coaching_messages_select_own" on public.coaching_messages
  for select to authenticated using (auth.uid() = user_id);
-- Message writes are server-only to enforce report grounding and output validation.

drop policy if exists "oauth_provider_health_read" on public.oauth_provider_health;
create policy "oauth_provider_health_read" on public.oauth_provider_health
  for select to anon, authenticated using (true);

create or replace function public.set_v600_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_athlete_journeys_updated_at on public.athlete_journeys;
create trigger set_athlete_journeys_updated_at before update on public.athlete_journeys
for each row execute function public.set_v600_updated_at();

drop trigger if exists set_coaching_conversations_updated_at on public.coaching_conversations;
create trigger set_coaching_conversations_updated_at before update on public.coaching_conversations
for each row execute function public.set_v600_updated_at();

drop trigger if exists set_oauth_provider_health_updated_at on public.oauth_provider_health;
create trigger set_oauth_provider_health_updated_at before update on public.oauth_provider_health
for each row execute function public.set_v600_updated_at();

alter table public.athlete_journeys
  drop constraint if exists athlete_journeys_coaching_conversation_id_fkey;
alter table public.athlete_journeys
  add constraint athlete_journeys_coaching_conversation_id_fkey
  foreign key (coaching_conversation_id) references public.coaching_conversations(id) on delete set null;

-- Verification queries:
-- select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='silhouette_preference';
-- select tablename from pg_tables where schemaname='public' and tablename in ('athlete_journeys','coaching_conversations','coaching_messages','oauth_provider_health') order by tablename;
-- select policyname, tablename from pg_policies where schemaname='public' and tablename in ('athlete_journeys','coaching_conversations','coaching_messages','oauth_provider_health') order by tablename, policyname;

-- Rollback note:
-- Back up data first. Then drop coaching_messages, coaching_conversations, athlete_journeys,
-- oauth_provider_health, and the profiles.silhouette_preference column only if no v6 data must be retained.
