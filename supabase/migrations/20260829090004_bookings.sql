-- ============================================================
-- 0004 bookings: bookings, payments, booking_status_history
-- ============================================================

create type public.booking_status as enum
  ('pending', 'confirmed', 'cancelled', 'completed', 'refunded');
create type public.payment_status as enum
  ('created', 'pending', 'paid', 'failed', 'refunded', 'cancelled');
create type public.payment_method as enum ('fpx', 'card', 'ewallet', 'mock');

create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  experience_id     uuid not null references public.experiences (id) on delete restrict,
  trip_id           uuid references public.trips (id) on delete set null,
  itinerary_item_id uuid references public.itinerary_items (id) on delete set null,
  booking_date      date not null,
  start_time        time,
  num_adults        int not null default 1,
  num_children      int not null default 0,
  num_pax           int generated always as (num_adults + num_children) stored,
  unit_price        numeric(10, 2) not null,
  subtotal          numeric(10, 2) not null,
  service_fee       numeric(10, 2) not null default 0,
  total_amount      numeric(10, 2) not null,
  currency          text not null default 'MYR',
  status            public.booking_status not null default 'pending',
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text,
  special_requests  text,
  cancellation_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint bookings_pax_valid check (num_adults >= 1 and num_children >= 0)
);
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create index bookings_user_idx       on public.bookings (user_id);
create index bookings_experience_idx on public.bookings (experience_id);
create index bookings_status_idx     on public.bookings (status);

-- close the itinerary_items <-> bookings loop
alter table public.itinerary_items
  add column booking_id uuid references public.bookings (id) on delete set null;

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings (id) on delete cascade,
  provider            text not null,
  provider_ref        text,
  provider_payment_id text,
  amount              numeric(10, 2) not null,
  currency            text not null default 'MYR',
  method              public.payment_method not null default 'mock',
  status              public.payment_status not null default 'created',
  raw_payload         jsonb not null default '{}'::jsonb,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create index payments_booking_idx on public.payments (booking_id);
create unique index payments_provider_ref_idx
  on public.payments (provider, provider_ref) where provider_ref is not null;

create table public.booking_status_history (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status  public.booking_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);
create index bsh_booking_idx on public.booking_status_history (booking_id);

-- Guard booking status transitions + auto-log history.
--   server-side (auth.uid() IS NULL) or admin  -> any transition
--   the booking owner                          -> only cancel a pending/confirmed booking
create or replace function public.enforce_booking_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() is null or public.is_admin() then
      null; -- allowed
    elsif old.user_id = auth.uid() then
      if not (new.status = 'cancelled' and old.status in ('pending', 'confirmed')) then
        raise exception 'invalid booking status transition: % -> %', old.status, new.status;
      end if;
    else
      raise exception 'not allowed to modify this booking';
    end if;

    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger bookings_enforce_status
  before update on public.bookings
  for each row execute function public.enforce_booking_status();
