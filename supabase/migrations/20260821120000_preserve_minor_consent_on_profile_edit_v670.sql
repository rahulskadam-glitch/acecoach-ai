-- Fixes a bug in save_athlete_profile_v301: on ON CONFLICT (i.e. every profile edit
-- after the first save, not just initial onboarding), the function unconditionally
-- reset service_processing/raw_media_training/parental_consent for any athlete under
-- 18 — even one who already had guardian-verified consent recorded through the
-- separate onboarding flow (journey-actions.ts). The result: a minor who completed
-- onboarding with guardian consent, then simply edited an unrelated field (e.g.
-- playing level) on their profile page, silently had their analysis consent revoked
-- with no warning, and their next video upload failed for an unrelated-sounding reason.
--
-- The INSERT path's "default to false for a minor" behavior was intentional and stays
-- as-is — a fresh profile save alone must never be able to self-grant a minor's
-- consent. The bug is specifically in the UPDATE path: it must preserve whatever
-- consent value already exists rather than overwriting it, so a properly-granted
-- guardian consent survives ordinary profile edits.

create or replace function public.save_athlete_profile_v301(
  p_profile_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_age smallint,
  p_age_band text,
  p_country text,
  p_country_code text,
  p_primary_sport_id text,
  p_playing_level text,
  p_dominant_side text,
  p_goals text[],
  p_years_playing smallint,
  p_training_sessions smallint,
  p_competition_level text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_mobility_considerations text,
  p_service_processing boolean,
  p_derived_data_improvement boolean,
  p_raw_media_training boolean,
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_profile_id is null or p_first_name is null or p_last_name is null then
    raise exception 'Required athlete profile values are missing';
  end if;
  if p_age < 5 or p_age > 100 then
    raise exception 'Athlete age is outside the supported range';
  end if;
  if p_age >= 18 and not p_service_processing then
    raise exception 'Service-processing consent is required for analysis';
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, display_name, age, age_band, country,
    country_code, language_code, measurement_system, primary_sport_id,
    playing_level, dominant_hand, goals, years_playing,
    training_sessions_per_week, competition_level, onboarding_status
  ) values (
    p_profile_id, p_email, p_first_name, p_last_name,
    btrim(p_first_name || ' ' || p_last_name), p_age, p_age_band, p_country,
    p_country_code, 'en', 'metric', p_primary_sport_id, p_playing_level,
    p_dominant_side, coalesce(p_goals, '{}'::text[]), p_years_playing,
    p_training_sessions, p_competition_level,
    case when p_years_playing is not null or p_competition_level is not null
      then 'profile_enriched' else 'essentials_complete' end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    display_name = excluded.display_name,
    age = excluded.age,
    age_band = excluded.age_band,
    country = excluded.country,
    country_code = excluded.country_code,
    language_code = excluded.language_code,
    measurement_system = excluded.measurement_system,
    primary_sport_id = excluded.primary_sport_id,
    playing_level = excluded.playing_level,
    dominant_hand = excluded.dominant_hand,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    training_sessions_per_week = excluded.training_sessions_per_week,
    competition_level = excluded.competition_level,
    onboarding_status = excluded.onboarding_status,
    updated_at = now();

  update public.profile_sports
  set is_primary = false,
      updated_at = now()
  where profile_id = p_profile_id
    and sport_id <> p_primary_sport_id
    and is_primary = true;

  insert into public.profile_sports (
    profile_id, sport_id, playing_level, dominant_side, goals,
    years_playing, competition_level, is_primary, updated_at
  ) values (
    p_profile_id, p_primary_sport_id, p_playing_level, p_dominant_side,
    coalesce(p_goals, '{}'::text[]), p_years_playing, p_competition_level,
    true, now()
  )
  on conflict (profile_id, sport_id) do update set
    playing_level = excluded.playing_level,
    dominant_side = excluded.dominant_side,
    goals = excluded.goals,
    years_playing = excluded.years_playing,
    competition_level = excluded.competition_level,
    is_primary = true,
    updated_at = now();

  insert into public.physical_profiles (
    profile_id, height_cm, weight_kg, mobility_considerations, updated_at
  ) values (
    p_profile_id, p_height_cm, p_weight_kg, p_mobility_considerations, now()
  )
  on conflict (profile_id) do update set
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    mobility_considerations = excluded.mobility_considerations,
    updated_at = now();

  insert into public.consents (
    profile_id, service_processing, derived_data_improvement,
    raw_media_training, parental_consent, consent_version, granted_at, updated_at
  ) values (
    p_profile_id,
    case when p_age < 18 then false else p_service_processing end,
    p_derived_data_improvement,
    case when p_age < 18 then false else p_raw_media_training end,
    false,
    p_consent_version,
    case when p_age < 18 then null else now() end,
    now()
  )
  on conflict (profile_id) do update set
    -- A minor's existing consent (granted only through the dedicated guardian-consent
    -- onboarding flow) is preserved across ordinary profile edits instead of being
    -- silently reset to false. For an adult, the newly submitted value applies as before.
    service_processing = case when p_age < 18 then public.consents.service_processing else excluded.service_processing end,
    derived_data_improvement = excluded.derived_data_improvement,
    raw_media_training = case when p_age < 18 then public.consents.raw_media_training else excluded.raw_media_training end,
    parental_consent = case when p_age < 18 then public.consents.parental_consent else excluded.parental_consent end,
    consent_version = excluded.consent_version,
    updated_at = now();
end;
$$;

revoke all on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.save_athlete_profile_v301(uuid, text, text, text, smallint, text, text, text, text, text, text, text[], smallint, smallint, text, numeric, numeric, text, boolean, boolean, boolean, text) to service_role;
