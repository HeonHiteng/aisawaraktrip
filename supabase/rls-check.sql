-- ============================================================
-- RLS audit — run in the Supabase SQL Editor after applying migrations.
-- Every public table MUST report rls_enabled = true and have >= 1 policy
-- (except payments / booking_status_history, which are read-only via policy
--  and written only by the service role / triggers).
-- ============================================================

-- 1. RLS on/off per table
select
  c.relname            as table_name,
  c.relrowsecurity     as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2. Policies per table
select
  schemaname,
  tablename,
  policyname,
  cmd            as command,
  roles,
  qual           as using_expr,
  with_check     as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Tables with RLS enabled but NO policies (would deny everything — usually a bug)
select c.relname as table_without_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  );

-- 4. Sanity: SECURITY DEFINER helper functions used by policies
select p.proname, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin', 'handle_new_user', 'enforce_booking_status',
                    'protect_profile_role');
