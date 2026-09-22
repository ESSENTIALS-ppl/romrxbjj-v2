-- P1 Security Advisor: anon_security_definer_function_executable on
-- public.ensure_public_user_profile(uuid, text, jsonb).
-- Original orphan-sync migration (20260921230000) intended service_role-only;
-- Supabase default grants left anon + authenticated EXECUTE. Function is
-- SECURITY DEFINER and upserts athletes/users — must not be public RPC.
-- Callers are auth triggers (handle_new_user / handle_auth_user_updated),
-- which run as owner and do not need anon/authenticated EXECUTE.
-- Smallest safe fix: revoke PUBLIC/anon/authenticated; keep service_role.
-- LIVE applied via Supabase MCP as revoke_anon_ensure_public_user_profile
-- (version 20260922163347) on Tue Sep 22, 2026 ~12:33 PM ET.

REVOKE ALL ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) TO service_role;
