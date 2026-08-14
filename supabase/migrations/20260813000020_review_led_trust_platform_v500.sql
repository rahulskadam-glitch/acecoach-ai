-- AceCoach AI v5.0.0 — Review-Led Trust Platform
-- Prerequisites: migrations 001-020. Designed to be safe to run repeatedly.

create extension if not exists "pgcrypto";

-- Media ownership and duplicate protection.
alter table if exists public.videos
  add column if not exists sha256_checksum text,
  add column if not exists original_preserved boolean not null default true,
  add column if not exists last_upload_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'videos_sha256_checksum_format'
  ) then
    alter table public.videos add constraint videos_sha256_checksum_format
      check (sha256_checksum is null or sha256_checksum ~ '^[a-f0-9]{64}$');
  end if;
end $$;

create unique index if not exists uq_videos_owner_checksum
  on public.videos(user_id, sha256_checksum)
  where sha256_checksum is not null;

-- Safe support diagnostics: references and sanitized user descriptions only.
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('upload','processing','movement','report','practice','billing','account','other')),
  description text not null check (char_length(description) between 10 and 2000),
  session_reference text,
  job_reference text,
  app_version text not null,
  api_version text,
  browser_summary text,
  last_processing_stage text,
  error_code text,
  status text not null default 'received' check (status in ('received','investigating','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_requests_user_created on public.support_requests(user_id, created_at desc);
create index if not exists idx_support_requests_status_created on public.support_requests(status, created_at desc);
alter table public.support_requests enable row level security;
drop policy if exists "support_requests_select_own" on public.support_requests;
create policy "support_requests_select_own" on public.support_requests for select to authenticated using (auth.uid() = user_id);
-- Writes are server-only through the service role.
drop policy if exists "support_requests_insert_own" on public.support_requests;
drop policy if exists "support_requests_update_own" on public.support_requests;
drop policy if exists "support_requests_delete_own" on public.support_requests;

-- Governed feedback lifecycle. Feedback never updates the live engine automatically.
create table if not exists public.product_feedback_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.product_feedback(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null check (to_status in ('submitted','triaged','duplicate','accepted','rejected','experiment_planned','validated','released')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_release_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hypothesis text not null,
  evidence_summary text not null,
  decision text not null check (decision in ('hold','experiment','release','reject')),
  target_version text,
  risk_summary text,
  validation_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.product_feedback_events enable row level security;
alter table public.feedback_release_decisions enable row level security;
-- Administrative evidence tables are service-role only.
drop policy if exists "product_feedback_events_no_browser" on public.product_feedback_events;
drop policy if exists "feedback_release_decisions_no_browser" on public.feedback_release_decisions;

-- Durable analysis stage history for recovery and diagnostics.
create table if not exists public.analysis_job_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  attempt integer not null default 1 check (attempt between 1 and 20),
  heartbeat_at timestamptz,
  failure_code text,
  failure_message text,
  engine_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_job_events_session_created on public.analysis_job_events(session_id, created_at desc);
create index if not exists idx_analysis_job_events_user_created on public.analysis_job_events(user_id, created_at desc);
alter table public.analysis_job_events enable row level security;
drop policy if exists "analysis_job_events_select_own" on public.analysis_job_events;
create policy "analysis_job_events_select_own" on public.analysis_job_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists "analysis_job_events_browser_write" on public.analysis_job_events;

create or replace function public.touch_v500_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_support_requests_updated_at on public.support_requests;
create trigger touch_support_requests_updated_at before update on public.support_requests
for each row execute function public.touch_v500_updated_at();

comment on column public.videos.sha256_checksum is 'Client-computed SHA-256 used for duplicate protection. Not a biometric identifier.';
comment on table public.support_requests is 'Sanitized support diagnostics. Raw video, signed URLs, pose frames, and secrets must not be stored here.';
comment on table public.analysis_job_events is 'Append-only analysis stage evidence for recovery, observability, and support diagnostics.';

notify pgrst, 'reload schema';

-- Verification queries:
-- select column_name from information_schema.columns where table_schema='public' and table_name='videos' and column_name='sha256_checksum';
-- select to_regclass('public.support_requests'), to_regclass('public.analysis_job_events');
