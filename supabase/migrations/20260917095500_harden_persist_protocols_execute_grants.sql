-- P1 security hygiene (2026-09-17): persist_protocols_for_assessment is SECURITY DEFINER
-- and must be service_role-only (compute-tiers uses service key). Phase A1 CREATE left
-- anon/authenticated EXECUTE via Supabase default grants.
-- Also revoke PUBLIC on legacy 3-arg search_rombot_knowledge (unfiltered); 4-arg p_sport
-- overload already used by ai-chat service_role — no edge redeploy required.
-- LIVE applied via Supabase MCP as harden_persist_protocols_execute_grants.

REVOKE ALL ON FUNCTION public.persist_protocols_for_assessment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_protocols_for_assessment(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_protocols_for_assessment(uuid) TO service_role;

-- Cheap RAG hygiene: unfiltered 3-arg overload must not be PUBLIC-executable.
REVOKE ALL ON FUNCTION public.search_rombot_knowledge(vector, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_rombot_knowledge(vector, double precision, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_rombot_knowledge(vector, double precision, integer) TO authenticated, service_role;

-- Ensure 4-arg sport-filtered overload stays available to service_role (ai-chat path).
REVOKE ALL ON FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_rombot_knowledge(vector, text, double precision, integer) TO authenticated, service_role;
