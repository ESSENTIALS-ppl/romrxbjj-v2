-- F-01 hardening (follow-up to 20261002190000_is_test_account_romrx_io_only).
-- Approved by Jim (security part), relayed by Grant 2026-10-02.
--
-- Problem: after the @romrx.io restriction, anyone could still sign up as jim+romrx-anything@romrx.io
-- (email confirmation is effectively off) and pass is_test_account, reaching the test-mode checkout
-- and webhook path that writes real entitlements.
--
-- New rule: is_test_account(email) is true only when BOTH
--   (1) the email matches ^jim\+romrx-[a-z0-9._-]+@romrx\.io$ , AND
--   (2) the matching auth.users row has raw_app_meta_data->>'test_fixture' = 'true'.
-- raw_app_meta_data cannot be written by a signed-in user (signUp options.data and updateUser write
-- raw_user_meta_data only); it needs the service role / Auth admin API / SQL as postgres.
--
-- Also: the function now reads auth.users, so it is SECURITY DEFINER + STABLE, and EXECUTE is
-- revoked from anon/authenticated/PUBLIC (no client calls it; edge functions use the service role;
-- the product-event triggers are SECURITY DEFINER owned by postgres). This closes an email oracle.
-- New helper public.flag_test_fixture(email) (service_role only) sets the flag after a fixture signs up.
--
-- Known side effect: the product-event triggers (tg_pe_auth_user_created, tg_pe_lead) stamp is_test at
-- insert time, so a brand-new fixture is stamped is_test=false until it is flagged (analytics only,
-- ops views evaluate live and are correct after the flag is set). Existing rows are unchanged.
--
-- ROLLBACK (run as postgres):
--   CREATE OR REPLACE FUNCTION public.is_test_account(p_email text) RETURNS boolean
--     LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public' AS $f$
--     select lower(coalesce(p_email, '')) ~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$'; $f$;
--   GRANT EXECUTE ON FUNCTION public.is_test_account(text) TO PUBLIC, anon, authenticated, service_role;
--   DROP FUNCTION IF EXISTS public.flag_test_fixture(text);
--   -- optional: remove the flag again
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'test_fixture'
--     WHERE lower(email) ~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$';

-- 1) Backfill the flag for EXISTING fixtures only (pattern match), in the same transaction as the
--    function change so there is no window where fixtures stop working.
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"test_fixture": true}'::jsonb
WHERE lower(email) ~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$'
  AND coalesce(raw_app_meta_data->>'test_fixture', '') <> 'true';

-- 2) Hardened function.
CREATE OR REPLACE FUNCTION public.is_test_account(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $$
  select lower(coalesce(p_email, '')) ~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$'
     and exists (
       select 1
       from auth.users u
       where lower(u.email) = lower(p_email)
         and u.raw_app_meta_data ->> 'test_fixture' = 'true'
     );
$$;

REVOKE ALL ON FUNCTION public.is_test_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_test_account(text) TO service_role, postgres;

-- 3) Service-side helper to flag a fixture after signup. Pattern-guarded so it can never flag a real user.
CREATE OR REPLACE FUNCTION public.flag_test_fixture(p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'pg_temp'
AS $$
declare n integer;
begin
  if lower(coalesce(p_email, '')) !~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$' then
    raise exception 'flag_test_fixture: email does not match the fixture pattern';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"test_fixture": true}'::jsonb
   where lower(email) = lower(p_email);
  get diagnostics n = row_count;
  return n;
end;
$$;

REVOKE ALL ON FUNCTION public.flag_test_fixture(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flag_test_fixture(text) TO service_role, postgres;
