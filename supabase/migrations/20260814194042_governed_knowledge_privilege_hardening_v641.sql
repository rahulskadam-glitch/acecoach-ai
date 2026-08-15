-- Athlentra Tennis v6.4.1 — explicit Data API privilege hardening.
-- Supabase may apply broad default privileges to newly created public tables.

revoke all on public.analysis_rep_outcomes, public.expert_annotation_studies, public.expert_annotations,
  public.intervention_validations, public.benchmark_cohorts, public.benchmark_cohort_versions,
  public.benchmark_cohort_cells, public.model_capability_validations, public.capture_calibrations from anon, authenticated;

grant select, insert on public.analysis_rep_outcomes to authenticated;
grant select on public.intervention_validations, public.capture_calibrations to authenticated;

grant all on public.analysis_rep_outcomes, public.expert_annotation_studies, public.expert_annotations,
  public.intervention_validations, public.benchmark_cohorts, public.benchmark_cohort_versions,
  public.benchmark_cohort_cells, public.model_capability_validations, public.capture_calibrations to service_role;

revoke all on function public.upsert_construct_session_distributions_v640(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_construct_session_distributions_v640(
  uuid, uuid, text, text, text, jsonb, integer, numeric, numeric, text, text, jsonb
) to service_role;

notify pgrst, 'reload schema';
