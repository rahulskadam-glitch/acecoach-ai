-- Athlentra Tennis v6.6.0 — email reminder notifications (reassessment + check-in nudges).

alter table public.profiles
  add column if not exists reminder_emails_enabled boolean not null default true;

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_type text not null,
  subject_id uuid,
  sent_at timestamptz not null default now(),
  provider_message_id text,
  constraint notification_log_trigger_type_check
    check (trigger_type in ('reassessment_due', 'checkin_nudge'))
);

create index if not exists idx_notification_log_user_trigger_sent
  on public.notification_log(user_id, trigger_type, sent_at desc);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log_select_own" on public.notification_log;
create policy "notification_log_select_own"
on public.notification_log
for select
to authenticated
using ((select auth.uid()) = user_id);

-- No insert/update/delete policies: writes happen only via createAdminClient()
-- (service role, bypasses RLS) from the reminders cron route.

notify pgrst, 'reload schema';
