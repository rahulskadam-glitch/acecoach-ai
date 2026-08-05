create extension if not exists "pgcrypto";

-- AceCoach AI v3.2.0 — review-governed product feedback and analytics readiness.
-- Safe to run repeatedly after v3.1.

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('capture','processing','report','practice','progress','coach','pricing')),
  category text not null check (category in ('reliability','ease_of_use','insight_clarity','visuals','drills','speed','missing_feature','value','other')),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 2000),
  app_version text not null default '3.2.0',
  review_status text not null default 'new' check (review_status in ('new','triaged','planned','shipped','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_feedback_user_created on public.product_feedback(user_id, created_at desc);
create index if not exists idx_product_feedback_triage on public.product_feedback(stage, category, review_status, created_at desc);

alter table public.product_feedback enable row level security;

drop policy if exists "product_feedback_select_own" on public.product_feedback;
create policy "product_feedback_select_own" on public.product_feedback
for select to authenticated using (auth.uid() = user_id);

-- Browser clients cannot insert/update directly. Server actions use the service role.
drop policy if exists "product_feedback_insert_own" on public.product_feedback;
drop policy if exists "product_feedback_update_own" on public.product_feedback;
drop policy if exists "product_feedback_delete_own" on public.product_feedback;

create or replace function public.set_product_feedback_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_product_feedback_timestamp on public.product_feedback;
create trigger set_product_feedback_timestamp
before update on public.product_feedback
for each row execute function public.set_product_feedback_timestamp();

create or replace view public.product_feedback_learning_view
with (security_invoker = false)
as
select
  stage,
  category,
  app_version,
  count(*) as feedback_count,
  round(avg(rating)::numeric, 2) as average_rating,
  count(*) filter (where rating <= 2) as low_rating_count,
  min(created_at) as first_received_at,
  max(created_at) as latest_received_at
from public.product_feedback
group by stage, category, app_version;

revoke all on public.product_feedback_learning_view from anon, authenticated;
grant select on public.product_feedback_learning_view to service_role;

notify pgrst, 'reload schema';
