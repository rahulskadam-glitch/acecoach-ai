-- AceCoach AI analysis write-integrity hardening v2.4.
-- Run after 011_scientific_integrity_v24.sql. Safe to run repeatedly.
--
-- Analysis outputs are product-generated scientific records. Authenticated browser
-- clients may read their own rows but may not insert, alter, or delete them.
-- Server actions write with SUPABASE_SERVICE_ROLE_KEY after verifying ownership.

alter table public.analysis_sessions enable row level security;
alter table public.analysis_reports enable row level security;

drop policy if exists "analysis_sessions_insert_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_update_own" on public.analysis_sessions;
drop policy if exists "analysis_sessions_delete_own" on public.analysis_sessions;

drop policy if exists "analysis_reports_insert_own" on public.analysis_reports;
drop policy if exists "analysis_reports_update_own" on public.analysis_reports;
drop policy if exists "analysis_reports_delete_own" on public.analysis_reports;

-- Recreate read policies defensively.
drop policy if exists "analysis_sessions_select_own" on public.analysis_sessions;
create policy "analysis_sessions_select_own"
on public.analysis_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "analysis_reports_select_own" on public.analysis_reports;
create policy "analysis_reports_select_own"
on public.analysis_reports
for select
to authenticated
using (auth.uid() = user_id);
