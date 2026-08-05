-- AceCoach AI v6.0.0 — CoachVision shot-context compatibility
-- Additive and idempotent. The application also has a session-level fallback
-- so analysis remains available while this migration is being deployed.

alter table public.videos
  add column if not exists capture_context jsonb not null default '{}'::jsonb;

comment on column public.videos.capture_context is
  'Athlete-supplied camera view, shot situation, shot intention, and coaching question for this exact clip.';

-- Verification:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'videos' and column_name = 'capture_context';
