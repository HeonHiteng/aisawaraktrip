-- ============================================================
-- 0002 catalogue: locations, categories, vendors, attractions,
--                 experiences, category joins, images
-- ============================================================

create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  area        text,
  description text,
  lat         double precision,
  lng         double precision,
  is_sample   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  icon       text,
  sort_order int  not null default 0
);

create type public.verification_status as enum
  ('unverified', 'pending', 'verified', 'rejected');

create table public.vendors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  description         text,
  location_id         uuid references public.locations (id) on delete set null,
  address            text,
  lat                 double precision,
  lng                 double precision,
  contact             jsonb not null default '{}'::jsonb,
  verification_status public.verification_status not null default 'unverified',
  verified_at         timestamptz,
  verified_by         uuid references public.profiles (id) on delete set null,
  is_sample           boolean not null default true,
  is_published        boolean not null default false,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger vendors_set_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();

create table public.attractions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  summary          text,
  description      text,
  location_id      uuid references public.locations (id) on delete set null,
  address          text,
  lat              double precision,
  lng              double precision,
  avg_visit_minutes int not null default 90,
  price_min        numeric(10, 2) not null default 0,
  price_max        numeric(10, 2) not null default 0,
  is_free          boolean not null default false,
  booking_required boolean not null default false,
  opening_hours    jsonb not null default '{}'::jsonb,
  contact          jsonb not null default '{}'::jsonb,
  tips             text,
  is_sample        boolean not null default true,
  is_published     boolean not null default false,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger attractions_set_updated_at before update on public.attractions
  for each row execute function public.set_updated_at();

create table public.experiences (
  id                    uuid primary key default gen_random_uuid(),
  vendor_id             uuid not null references public.vendors (id) on delete cascade,
  title                 text not null,
  slug                  text not null unique,
  summary               text,
  description           text,
  location_id           uuid references public.locations (id) on delete set null,
  address               text,
  lat                   double precision,
  lng                   double precision,
  duration_minutes      int not null default 120,
  price_per_person      numeric(10, 2) not null default 0,
  currency              text not null default 'MYR',
  min_pax               int not null default 1,
  max_pax               int not null default 10,
  languages             text[] not null default '{English}',
  includes              text[] not null default '{}',
  meeting_point         text,
  cancellation_policy   text,
  availability          jsonb not null default '{}'::jsonb,
  booking_leadtime_hours int not null default 24,
  is_sample             boolean not null default true,
  is_published          boolean not null default false,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint experiences_pax_valid check (min_pax >= 1 and max_pax >= min_pax)
);
create trigger experiences_set_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

create table public.attraction_categories (
  attraction_id uuid not null references public.attractions (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  primary key (attraction_id, category_id)
);

create table public.experience_categories (
  experience_id uuid not null references public.experiences (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  primary key (experience_id, category_id)
);

create type public.image_owner as enum ('attraction', 'vendor', 'experience');

create table public.images (
  id           uuid primary key default gen_random_uuid(),
  owner_type   public.image_owner not null,
  owner_id     uuid not null,
  storage_path text,
  url          text not null,
  alt          text,
  sort_order   int not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index images_owner_idx        on public.images (owner_type, owner_id);
create index attractions_location_idx on public.attractions (location_id);
create index attractions_pub_idx      on public.attractions (is_published);
create index vendors_pub_idx          on public.vendors (is_published);
create index experiences_vendor_idx   on public.experiences (vendor_id);
create index experiences_location_idx on public.experiences (location_id);
create index experiences_pub_idx      on public.experiences (is_published);
