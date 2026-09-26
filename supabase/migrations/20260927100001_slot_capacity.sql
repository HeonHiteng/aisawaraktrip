-- ============================================================
-- 0016 slot capacity: a slot can't be overbooked
--
-- A SLOT = (experience, date, start time); its size is the experience's
-- availability.capacity_per_slot (missing / 0 = unlimited, as before).
--
--  * Occupied seats = confirmed/completed bookings + PENDING bookings whose hold has
--    not expired. An unpaid booking holds its seats for a while (the app passes the
--    minutes), then they are released — no sweeper job: expired holds are simply not
--    counted.
--  * create_booking(): lock the experience row, count, insert — one transaction, so two
--    people can't both take the last seat.
--  * extend_booking_hold(): checkout renews the hold if seats remain, else "slot_full".
--  * settle_payment(): if the hold LAPSED before the money arrived and the slot has since
--    filled, the booking is cancelled (never overbooked) while the payment stays `paid`
--    and is flagged for refund by the app.
--
-- Lock order everywhere: experience row FIRST, then the booking — so the functions can't
-- deadlock each other. All functions are service-role only.
-- ============================================================

alter table public.bookings
  add column hold_expires_at timestamptz;

-- Seats currently taken in a slot (optionally ignoring one booking — its own).
create or replace function public.slot_taken(
  p_experience uuid, p_date date, p_time time, p_exclude uuid default null
)
returns int
language sql
security invoker
stable
set search_path = ''
as $$
  select coalesce(sum(b.num_pax), 0)::int
  from public.bookings b
  where b.experience_id = p_experience
    and b.booking_date  = p_date
    and b.start_time is not distinct from p_time
    and (p_exclude is null or b.id <> p_exclude)
    and (
      b.status in ('confirmed', 'completed')
      or (b.status = 'pending' and b.hold_expires_at > now())
    );
$$;

create or replace function public.create_booking(p jsonb, p_hold_minutes int default 30)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_exp   uuid := (p ->> 'experience_id')::uuid;
  v_cap   int;
  v_pax   int;
  v_taken int;
  v_id    uuid;
begin
  -- the experience row is the lock for its slots
  select nullif(availability ->> 'capacity_per_slot', '')::int into v_cap
  from public.experiences where id = v_exp for update;
  if not found then
    raise exception 'experience not found' using errcode = 'P0002';
  end if;

  v_pax := (p ->> 'num_adults')::int + coalesce(nullif(p ->> 'num_children', '')::int, 0);

  if v_cap is not null and v_cap > 0 then
    v_taken := public.slot_taken(
      v_exp, (p ->> 'booking_date')::date, nullif(p ->> 'start_time', '')::time
    );
    if v_taken + v_pax > v_cap then
      raise exception 'slot_full' using errcode = 'P0001',
        detail = greatest(v_cap - v_taken, 0)::text;
    end if;
  end if;

  insert into public.bookings (
    user_id, experience_id, trip_id, booking_date, start_time, num_adults, num_children,
    unit_price, subtotal, service_fee, total_amount, currency, status,
    customer_name, customer_email, customer_phone, special_requests,
    experience_title, experience_slug, vendor_name, location_name, hold_expires_at
  ) values (
    (p ->> 'user_id')::uuid, v_exp, nullif(p ->> 'trip_id', '')::uuid,
    (p ->> 'booking_date')::date, nullif(p ->> 'start_time', '')::time,
    (p ->> 'num_adults')::int, coalesce(nullif(p ->> 'num_children', '')::int, 0),
    (p ->> 'unit_price')::numeric, (p ->> 'subtotal')::numeric,
    coalesce(nullif(p ->> 'service_fee', '')::numeric, 0), (p ->> 'total_amount')::numeric,
    coalesce(nullif(p ->> 'currency', ''), 'MYR'), 'pending',
    p ->> 'customer_name', p ->> 'customer_email',
    nullif(p ->> 'customer_phone', ''), nullif(p ->> 'special_requests', ''),
    p ->> 'experience_title', p ->> 'experience_slug', p ->> 'vendor_name',
    nullif(p ->> 'location_name', ''),
    now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.extend_booking_hold(
  p_booking uuid, p_user uuid, p_minutes int default 30
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_exp   uuid;
  v_cap   int;
  v_b     public.bookings%rowtype;
  v_taken int;
  v_until timestamptz;
begin
  select experience_id into v_exp from public.bookings
  where id = p_booking and user_id = p_user;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  -- experience first, then the booking (see the lock-order note at the top)
  select nullif(availability ->> 'capacity_per_slot', '')::int into v_cap
  from public.experiences where id = v_exp for update;
  select * into v_b from public.bookings where id = p_booking for update;

  if v_b.status <> 'pending' then
    raise exception 'booking_not_pending' using errcode = 'P0001';
  end if;

  if v_cap is not null and v_cap > 0 then
    v_taken := public.slot_taken(v_exp, v_b.booking_date, v_b.start_time, v_b.id);
    if v_taken + v_b.num_pax > v_cap then
      raise exception 'slot_full' using errcode = 'P0001',
        detail = greatest(v_cap - v_taken, 0)::text;
    end if;
  end if;

  v_until := greatest(coalesce(v_b.hold_expires_at, now()), now() + make_interval(mins => p_minutes));
  update public.bookings set hold_expires_at = v_until where id = p_booking;
  return v_until;
end;
$$;

-- settle_payment: same behaviour as 0012, plus the lapsed-hold check and the
-- experience-first lock order. (Signature unchanged, so its grants are kept.)
create or replace function public.settle_payment(
  p_provider            text,
  p_provider_ref        text,
  p_status              public.payment_status,
  p_amount              numeric,
  p_raw                 jsonb default '{}'::jsonb,
  p_provider_payment_id text  default null,
  p_expected_user       uuid  default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pay       public.payments%rowtype;
  v_booking   public.bookings%rowtype;
  v_status    public.payment_status;
  v_confirmed boolean := false;
  v_exp       uuid;
  v_cap       int;
begin
  select * into v_pay
  from public.payments
  where provider = p_provider and provider_ref = p_provider_ref
  for update;
  if not found then
    return jsonb_build_object('result', 'unknown');
  end if;

  -- lock order: experience, then booking
  select experience_id into v_exp from public.bookings where id = v_pay.booking_id;
  perform 1 from public.experiences where id = v_exp for update;
  select * into v_booking from public.bookings where id = v_pay.booking_id for update;

  if p_expected_user is not null and v_booking.user_id <> p_expected_user then
    return jsonb_build_object('result', 'unknown');
  end if;

  if v_pay.status in ('paid', 'refunded') then
    return jsonb_build_object(
      'result', v_pay.status, 'confirmed_now', false,
      'booking_id', v_booking.id, 'user_id', v_booking.user_id,
      'booking_status', v_booking.status
    );
  end if;

  v_status := p_status;
  if p_status = 'paid' and round(p_amount, 2) is distinct from v_pay.amount then
    v_status := 'failed';
  end if;

  update public.payments
  set status              = v_status,
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      paid_at             = case when v_status = 'paid' then now() else paid_at end,
      raw_payload         = coalesce(p_raw, raw_payload)
  where id = v_pay.id;

  if v_status = 'paid' then
    -- The hold lapsed before the money arrived: the seats may have gone to someone else.
    -- Never overbook — cancel the booking; the payment stays `paid` and is flagged for refund.
    if v_booking.status = 'pending'
       and v_booking.hold_expires_at is not null
       and v_booking.hold_expires_at <= now() then
      select nullif(availability ->> 'capacity_per_slot', '')::int into v_cap
      from public.experiences where id = v_exp;
      if v_cap is not null and v_cap > 0
         and public.slot_taken(v_exp, v_booking.booking_date, v_booking.start_time, v_booking.id)
             + v_booking.num_pax > v_cap then
        update public.bookings
        set status = 'cancelled',
            cancellation_reason = 'The slot filled up before payment completed'
        where id = v_booking.id;
        return jsonb_build_object(
          'result', v_status, 'confirmed_now', false,
          'booking_id', v_booking.id, 'user_id', v_booking.user_id,
          'booking_status', 'cancelled'
        );
      end if;
    end if;

    update public.bookings set status = 'confirmed', hold_expires_at = null
    where id = v_booking.id and status = 'pending';
    v_confirmed := found;

    if v_confirmed and v_booking.trip_id is not null then
      update public.trips set status = 'booked'
      where id = v_booking.trip_id and status in ('draft', 'planned');
    end if;
  end if;

  return jsonb_build_object(
    'result', v_status, 'confirmed_now', v_confirmed,
    'booking_id', v_booking.id, 'user_id', v_booking.user_id,
    'booking_status', case when v_confirmed then 'confirmed' else v_booking.status::text end
  );
end;
$$;

revoke execute on function public.slot_taken(uuid, date, time, uuid)         from public, anon, authenticated;
revoke execute on function public.create_booking(jsonb, int)                 from public, anon, authenticated;
revoke execute on function public.extend_booking_hold(uuid, uuid, int)       from public, anon, authenticated;
grant  execute on function public.slot_taken(uuid, date, time, uuid)         to service_role;
grant  execute on function public.create_booking(jsonb, int)                 to service_role;
grant  execute on function public.extend_booking_hold(uuid, uuid, int)       to service_role;
