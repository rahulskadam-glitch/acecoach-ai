-- AceCoach analytics ontology v2.2.0 hardening
-- RLS and ownership policies for context/safety/longitudinal tables.
-- Apply after 024_context_safeguarding_longitudinal_v220.sql.

alter table public.player_profiles enable row level security;
alter table public.guardian_consent enable row level security;
alter table public.coach_access_grants enable row level security;
alter table public.session_context enable row level security;
alter table public.content_moderation_log enable row level security;
alter table public.bystander_redaction_log enable row level security;
alter table public.progress_trends enable row level security;
alter table public.reassessment_links enable row level security;

drop policy if exists "player_profiles_select_own" on public.player_profiles;
drop policy if exists "player_profiles_insert_own" on public.player_profiles;
drop policy if exists "player_profiles_update_own" on public.player_profiles;
drop policy if exists "player_profiles_delete_own" on public.player_profiles;

create policy "player_profiles_select_own"
on public.player_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "player_profiles_insert_own"
on public.player_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "player_profiles_update_own"
on public.player_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "player_profiles_delete_own"
on public.player_profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "guardian_consent_select_own" on public.guardian_consent;
drop policy if exists "guardian_consent_insert_own" on public.guardian_consent;
drop policy if exists "guardian_consent_update_own" on public.guardian_consent;
drop policy if exists "guardian_consent_delete_own" on public.guardian_consent;

create policy "guardian_consent_select_own"
on public.guardian_consent
for select
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = guardian_consent.player_id
      and p.user_id = auth.uid()
  )
);

create policy "guardian_consent_insert_own"
on public.guardian_consent
for insert
to authenticated
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = guardian_consent.player_id
      and p.user_id = auth.uid()
  )
);

create policy "guardian_consent_update_own"
on public.guardian_consent
for update
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = guardian_consent.player_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = guardian_consent.player_id
      and p.user_id = auth.uid()
  )
);

create policy "guardian_consent_delete_own"
on public.guardian_consent
for delete
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = guardian_consent.player_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "coach_access_grants_select_own" on public.coach_access_grants;
drop policy if exists "coach_access_grants_insert_own" on public.coach_access_grants;
drop policy if exists "coach_access_grants_update_own" on public.coach_access_grants;
drop policy if exists "coach_access_grants_delete_own" on public.coach_access_grants;

create policy "coach_access_grants_select_own"
on public.coach_access_grants
for select
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = coach_access_grants.player_id
      and p.user_id = auth.uid()
  )
);

create policy "coach_access_grants_insert_own"
on public.coach_access_grants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = coach_access_grants.player_id
      and p.user_id = auth.uid()
  )
);

create policy "coach_access_grants_update_own"
on public.coach_access_grants
for update
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = coach_access_grants.player_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = coach_access_grants.player_id
      and p.user_id = auth.uid()
  )
);

create policy "coach_access_grants_delete_own"
on public.coach_access_grants
for delete
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = coach_access_grants.player_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "session_context_select_own" on public.session_context;
drop policy if exists "session_context_insert_own" on public.session_context;
drop policy if exists "session_context_update_own" on public.session_context;
drop policy if exists "session_context_delete_own" on public.session_context;

create policy "session_context_select_own"
on public.session_context
for select
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_context.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "session_context_insert_own"
on public.session_context
for insert
to authenticated
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_context.analysis_session_id
      and s.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.player_profiles p
    where p.player_id = session_context.player_id
      and p.user_id = auth.uid()
  )
);

create policy "session_context_update_own"
on public.session_context
for update
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_context.analysis_session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_context.analysis_session_id
      and s.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.player_profiles p
    where p.player_id = session_context.player_id
      and p.user_id = auth.uid()
  )
);

create policy "session_context_delete_own"
on public.session_context
for delete
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = session_context.analysis_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "content_moderation_log_select_own" on public.content_moderation_log;
drop policy if exists "content_moderation_log_insert_own" on public.content_moderation_log;
drop policy if exists "content_moderation_log_update_own" on public.content_moderation_log;
drop policy if exists "content_moderation_log_delete_own" on public.content_moderation_log;

create policy "content_moderation_log_select_own"
on public.content_moderation_log
for select
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = content_moderation_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "content_moderation_log_insert_own"
on public.content_moderation_log
for insert
to authenticated
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = content_moderation_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "content_moderation_log_update_own"
on public.content_moderation_log
for update
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = content_moderation_log.analysis_session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = content_moderation_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "content_moderation_log_delete_own"
on public.content_moderation_log
for delete
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = content_moderation_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "bystander_redaction_log_select_own" on public.bystander_redaction_log;
drop policy if exists "bystander_redaction_log_insert_own" on public.bystander_redaction_log;
drop policy if exists "bystander_redaction_log_update_own" on public.bystander_redaction_log;
drop policy if exists "bystander_redaction_log_delete_own" on public.bystander_redaction_log;

create policy "bystander_redaction_log_select_own"
on public.bystander_redaction_log
for select
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = bystander_redaction_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "bystander_redaction_log_insert_own"
on public.bystander_redaction_log
for insert
to authenticated
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = bystander_redaction_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "bystander_redaction_log_update_own"
on public.bystander_redaction_log
for update
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = bystander_redaction_log.analysis_session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = bystander_redaction_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "bystander_redaction_log_delete_own"
on public.bystander_redaction_log
for delete
to authenticated
using (
  exists (
    select 1
    from public.analysis_sessions s
    where s.id = bystander_redaction_log.analysis_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "progress_trends_select_own" on public.progress_trends;
drop policy if exists "progress_trends_insert_own" on public.progress_trends;
drop policy if exists "progress_trends_update_own" on public.progress_trends;
drop policy if exists "progress_trends_delete_own" on public.progress_trends;

create policy "progress_trends_select_own"
on public.progress_trends
for select
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = progress_trends.player_id
      and p.user_id = auth.uid()
  )
);

create policy "progress_trends_insert_own"
on public.progress_trends
for insert
to authenticated
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = progress_trends.player_id
      and p.user_id = auth.uid()
  )
);

create policy "progress_trends_update_own"
on public.progress_trends
for update
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = progress_trends.player_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = progress_trends.player_id
      and p.user_id = auth.uid()
  )
);

create policy "progress_trends_delete_own"
on public.progress_trends
for delete
to authenticated
using (
  exists (
    select 1
    from public.player_profiles p
    where p.player_id = progress_trends.player_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "reassessment_links_select_own" on public.reassessment_links;
drop policy if exists "reassessment_links_insert_own" on public.reassessment_links;
drop policy if exists "reassessment_links_update_own" on public.reassessment_links;
drop policy if exists "reassessment_links_delete_own" on public.reassessment_links;

create policy "reassessment_links_select_own"
on public.reassessment_links
for select
to authenticated
using (
  analysis_session_id is null
  or exists (
    select 1
    from public.analysis_sessions s
    where s.id = reassessment_links.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "reassessment_links_insert_own"
on public.reassessment_links
for insert
to authenticated
with check (
  analysis_session_id is null
  or exists (
    select 1
    from public.analysis_sessions s
    where s.id = reassessment_links.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "reassessment_links_update_own"
on public.reassessment_links
for update
to authenticated
using (
  analysis_session_id is null
  or exists (
    select 1
    from public.analysis_sessions s
    where s.id = reassessment_links.analysis_session_id
      and s.user_id = auth.uid()
  )
)
with check (
  analysis_session_id is null
  or exists (
    select 1
    from public.analysis_sessions s
    where s.id = reassessment_links.analysis_session_id
      and s.user_id = auth.uid()
  )
);

create policy "reassessment_links_delete_own"
on public.reassessment_links
for delete
to authenticated
using (
  analysis_session_id is null
  or exists (
    select 1
    from public.analysis_sessions s
    where s.id = reassessment_links.analysis_session_id
      and s.user_id = auth.uid()
  )
);
