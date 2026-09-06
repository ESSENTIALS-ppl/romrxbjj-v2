-- Sprint 1 Secure the castle (2026-09-06)
-- LIVE applied via Supabase MCP as sprint1_revoke_anon_entitlement_definer_rpcs.
-- These SECURITY DEFINER RPCs take arbitrary p_user_id and must be service_role-only
-- (called from stripe-webhook / edge with service key).

REVOKE ALL ON FUNCTION public.add_sport_access(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_sport_access(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_sport_access(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.remove_sport_access(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_sport_access(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sport_access(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.recompute_user_eligibility(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_user_eligibility(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_user_eligibility(uuid) TO service_role;
