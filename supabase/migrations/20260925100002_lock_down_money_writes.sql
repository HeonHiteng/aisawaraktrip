-- ============================================================
-- 0008 lock down money writes
--
-- Problem (0004/0005): `bookings_insert_self` / `bookings_update` let ANY signed-in
-- user — including anonymous guests — write bookings straight through PostgREST
-- with the public anon key. The status trigger only guards `status`, so a client
-- could insert a `confirmed` booking with total_amount = 0, or rewrite the price
-- of an existing one, bypassing payment entirely.
--
-- Fix: bookings, payments and status history are written ONLY by the server
-- (service role, after requireUser() + Zod validation + server-side price
-- snapshot). Clients keep read access to their own rows through RLS.
--
-- Defense in depth:
--  * `enforce_booking_status` (0004) stays: it still logs history and guards any
--    non-service-role path added later.
--  * TRUNCATE / REFERENCES / TRIGGER are not subject to RLS and Supabase grants
--    ALL on new public tables by default, so revoke them from the client roles.
-- ============================================================

drop policy if exists "bookings_insert_self" on public.bookings;
drop policy if exists "bookings_update"      on public.bookings;
drop policy if exists "bookings_admin_delete" on public.bookings;

revoke insert, update, delete
  on public.bookings, public.payments, public.booking_status_history
  from anon, authenticated;

-- Anonymous visitors never write anything in `public`.
revoke insert, update, delete on all tables in schema public from anon;

-- Privileges that bypass RLS: never needed by the client roles.
revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated;
