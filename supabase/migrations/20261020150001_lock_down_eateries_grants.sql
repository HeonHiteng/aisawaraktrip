-- ============================================================
-- 0020 lock down eateries table privileges
--
-- Problem (0018): `public.eateries` is created AFTER 0008's
-- `revoke ... on all tables in schema public`, which only touched the tables
-- that existed at the time. Supabase grants ALL on new public tables to the
-- API roles by default, so anon and authenticated ended up holding every
-- table privilege on eateries (SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES, TRIGGER). RLS (`eateries_admin_write`) still blocks the row
-- writes, but TRUNCATE / REFERENCES / TRIGGER are not subject to RLS.
--
-- Fix: same rules as 0008, applied to eateries.
--  * anon: read only (SELECT stays, filtered by `eateries_read`).
--  * authenticated: keeps SELECT / INSERT / UPDATE / DELETE so admins can
--    write through RLS (`eateries_admin_write` = is_admin()); loses the
--    privileges that bypass RLS.
-- ============================================================

-- Anonymous visitors never write anything in `public`.
revoke insert, update, delete, truncate, references, trigger
  on public.eateries from anon;

-- Privileges that bypass RLS: never needed by the client roles.
revoke truncate, references, trigger
  on public.eateries from authenticated;
