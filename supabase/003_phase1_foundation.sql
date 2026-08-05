-- AceCoach AI Phase 1 upgrade migration
-- Run after 001_init.sql and 002_rls_and_storage.sql on an existing project.

-- Add integrity constraints without failing if they already exist.
do $$ begin
  alter table public.profiles
    add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.videos
    add constraint videos_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.analysis
    add constraint analysis_video_id_fkey foreign key (video_id) references public.videos(id) on delete cascade;
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role text not null default 'player',
  add column if not exists ranking_system text,
  add column if not exists ranking_value text;

do $$ begin
  alter table public.profiles add constraint profiles_role_check
    check (role in ('player', 'coach', 'academy', 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.videos add constraint videos_status_check
    check (status in ('uploaded', 'queued', 'processing', 'completed', 'failed'));
exception when duplicate_object then null; end $$;

-- Automatically create a basic player profile from Auth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, last_name, country, playing_level,
    dominant_hand, goals, role
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'tennis_level', ''),
    nullif(new.raw_user_meta_data ->> 'handedness', ''),
    case when coalesce(new.raw_user_meta_data ->> 'primary_goal', '') = ''
      then array[]::text[]
      else array[new.raw_user_meta_data ->> 'primary_goal']
    end,
    'player'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = case when public.profiles.first_name = '' then excluded.first_name else public.profiles.first_name end,
    last_name = case when public.profiles.last_name = '' then excluded.last_name else public.profiles.last_name end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Recreate explicit RLS policies for predictable upgrades.
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.analysis enable row level security;

drop policy if exists "Allow authenticated user to manage own profile" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (auth.uid() = id);

drop policy if exists "Allow authenticated user to manage own videos" on public.videos;
create policy "videos_select_own" on public.videos for select to authenticated using (auth.uid() = user_id);
create policy "videos_insert_own" on public.videos for insert to authenticated with check (auth.uid() = user_id);
create policy "videos_update_own" on public.videos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "videos_delete_own" on public.videos for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Allow authenticated user to read analysis for own videos" on public.analysis;
create policy "analysis_select_via_owned_video" on public.analysis for select to authenticated using (
  exists (select 1 from public.videos v where v.id = analysis.video_id and v.user_id = auth.uid())
);

-- Ensure the private video bucket exists and has a 500 MB object limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 524288000, array['video/mp4', 'video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow authenticated users to manage their own video objects" on storage.objects;
drop policy if exists "video_objects_select_own" on storage.objects;
drop policy if exists "video_objects_insert_own" on storage.objects;
drop policy if exists "video_objects_update_own" on storage.objects;
drop policy if exists "video_objects_delete_own" on storage.objects;

create policy "video_objects_select_own" on storage.objects for select to authenticated
using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_update_own" on storage.objects for update to authenticated
using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
