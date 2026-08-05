-- AceCoach AI deterministic analysis-engine foundation.
-- Safe to run repeatedly.

create extension if not exists "pgcrypto";

create table if not exists public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  status text not null default 'completed' check (status in ('queued','processing','completed','failed')),
  progress smallint not null default 100 check (progress between 0 and 100),
  current_stage text not null default 'report_ready',
  engine_version text not null default 'deterministic-v1',
  confidence numeric(4,3) not null default 0.75 check (confidence between 0 and 1),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.analysis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  overall_score smallint not null check (overall_score between 0 and 100),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  capture_quality jsonb not null default '{}'::jsonb,
  phase_scores jsonb not null default '[]'::jsonb,
  metric_scores jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '[]'::jsonb,
  drills jsonb not null default '[]'::jsonb,
  next_session jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  safety_note text not null default 'This analysis is educational and does not diagnose injury.',
  limitations jsonb not null default '[]'::jsonb,
  report_version text not null default '1.0',
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_sessions_user_created on public.analysis_sessions(user_id, created_at desc);
create index if not exists idx_analysis_sessions_video on public.analysis_sessions(video_id);
create index if not exists idx_analysis_reports_user_created on public.analysis_reports(user_id, created_at desc);
create index if not exists idx_analysis_reports_video on public.analysis_reports(video_id);

alter table public.analysis_sessions enable row level security;
alter table public.analysis_reports enable row level security;

drop policy if exists "analysis_sessions_select_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_insert_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_update_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_delete_own" on public.analysis_sessions;
create policy "analysis_sessions_select_own" on public.analysis_sessions for select to authenticated using (auth.uid() = user_id);
create policy "analysis_sessions_insert_own" on public.analysis_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "analysis_sessions_update_own" on public.analysis_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analysis_sessions_delete_own" on public.analysis_sessions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "analysis_reports_select_own" on public.analysis_reports;
drop policy if exists "analysis_reports_insert_own" on public.analysis_reports;
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;
drop policy if exists "analysis_reports_delete_own" on public.analysis_reports;
create policy "analysis_reports_select_own" on public.analysis_reports for select to authenticated using (auth.uid() = user_id);
create policy "analysis_reports_insert_own" on public.analysis_reports for insert to authenticated with check (auth.uid() = user_id);
create policy "analysis_reports_update_own" on public.analysis_reports for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analysis_reports_delete_own" on public.analysis_reports for delete to authenticated using (auth.uid() = user_id);
-- AceCoach AI analysis engine hardening.
-- Safe to run after 006_analysis_engine.sql and safe to run repeatedly.

create extension if not exists "pgcrypto";

-- Keep one deterministic report per user, video, and engine version.
create unique index if not exists uq_analysis_sessions_user_video_engine
  on public.analysis_sessions(user_id, video_id, engine_version);

-- Keep session timestamps accurate.
create or replace function public.set_analysis_session_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp_analysis_sessions on public.analysis_sessions;
create trigger set_timestamp_analysis_sessions
  before update on public.analysis_sessions
  for each row execute function public.set_analysis_session_timestamp();

-- A user may only create or change sessions for videos they own.
drop policy if exists "analysis_sessions_insert_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_update_own" on public.analysis_sessions;

create policy "analysis_sessions_insert_own"
on public.analysis_sessions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
);

create policy "analysis_sessions_update_own"
on public.analysis_sessions
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
);

-- Reports must reference both an owned video and an owned matching session.
drop policy if exists "analysis_reports_insert_own" on public.analysis_reports;
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;

create policy "analysis_reports_insert_own"
on public.analysis_reports
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
      and s.sport_id = sport_id
      and s.action_type = action_type
  )
);

create policy "analysis_reports_update_own"
on public.analysis_reports
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
      and s.sport_id = sport_id
      and s.action_type = action_type
  )
);
