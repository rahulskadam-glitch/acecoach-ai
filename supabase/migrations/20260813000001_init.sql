-- Supabase SQL migration for AceCoach AI core schema

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  first_name text not null,
  last_name text not null,
  age smallint,
  country text not null,
  playing_level text,
  dominant_hand text,
  gender text,
  height text,
  weight text,
  goals text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filename text not null,
  storage_path text not null,
  stroke_type text,
  status text not null default 'uploaded',
  duration numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null,
  overall_score int not null,
  forehand_score int not null,
  backhand_score int not null,
  serve_score int not null,
  footwork_score int not null,
  balance_score int not null,
  ai_summary text not null,
  recommendations text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_user_id on public.videos(user_id);
create index if not exists idx_analysis_video_id on public.analysis(video_id);

create or replace function public.set_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_timestamp_profiles
  before update on public.profiles
  for each row execute function public.set_timestamp();
