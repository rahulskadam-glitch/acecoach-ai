-- AceCoach AI movement intelligence and coaching-complete report v2.1.
-- Run after 008_analysis_engine_v2_foundation.sql. Safe to run repeatedly.

alter table public.analysis_sessions
  add column if not exists detected_action_type text,
  add column if not exists movement_confidence numeric,
  add column if not exists movement_classification jsonb not null default '{}'::jsonb;

alter table public.analysis_reports
  add column if not exists detected_action_type text,
  add column if not exists movement_classification jsonb not null default '{}'::jsonb,
  add column if not exists coaching_areas jsonb not null default '[]'::jsonb,
  add column if not exists reference_comparison jsonb not null default '{}'::jsonb;

create index if not exists idx_analysis_sessions_detected_action
  on public.analysis_sessions(user_id, detected_action_type)
  where detected_action_type is not null;
