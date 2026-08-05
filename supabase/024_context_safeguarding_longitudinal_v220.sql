-- AceCoach analytics ontology v2.2.0
-- Adds player context, consent, moderation, and longitudinal trend tables.
-- Additive and idempotent.

create extension if not exists "pgcrypto";

create table if not exists public.player_profiles (
	player_id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	age_band text not null,
	is_minor boolean not null default true,
	player_level text not null,
	dominant_hand text not null,
	backhand_style_declared text,
	adaptive_play text not null default 'none',
	coaching_relationship text not null,
	guardian_account_id uuid references auth.users(id) on delete set null,
	preferred_language text not null default 'en-IN',
	accessibility_preferences jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint minor_requires_guardian
		check (is_minor = false or guardian_account_id is not null)
);

create table if not exists public.guardian_consent (
	consent_id uuid primary key default gen_random_uuid(),
	player_id uuid not null references public.player_profiles(player_id) on delete cascade,
	granted_by_user_id uuid not null references auth.users(id) on delete cascade,
	granted_by_role text not null check (granted_by_role in ('self_adult', 'guardian')),
	scope_video_capture_and_storage boolean not null default false,
	scope_ai_analysis boolean not null default false,
	scope_coach_sharing boolean not null default false,
	scope_model_improvement_use boolean not null default false,
	ontology_version_at_consent text not null,
	granted_at timestamptz not null default now(),
	revoked_at timestamptz
);

create table if not exists public.coach_access_grants (
	id uuid primary key default gen_random_uuid(),
	player_id uuid not null references public.player_profiles(player_id) on delete cascade,
	coach_user_id uuid not null references auth.users(id) on delete cascade,
	granted_by_consent_id uuid not null references public.guardian_consent(consent_id) on delete cascade,
	granted_at timestamptz not null default now(),
	expires_at timestamptz not null,
	revoked_at timestamptz
);

create table if not exists public.session_context (
	analysis_session_id uuid primary key references public.analysis_sessions(id) on delete cascade,
	player_id uuid not null references public.player_profiles(player_id) on delete cascade,
	session_goal text not null,
	specific_stroke_focus text[] not null default '{}',
	camera_device_class text not null default 'unknown',
	camera_view text not null,
	camera_frame_rate_fps numeric,
	camera_stability text not null default 'unknown',
	court_surface text not null default 'unknown',
	self_reported_state text[] not null default '{}',
	consent_status text not null check (consent_status in (
		'not_required_adult_self_consent',
		'guardian_consent_active',
		'guardian_consent_missing_blocked'
	)),
	created_at timestamptz not null default now()
);

create table if not exists public.content_moderation_log (
	id uuid primary key default gen_random_uuid(),
	analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
	source_video_hash text not null,
	scene_classifier_result text not null,
	scene_classifier_confidence numeric not null,
	trust_and_safety_flag text,
	precheck_status text not null check (precheck_status in (
		'passed',
		'failed_benign_mismatch',
		'blocked_safety_review'
	)),
	created_at timestamptz not null default now()
);

create table if not exists public.bystander_redaction_log (
	id uuid primary key default gen_random_uuid(),
	analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
	frame_indices integer[] not null,
	redaction_type text not null default 'face_blur',
	applied_to_export boolean not null default true,
	created_at timestamptz not null default now()
);

create table if not exists public.progress_trends (
	id uuid primary key default gen_random_uuid(),
	player_id uuid not null references public.player_profiles(player_id) on delete cascade,
	fault_id text not null,
	window_session_ids uuid[] not null,
	recurrence_rate_start numeric,
	recurrence_rate_end numeric,
	trend_status text not null check (trend_status in (
		'improving',
		'steady',
		'recurring',
		'insufficient_history'
	)),
	computed_at timestamptz not null default now()
);

create table if not exists public.reassessment_links (
	id uuid primary key default gen_random_uuid(),
	triggering_observation_id uuid not null,
	analysis_session_id uuid references public.analysis_sessions(id) on delete set null,
	drill_id text not null,
	reassessed_in_session_id uuid references public.analysis_sessions(id) on delete set null,
	reassessment_status text not null default 'not_yet_reassessed'
		check (reassessment_status in (
			'not_yet_reassessed',
			'improved',
			'unchanged',
			'regressed',
			'insufficient_comparable_evidence'
		)),
	created_at timestamptz not null default now()
);

create index if not exists idx_session_context_player
	on public.session_context(player_id);
create index if not exists idx_progress_trends_player_fault
	on public.progress_trends(player_id, fault_id);
create index if not exists idx_coach_access_grants_player
	on public.coach_access_grants(player_id)
	where revoked_at is null;
