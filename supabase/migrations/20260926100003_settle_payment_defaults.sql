-- ============================================================
-- 0012 settle_payment: optional parameters get real defaults
--
-- Same behaviour as 0011. Only the signature changes: the optional inputs
-- (provider payment id, raw payload, expected user) move last and default, so the
-- generated TypeScript types mark them optional and callers can simply omit them
-- instead of casting `null` past the type checker.
-- ============================================================

drop function if exists public.settle_payment(
  text, text, public.payment_status, text, numeric, jsonb, uuid
);

create function public.settle_payment(
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
begin
  -- Lock the payment first: a second callback for the same payment waits here
  -- and then sees the settled state below.
  select * into v_pay
  from public.payments
  where provider = p_provider and provider_ref = p_provider_ref
  for update;
  if not found then
    return jsonb_build_object('result', 'unknown');
  end if;

  select * into v_booking from public.bookings where id = v_pay.booking_id for update;

  -- The user-return path passes the signed-in user: someone else's payment ref is "unknown".
  if p_expected_user is not null and v_booking.user_id <> p_expected_user then
    return jsonb_build_object('result', 'unknown');
  end if;

  -- Settled payments never change again.
  if v_pay.status in ('paid', 'refunded') then
    return jsonb_build_object(
      'result', v_pay.status, 'confirmed_now', false,
      'booking_id', v_booking.id, 'user_id', v_booking.user_id,
      'booking_status', v_booking.status
    );
  end if;

  -- "Paid" for a different amount than we snapshotted is tampered or stale: never confirm on it.
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
    -- Only a PENDING booking is confirmed. Money for a booking that was cancelled
    -- mid-payment must not revive it: report it (confirmed_now = false) so it gets refunded.
    update public.bookings set status = 'confirmed'
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

revoke execute on function public.settle_payment(text, text, public.payment_status, numeric, jsonb, text, uuid)
  from public, anon, authenticated;
grant execute on function public.settle_payment(text, text, public.payment_status, numeric, jsonb, text, uuid)
  to service_role;
