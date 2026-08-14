-- AceCoach AI scientific-integrity hardening v2.4.
-- Run after 010_red_team_hardening_v23.sql. Safe to run repeatedly.

-- A withheld score is represented as NULL, never as a misleading zero.
alter table public.analysis_reports
  alter column overall_score drop not null;

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
    'pending',
    'provisional_criterion_index',
    'pending_movement_confirmation',
    'blocked_capture_quality',
    'blocked_no_complete_repetition',
    'insufficient_repetitions_for_score',
    'failed'
  ));

alter table public.analysis_reports
  drop constraint if exists analysis_reports_score_status_check;
alter table public.analysis_reports
  add constraint analysis_reports_score_status_check
  check (score_status in (
    'legacy',
    'provisional_criterion_index',
    'pending_movement_confirmation',
    'blocked_capture_quality',
    'blocked_no_complete_repetition',
    'insufficient_repetitions_for_score'
  ));
