-- ============================================================
-- 0009 harden functions (Supabase security advisor findings)
--
--  * set_updated_at had a role-mutable search_path. Its body only calls now(),
--    so an empty search_path is safe.
--  * The SECURITY DEFINER trigger functions were executable over the public API
--    (/rest/v1/rpc/<name>). Triggers do not need EXECUTE on the trigger function
--    to fire (only the trigger's creator does), so revoke it from the client roles.
--
-- Deliberately NOT revoked: public.is_admin(). RLS policies call it as the
-- signed-in user, so anon/authenticated need EXECUTE; it only reports on the caller.
-- ============================================================

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.enforce_booking_status() from public, anon, authenticated;
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.protect_profile_role()   from public, anon, authenticated;
