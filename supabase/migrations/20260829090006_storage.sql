-- ============================================================
-- 0006 storage buckets + policies
-- NOTE: if `supabase db push` fails here with an ownership error on
-- storage.objects, create these two buckets + policies from the
-- Supabase dashboard (Storage) instead and mark this migration as
-- applied with `supabase migration repair`.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('catalogue', 'catalogue', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- catalogue: anyone can read, only admins can write
create policy "catalogue_public_read" on storage.objects
  for select using (bucket_id = 'catalogue');
create policy "catalogue_admin_insert" on storage.objects
  for insert with check (bucket_id = 'catalogue' and public.is_admin());
create policy "catalogue_admin_update" on storage.objects
  for update using (bucket_id = 'catalogue' and public.is_admin());
create policy "catalogue_admin_delete" on storage.objects
  for delete using (bucket_id = 'catalogue' and public.is_admin());

-- avatars: anyone can read, a user manages only files under a folder named by their uid
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
