-- ============================================================
-- 0013 review gate, enforced by the database
--
-- A traveller may review an experience only after a booking for it has been
-- confirmed or completed. The app checks this before inserting (to give a friendly
-- message), but reviews are written with the service role — which bypasses RLS — so
-- the rule also lives here: a bug in any future code path still cannot create a
-- review for something the reviewer never booked.
-- ============================================================

create or replace function public.enforce_review_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings b
    where b.user_id = new.user_id
      and b.experience_id = new.experience_id
      and b.status in ('confirmed', 'completed')
  ) then
    raise exception 'a review requires a confirmed or completed booking'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reviews_enforce_gate
  before insert on public.reviews
  for each row execute function public.enforce_review_gate();

-- Trigger functions are never called directly.
revoke execute on function public.enforce_review_gate() from public, anon, authenticated;
