-- F-01 (Sport apps audit 2026-10-02): restrict public.is_test_account to the fixture pattern at @romrx.io only.
-- Before: matched ILIKE '%+romrx-%' on ANY domain (plus test@gmail.com). Anyone could register name+romrx-x@gmail.com,
-- use Stripe TEST checkout (create-checkout-session / stripe-webhook honour is_test_account) and receive
-- production Base / sport entitlements without paying.
-- After: only jim+romrx-<tag>@romrx.io (case-insensitive, tag = [a-z0-9._-]+). All 13 existing fixtures match.
-- All edge functions (create-checkout-session, create-portal-session, stripe-webhook) call this RPC, so no function redeploy is needed.
-- Data: none changed.
-- Rollback:
--   CREATE OR REPLACE FUNCTION public.is_test_account(p_email text) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
--   SET search_path TO 'public' AS $f$
--     select coalesce(p_email, '') ilike 'jim+romrx-%@romrx.io'
--         or coalesce(p_email, '') ilike '%+romrx-%'
--         or lower(coalesce(p_email, '')) in ('test@gmail.com');
--   $f$;
CREATE OR REPLACE FUNCTION public.is_test_account(p_email text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
  select lower(coalesce(p_email, '')) ~ '^jim\+romrx-[a-z0-9._-]+@romrx\.io$';
$function$;
