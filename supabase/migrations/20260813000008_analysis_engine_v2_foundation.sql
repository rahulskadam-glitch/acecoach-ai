-- AceCoach AI frame-by-frame analysis foundation v2.
-- Run after 006_analysis_engine.sql and 007_analysis_engine_hardening.sql.
-- Safe to run repeatedly.

alter table public.videos
  add column if not exists content_hash text,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

alter table public.analysis_sessions
  add column if not exists input_fingerprint text,
  add column if not exists analysis_mode text not null default 'development_baseline',
  add column if not exists pose_model_version text,
  add column if not exists biomechanics_version text,
  add column if not exists scoring_version text,
  add column if not exists knowledge_version text,
  add column if not exists report_version text,
  add column if not exists engine_manifest jsonb not null default '{}'::jsonb,
  add column if not exists error_message text;

alter table public.analysis_reports
  add column if not exists engine_manifest jsonb not null default '{}'::jsonb,
  add column if not exists frame_summary jsonb not null default '{}'::jsonb,
  add column if not exists movement_timeline jsonb not null default '[]'::jsonb,
  add column if not exists input_fingerprint text;

create index if not exists idx_videos_content_hash
  on public.videos(user_id, content_hash)
  where content_hash is not null;

create index if not exists idx_analysis_sessions_fingerprint
  on public.analysis_sessions(user_id, input_fingerprint)
  where input_fingerprint is not null;

create index if not exists idx_analysis_reports_fingerprint
  on public.analysis_reports(user_id, input_fingerprint)
  where input_fingerprint is not null;

-- Recreate the critical hardening objects here so this migration remains usable
-- even when the earlier hardening migration was not applied successfully.
create unique index if not exists uq_analysis_sessions_user_video_engine
  on public.analysis_sessions(user_id, video_id, engine_version);

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

alter table public.analysis_sessions enable row level security;
alter table public.analysis_reports enable row level security;

drop policy if exists "analysis_sessions_insert_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_update_own" on public.analysis_sessions;
create policy "analysis_sessions_insert_own"
on public.analysis_sessions for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.videos v
    where v.id = video_id and v.user_id = auth.uid()
  )
);
create policy "analysis_sessions_update_own"
on public.analysis_sessions for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.videos v
    where v.id = video_id and v.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.videos v
    where v.id = video_id and v.user_id = auth.uid()
  )
);

drop policy if exists "analysis_reports_insert_own" on public.analysis_reports;
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;
create policy "analysis_reports_insert_own"
on public.analysis_reports for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
      and s.sport_id = sport_id
      and s.action_type = action_type
  )
);
create policy "analysis_reports_update_own"
on public.analysis_reports for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
      and s.sport_id = sport_id
      and s.action_type = action_type
  )
);
