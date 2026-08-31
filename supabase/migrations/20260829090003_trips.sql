-- ============================================================
-- 0003 trips: trips, itineraries, itinerary_days, itinerary_items
-- ============================================================

create type public.group_type    as enum ('solo', 'couple', 'family', 'friends', 'business');
create type public.trip_pace     as enum ('relaxed', 'moderate', 'packed');
create type public.trip_status   as enum ('draft', 'planned', 'booked', 'completed', 'archived');

create table public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  title        text not null default 'My Sarawak trip',
  destination  text not null default 'Kuching',
  start_date   date not null,
  end_date     date not null,
  budget_total numeric(10, 2),
  currency     text not null default 'MYR',
  group_type   public.group_type not null default 'couple',
  num_adults   int not null default 2,
  num_children int not null default 0,
  interests    text[] not null default '{}',
  pace         public.trip_pace not null default 'moderate',
  notes        text,
  status       public.trip_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint trips_dates_valid      check (end_date >= start_date),
  constraint trips_travellers_valid check (num_adults >= 1 and num_children >= 0)
);
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create index trips_user_idx on public.trips (user_id);

create type public.itinerary_source as enum ('ai', 'user');

create table public.itineraries (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  version         int not null default 1,
  generated_by    public.itinerary_source not null default 'ai',
  model           text,
  request_summary text,
  is_current      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (trip_id, version)
);
create index itineraries_trip_idx on public.itineraries (trip_id);

create table public.itinerary_days (
  id            uuid primary key default gen_random_uuid(),
  itinerary_id  uuid not null references public.itineraries (id) on delete cascade,
  day_number    int not null,
  date          date,
  summary       text,
  unique (itinerary_id, day_number)
);

create type public.itinerary_item_type as enum
  ('attraction', 'experience', 'meal', 'transport', 'free_time');

create table public.itinerary_items (
  id               uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days (id) on delete cascade,
  sort_order       int not null default 0,
  start_time       time,
  end_time         time,
  duration_minutes int,
  item_type        public.itinerary_item_type not null,
  attraction_id    uuid references public.attractions (id) on delete set null,
  experience_id    uuid references public.experiences (id) on delete set null,
  title            text not null,
  description      text,
  why_recommended  text,
  estimated_cost   numeric(10, 2) not null default 0,
  location_label   text,
  lat              double precision,
  lng              double precision,
  is_bookable      boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint itinerary_items_attraction_fk
    check (item_type <> 'attraction' or attraction_id is not null),
  constraint itinerary_items_experience_fk
    check (item_type <> 'experience' or experience_id is not null)
);
create index itinerary_items_day_idx on public.itinerary_items (itinerary_day_id);
