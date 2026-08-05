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
