-- AceCoach AI v4.0.0 — Human Motion Coach
-- Safe to run repeatedly.

alter table if exists public.profiles
  add column if not exists gender text;

comment on column public.profiles.gender is
  'Optional user-selected reference silhouette style. AceCoach does not infer gender from video appearance.';

notify pgrst, 'reload schema';
