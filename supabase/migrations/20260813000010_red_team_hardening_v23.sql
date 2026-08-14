-- AceCoach AI red-team hardening and coaching-complete report v2.3.
-- Run after 009_movement_intelligence_v21.sql. Safe to run repeatedly.

alter table public.analysis_sessions
  add column if not exists analysis_action_type text,
  add column if not exists confirmed_action_type text,
  add column if not exists movement_confirmation_status text not null default 'pending',
  add column if not exists score_status text not null default 'pending',
  add column if not exists quality_gate jsonb not null default '{}'::jsonb;

alter table public.analysis_reports
  add column if not exists analysis_action_type text,
  add column if not exists confirmed_action_type text,
  add column if not exists movement_confirmation_status text not null default 'pending',
  add column if not exists score_status text not null default 'legacy',
  add column if not exists score_label text not null default 'Technique score',
  add column if not exists quality_gate jsonb not null default '{}'::jsonb,
  add column if not exists coach_summary jsonb not null default '{}'::jsonb,
  add column if not exists repetitions jsonb not null default '[]'::jsonb;

create index if not exists idx_analysis_sessions_confirmation
  on public.analysis_sessions(user_id, movement_confirmation_status, created_at desc);

create index if not exists idx_analysis_reports_analysis_action
  on public.analysis_reports(user_id, analysis_action_type, created_at desc)
  where analysis_action_type is not null;

-- Preserve existing selected-action integrity while allowing a separately versioned
-- confirmed analysis action. Reports remain tied to the owned session and video.
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;
create policy "analysis_reports_update_own"
on public.analysis_reports
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.videos v
    where v.id = video_id
      and v.user_id = auth.uid()
  )
  and exists (
    select 1 from public.analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
      and s.video_id = video_id
      and s.sport_id = sport_id
      and s.action_type = action_type
  )
);
