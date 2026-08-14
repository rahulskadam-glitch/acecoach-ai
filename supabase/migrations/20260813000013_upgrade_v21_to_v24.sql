-- AceCoach AI single-step upgrade: Movement Intelligence v2.1 -> Red-Team Reviewed v2.4.
-- Run after 009_movement_intelligence_v21.sql. Safe to run repeatedly.

-- Report and session reliability metadata.
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

-- A withheld score is NULL, never a misleading zero.
alter table public.analysis_reports
  alter column overall_score drop not null;

-- Controlled status vocabulary.
alter table public.analysis_sessions
  drop constraint if exists analysis_sessions_movement_confirmation_status_check;
alter table public.analysis_sessions
  add constraint analysis_sessions_movement_confirmation_status_check
  check (movement_confirmation_status in ('pending', 'supported', 'confirmed'));

alter table public.analysis_reports
  drop constraint if exists analysis_reports_movement_confirmation_status_check;
alter table public.analysis_reports
  add constraint analysis_reports_movement_confirmation_status_check
  check (movement_confirmation_status in ('pending', 'supported', 'confirmed'));

alter table public.analysis_sessions
  drop constraint if exists analysis_sessions_score_status_check;
alter table public.analysis_sessions
  add constraint analysis_sessions_score_status_check
  check (score_status in (
    'pending', 'provisional_criterion_index', 'pending_movement_confirmation',
    'blocked_capture_quality', 'blocked_no_complete_repetition',
    'insufficient_repetitions_for_score', 'failed'
  ));

alter table public.analysis_reports
  drop constraint if exists analysis_reports_score_status_check;
alter table public.analysis_reports
  add constraint analysis_reports_score_status_check
  check (score_status in (
    'legacy', 'provisional_criterion_index', 'pending_movement_confirmation',
    'blocked_capture_quality', 'blocked_no_complete_repetition',
    'insufficient_repetitions_for_score'
  ));

-- Product-generated analysis records are read-only from authenticated browsers.
-- Next.js server actions write with SUPABASE_SERVICE_ROLE_KEY after ownership checks.
alter table public.analysis_sessions enable row level security;
alter table public.analysis_reports enable row level security;

drop policy if exists "analysis_sessions_insert_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_update_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_delete_own" on public.analysis_sessions;
drop policy if exists "analysis_reports_insert_own" on public.analysis_reports;
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;
drop policy if exists "analysis_reports_delete_own" on public.analysis_reports;

drop policy if exists "analysis_sessions_select_own" on public.analysis_sessions;
create policy "analysis_sessions_select_own"
on public.analysis_sessions for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "analysis_reports_select_own" on public.analysis_reports;
create policy "analysis_reports_select_own"
on public.analysis_reports for select to authenticated
using (auth.uid() = user_id);
