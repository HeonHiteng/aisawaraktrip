-- ============================================================
-- 0005 Row Level Security
-- ============================================================

alter table public.profiles               enable row level security;
alter table public.locations              enable row level security;
alter table public.categories             enable row level security;
alter table public.vendors                enable row level security;
alter table public.attractions            enable row level security;
alter table public.experiences            enable row level security;
alter table public.attraction_categories  enable row level security;
alter table public.experience_categories  enable row level security;
alter table public.images                 enable row level security;
alter table public.trips                  enable row level security;
alter table public.itineraries            enable row level security;
alter table public.itinerary_days         enable row level security;
alter table public.itinerary_items        enable row level security;
alter table public.bookings               enable row level security;
alter table public.payments               enable row level security;
alter table public.booking_status_history enable row level security;

-- Base privileges (RLS still gates every row).
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ---------- profiles ----------
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- reference data: world-readable ----------
create policy "locations_read"  on public.locations  for select using (true);
create policy "categories_read" on public.categories for select using (true);
create policy "locations_admin_write"  on public.locations
  for all using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- catalogue: public reads published rows, admin does everything ----------
create policy "attractions_read" on public.attractions
  for select using (is_published or public.is_admin());
create policy "attractions_admin_write" on public.attractions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "vendors_read" on public.vendors
  for select using (is_published or public.is_admin());
create policy "vendors_admin_write" on public.vendors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "experiences_read" on public.experiences
  for select using (is_published or public.is_admin());
create policy "experiences_admin_write" on public.experiences
  for all using (public.is_admin()) with check (public.is_admin());

create policy "attraction_categories_read" on public.attraction_categories
  for select using (exists (
    select 1 from public.attractions a
    where a.id = attraction_id and (a.is_published or public.is_admin())));
create policy "attraction_categories_admin_write" on public.attraction_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "experience_categories_read" on public.experience_categories
  for select using (exists (
    select 1 from public.experiences e
    where e.id = experience_id and (e.is_published or public.is_admin())));
create policy "experience_categories_admin_write" on public.experience_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "images_read" on public.images
  for select using (
    public.is_admin()
    or (owner_type = 'attraction' and exists (
         select 1 from public.attractions a where a.id = owner_id and a.is_published))
    or (owner_type = 'vendor' and exists (
         select 1 from public.vendors v where v.id = owner_id and v.is_published))
    or (owner_type = 'experience' and exists (
         select 1 from public.experiences e where e.id = owner_id and e.is_published))
  );
create policy "images_admin_write" on public.images
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- trips & itineraries: owned via trips.user_id ----------
create policy "trips_owner_all" on public.trips
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "itineraries_owner_all" on public.itineraries
  for all using (exists (
    select 1 from public.trips t
    where t.id = trip_id and (t.user_id = auth.uid() or public.is_admin())))
  with check (exists (
    select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "itinerary_days_owner_all" on public.itinerary_days
  for all using (exists (
    select 1 from public.itineraries i join public.trips t on t.id = i.trip_id
    where i.id = itinerary_id and (t.user_id = auth.uid() or public.is_admin())))
  with check (exists (
    select 1 from public.itineraries i join public.trips t on t.id = i.trip_id
    where i.id = itinerary_id and t.user_id = auth.uid()));

create policy "itinerary_items_owner_all" on public.itinerary_items
  for all using (exists (
    select 1 from public.itinerary_days d
    join public.itineraries i on i.id = d.itinerary_id
    join public.trips t on t.id = i.trip_id
    where d.id = itinerary_day_id and (t.user_id = auth.uid() or public.is_admin())))
  with check (exists (
    select 1 from public.itinerary_days d
    join public.itineraries i on i.id = d.itinerary_id
    join public.trips t on t.id = i.trip_id
    where d.id = itinerary_day_id and t.user_id = auth.uid()));

-- ---------- bookings: owner reads/creates/updates own; admin all; status guarded by trigger ----------
create policy "bookings_select" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings_insert_self" on public.bookings
  for insert with check (user_id = auth.uid());
create policy "bookings_update" on public.bookings
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "bookings_admin_delete" on public.bookings
  for delete using (public.is_admin());

-- ---------- payments: read-only for the owner; writes only via service role ----------
create policy "payments_select" on public.payments
  for select using (
    public.is_admin()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

-- ---------- booking status history: read-only for the owner; writes only via trigger/service role ----------
create policy "bsh_select" on public.booking_status_history
  for select using (
    public.is_admin()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
