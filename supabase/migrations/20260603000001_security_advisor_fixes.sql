-- =====================================================================
-- PR #1: Security Advisor Cleanup
-- =====================================================================
-- Closes all 32 security advisor lints on project romrxbjj-v2.
--
-- Strategy (Hybrid C, locked in 2026-06-02):
--   * Lint 0010 (security_definer_view, x2)
--       -> ALTER VIEW ... SET (security_invoker = true)
--   * Lint 0011 (function_search_path_mutable, x4)
--       -> ALTER FUNCTION ... SET search_path = public, pg_temp
--   * Lint 0014 (extension_in_public, x1: pgvector)
--       -> Accepted as risk. Supabase ships pgvector in public by default.
--          Documented here; no SQL change.
--   * Lints 0028 / 0029 (anon/authenticated_security_definer_function_executable, x12+12)
--       Hybrid C policy:
--         A) Read-only helpers -> switch to SECURITY INVOKER (RLS protects).
--            get_my_profile, get_my_coach, find_coach_by_email,
--            search_rombot_knowledge
--         B) Write helpers that need elevated privileges -> KEEP DEFINER,
--            REVOKE from anon (still callable by authenticated).
--            save_my_profile, save_my_gym, coach_promote_athlete
--         C) Internal trigger-only definer functions -> REVOKE from both
--            anon and authenticated (they should never be called via RPC).
--            handle_new_user, handle_consent_signed, handle_auth_user_updated,
--            handle_new_auth_user, tg_after_consent_insert
--
--   * Bonus: RomBot knowledge entitlement RLS
--       The previous policy on public.rombot_knowledge let any authenticated
--       user read every knowledge chunk. Under the new multi-tenant model
--       (RomBot is sport-aware, one-way: sport users see general too, but
--       general users never see sport content), we replace it with a
--       sport-aware policy that respects users.platforms[].
--
-- Acceptance:
--   * get_advisors(type='security') drops from 32 to <= 2 lints
--     (the 2 expected: extension_in_public/vector accepted risk +
--      auth_leaked_password_protection which is fixed via dashboard, not SQL)
--   * Existing 6 paying BJJ users see no regression
--   * RomBot for BJJ users returns BJJ + general knowledge
--   * Stripe webhook (service_role) is unaffected
--
-- This migration is idempotent: re-running is a no-op.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Fix security_definer views (lint 0010)
-- ---------------------------------------------------------------------
ALTER VIEW public.latest_technique_eligibility SET (security_invoker = true);
ALTER VIEW public.rombot_context              SET (security_invoker = true);

-- ---------------------------------------------------------------------
-- 2. Pin search_path on functions with mutable search_path (lint 0011)
-- ---------------------------------------------------------------------
ALTER FUNCTION public.set_schools_updated_at()  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()          SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()         SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_consent_signed()   SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------
-- 3. Read-only helpers -> SECURITY INVOKER (lints 0028 + 0029)
--    RLS on the underlying tables (users, athletes, coaches,
--    rombot_knowledge) enforces access. No grants change here; PostgREST
--    still exposes these via /rest/v1/rpc/* for authenticated users.
-- ---------------------------------------------------------------------
ALTER FUNCTION public.get_my_profile()                     SECURITY INVOKER;
ALTER FUNCTION public.get_my_coach()                       SECURITY INVOKER;
ALTER FUNCTION public.find_coach_by_email(text)            SECURITY INVOKER;
ALTER FUNCTION public.search_rombot_knowledge(public.vector, double precision, integer)
                                                           SECURITY INVOKER;

-- Belt-and-suspenders: anon should never call these. RLS will block it
-- anyway, but revoking EXECUTE returns a clean 401 instead of an empty set.
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_coach()                                FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_coach_by_email(text)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_rombot_knowledge(public.vector, double precision, integer)
                                                                                FROM anon;

-- ---------------------------------------------------------------------
-- 4. Write helpers -> keep DEFINER, revoke from anon (lints 0028)
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.save_my_profile(text, text, text)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_my_gym(text)                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.coach_promote_athlete(uuid, text)            FROM anon;

-- ---------------------------------------------------------------------
-- 5. Internal trigger-only functions -> revoke from anon AND authenticated
--    These should only fire as triggers; nobody should call them via RPC.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_consent_signed()        FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_updated()     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()         FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_after_consent_insert()      FROM anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 6. RomBot knowledge entitlement RLS (multi-tenant prep)
--    Old policy: any authenticated user reads everything.
--    New policy: a user reads a chunk if either
--        - chunk.sport = 'general'  (everyone gets general knowledge), OR
--        - chunk.sport is in the user's entitled sports (users.platforms[])
--
--    This makes RomBot one-way sport-aware exactly as Jim wants:
--      ROMRx Basic (platforms = {})       -> general only
--      BJJ (platforms = {bjj})            -> general + bjj
--      BB  (platforms = {bodybuilding})   -> general + bodybuilding
--      Both (platforms = {bjj,bb})        -> general + bjj + bodybuilding
--
--    NOTE: rombot_knowledge.sport already exists with default 'bjj'. This
--    policy works today (everyone has platforms = {bjj} via default), and
--    is forward-compatible with PR #2's sports_enabled work.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read knowledge"  ON public.rombot_knowledge;
DROP POLICY IF EXISTS "rombot_knowledge_read_sport_entitled"    ON public.rombot_knowledge;

CREATE POLICY "rombot_knowledge_read_sport_entitled"
  ON public.rombot_knowledge
  FOR SELECT
  TO authenticated
  USING (
    sport = 'general'
    OR sport = ANY (
         COALESCE(
           (SELECT platforms FROM public.users WHERE id = auth.uid()),
           ARRAY[]::text[]
         )
       )
  );

-- service_role bypasses RLS automatically; no separate policy needed for
-- edge functions calling with the service key.

COMMIT;

-- =====================================================================
-- Post-migration manual step (not SQL):
--   In Supabase Dashboard -> Authentication -> Policies (Auth settings),
--   enable "Leaked Password Protection" (checks against HaveIBeenPwned).
--   This closes the auth_leaked_password_protection lint.
-- =====================================================================
