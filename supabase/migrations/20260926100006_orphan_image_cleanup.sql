-- ============================================================
-- 0015 photos must not outlive what they belong to
--
-- `images` points at its owner with (owner_type, owner_id) — a polymorphic
-- reference, so there is no foreign key and no ON DELETE CASCADE. Deleting an
-- experience / attraction / vendor (directly, or by cascade from its vendor) left
-- its photo rows behind forever. These triggers remove them with their owner.
--
-- NOTE: when uploads to Storage exist, `images.storage_path` files must be removed
-- too — a database trigger can't delete Storage objects; do that in the app.
-- ============================================================

create or replace function public.delete_owner_images()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.images
  where owner_type = tg_argv[0]::public.image_owner and owner_id = old.id;
  return old;
end;
$$;

create trigger experiences_delete_images
  after delete on public.experiences
  for each row execute function public.delete_owner_images('experience');

create trigger attractions_delete_images
  after delete on public.attractions
  for each row execute function public.delete_owner_images('attraction');

create trigger vendors_delete_images
  after delete on public.vendors
  for each row execute function public.delete_owner_images('vendor');

-- Trigger functions are never called directly.
revoke execute on function public.delete_owner_images() from public, anon, authenticated;

-- One-off: sweep the orphans that already exist.
delete from public.images i
where (i.owner_type = 'experience'
        and not exists (select 1 from public.experiences e where e.id = i.owner_id))
   or (i.owner_type = 'attraction'
        and not exists (select 1 from public.attractions a where a.id = i.owner_id))
   or (i.owner_type = 'vendor'
        and not exists (select 1 from public.vendors v where v.id = i.owner_id));
