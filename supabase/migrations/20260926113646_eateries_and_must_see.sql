-- ============================================================
-- 0018 must-see ranking for attractions + a local eateries guide
--
-- attractions.featured_rank  1..5 = the "must-see" list, 6+ = also great; null = unranked.
-- eateries                   a hand-curated food guide (dish, price tier, Google Maps link).
--                            Public reads published rows; only admins write (like the rest of
--                            the catalogue). No prices in RM: `price_tier` is 1-3 ("$".."$$$").
-- ============================================================

alter table public.attractions
  add column featured_rank smallint check (featured_rank is null or featured_rank between 1 and 99);
create index attractions_featured_idx on public.attractions (featured_rank)
  where featured_rank is not null;

create table public.eateries (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  city         text not null check (city in ('Kuching', 'Sibu', 'Miri', 'Bintulu')),
  -- what to eat here, e.g. {'laksa'} or {'umai','manok-pansoh','midin'}
  dishes       text[] not null default '{}',
  price_tier   smallint check (price_tier is null or price_tier between 1 and 3),
  is_splurge   boolean not null default false,
  maps_url     text check (maps_url is null or maps_url ~ '^https://'),
  notes        text,
  sort_order   int not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint eateries_name_len check (char_length(name) between 2 and 120),
  constraint eateries_notes_len check (notes is null or char_length(notes) <= 300)
);
create trigger eateries_set_updated_at before update on public.eateries
  for each row execute function public.set_updated_at();
create index eateries_city_idx on public.eateries (city, is_published);

alter table public.eateries enable row level security;
create policy "eateries_read" on public.eateries
  for select using (is_published or public.is_admin());
create policy "eateries_admin_write" on public.eateries
  for all using (public.is_admin()) with check (public.is_admin());
