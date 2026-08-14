-- AceCoach AI v6.3.0 — red-team release hardening.

create table if not exists public.analysis_postprocessing_jobs (
  session_id uuid primary key references public.analysis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport_id text not null,
  action_type text not null,
  capture_context jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analysis_postprocessing_jobs enable row level security;
revoke all on table public.analysis_postprocessing_jobs from public, anon, authenticated;
grant all on table public.analysis_postprocessing_jobs to service_role;

create index if not exists analysis_postprocessing_retry_idx
  on public.analysis_postprocessing_jobs(status, next_attempt_at)
  where status in ('pending', 'failed');
create index if not exists analysis_postprocessing_user_created_idx
  on public.analysis_postprocessing_jobs(user_id, created_at desc);

alter function public.set_timestamp() set search_path = '';
alter function public.touch_practice_plan_updated_at() set search_path = '';
alter function public.set_product_feedback_timestamp() set search_path = '';
alter function public.set_v600_updated_at() set search_path = '';

revoke execute on function public.enforce_checkin_plan_ownership() from public, anon, authenticated;
revoke execute on function public.enforce_feedback_session_ownership() from public, anon, authenticated;
revoke execute on function public.enforce_practice_plan_integrity() from public, anon, authenticated;
revoke execute on function public.enforce_report_share_ownership() from public, anon, authenticated;
revoke execute on function public.sync_analysis_job_from_session() from public, anon, authenticated;

grant execute on function public.enforce_checkin_plan_ownership() to service_role;
grant execute on function public.enforce_feedback_session_ownership() to service_role;
grant execute on function public.enforce_practice_plan_integrity() to service_role;
grant execute on function public.enforce_report_share_ownership() to service_role;
grant execute on function public.sync_analysis_job_from_session() to service_role;
