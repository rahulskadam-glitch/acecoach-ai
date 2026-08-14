-- Row Level Security and private video storage for AceCoach AI.
-- Safe to run repeatedly.

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.analysis enable row level security;

drop policy if exists "Allow authenticated user to manage own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (auth.uid() = id);

drop policy if exists "Allow authenticated user to manage own videos" on public.videos;
drop policy if exists "videos_select_own" on public.videos;
drop policy if exists "videos_insert_own" on public.videos;
drop policy if exists "videos_update_own" on public.videos;
drop policy if exists "videos_delete_own" on public.videos;
create policy "videos_select_own" on public.videos for select to authenticated using (auth.uid() = user_id);
create policy "videos_insert_own" on public.videos for insert to authenticated with check (auth.uid() = user_id);
create policy "videos_update_own" on public.videos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "videos_delete_own" on public.videos for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Allow authenticated user to read analysis for own videos" on public.analysis;
drop policy if exists "analysis_select_via_owned_video" on public.analysis;
create policy "analysis_select_via_owned_video" on public.analysis for select to authenticated using (
  exists (select 1 from public.videos v where v.id = analysis.video_id and v.user_id = auth.uid())
);

drop policy if exists "Allow service role to insert analysis" on public.analysis;
drop policy if exists "Allow service role to update analysis" on public.analysis;
create policy "analysis_service_insert" on public.analysis for insert to service_role with check (true);
create policy "analysis_service_update" on public.analysis for update to service_role using (true) with check (true);

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
create policy "video_objects_select_own" on storage.objects for select to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_update_own" on storage.objects for update to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "video_objects_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
