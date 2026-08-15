-- Athlentra Tennis v6.5.1 — make knowledge authorization checks NULL-safe.
-- PostgreSQL CHECK constraints accept NULL predicates, so every required trace
-- field is asserted explicitly and missing domain decisions fail closed.

alter table public.analysis_reports
  drop constraint if exists analysis_reports_knowledge_control_complete_check;

alter table public.analysis_reports
  add constraint analysis_reports_knowledge_control_complete_check
  check (
    (knowledge_control is null and knowledge_policy_version is null and knowledge_manifest_hash is null)
    or (
      knowledge_control is not null
      and knowledge_policy_version is not null
      and knowledge_manifest_hash is not null
      and jsonb_typeof(knowledge_control) = 'object'
      and knowledge_control->>'status' = 'CONTROLLED'
      and knowledge_control->>'failClosed' = 'true'
      and knowledge_policy_version = knowledge_control->>'policyVersion'
      and knowledge_manifest_hash = knowledge_control->>'manifestHash'
      and coalesce(knowledge_control #>> '{domains,calculations,authorized}', 'false') = 'true'
      and coalesce(knowledge_control #>> '{domains,insights,authorized}', 'false') = 'true'
      and coalesce(knowledge_control #>> '{domains,recommendations,authorized}', 'false') = 'true'
      and coalesce(knowledge_control #>> '{domains,benchmarks,authorized}', 'false') = 'true'
      and coalesce(knowledge_control #>> '{domains,records,authorized}', 'false') = 'true'
      and coalesce(knowledge_control #>> '{domains,report,authorized}', 'false') = 'true'
    )
  );

notify pgrst, 'reload schema';
