-- =====================================================================
-- HOTFIX: Convert RESTRICTIVE service-role policies to PERMISSIVE
-- =====================================================================
-- Bug: 9 tables had service-role policies created as RESTRICTIVE.
-- RESTRICTIVE means EVERY row must pass the policy. For an authenticated
-- user, `current_setting('role') = 'service_role'` is always false,
-- which means the policy filtered out 100% of rows — even rows the user
-- should be able to see via their own permissive "self read" policies.
--
-- This was hidden until PR #1 switched get_my_profile() to SECURITY INVOKER,
-- which made the RPC honor RLS as the calling user. Result: athletes saw
-- empty assessments / profiles / coach data in the UI even though all DB
-- rows were intact.
--
-- Fix: drop each broken policy and recreate it as PERMISSIVE with the same
-- USING clause. Service-role behavior is unchanged (Supabase service_role
-- bypasses RLS by default; these policies are belt+suspenders).
--
-- Rollback: see bottom of file.
-- =====================================================================

BEGIN;

-- ---- alert_dismissals ----
DROP POLICY IF EXISTS "alert_dismissals: service role" ON public.alert_dismissals;
CREATE POLICY "alert_dismissals: service role" ON public.alert_dismissals
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- assessments ----
DROP POLICY IF EXISTS "assessments: service role" ON public.assessments;
CREATE POLICY "assessments: service role" ON public.assessments
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- coach_notes ----
DROP POLICY IF EXISTS "coach_notes: service role" ON public.coach_notes;
CREATE POLICY "coach_notes: service role" ON public.coach_notes
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- coaches ----
DROP POLICY IF EXISTS "coaches: service role" ON public.coaches;
CREATE POLICY "coaches: service role" ON public.coaches
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- joint_scores ----
DROP POLICY IF EXISTS "joint_scores: service role" ON public.joint_scores;
CREATE POLICY "joint_scores: service role" ON public.joint_scores
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- protocols ----
DROP POLICY IF EXISTS "protocols: service role" ON public.protocols;
CREATE POLICY "protocols: service role" ON public.protocols
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- schools ----
DROP POLICY IF EXISTS "schools: service role" ON public.schools;
CREATE POLICY "schools: service role" ON public.schools
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- technique_eligibility ----
DROP POLICY IF EXISTS "technique_eligibility: service role" ON public.technique_eligibility;
CREATE POLICY "technique_eligibility: service role" ON public.technique_eligibility
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

-- ---- users ----
DROP POLICY IF EXISTS "users: service role full access" ON public.users;
CREATE POLICY "users: service role full access" ON public.users
  AS PERMISSIVE FOR ALL TO public
  USING (current_setting('role') = 'service_role');

COMMIT;

-- =====================================================================
-- ROLLBACK (do NOT run unless reverting):
-- =====================================================================
-- BEGIN;
-- DROP POLICY "alert_dismissals: service role" ON public.alert_dismissals;
-- CREATE POLICY "alert_dismissals: service role" ON public.alert_dismissals
--   AS RESTRICTIVE FOR ALL TO public
--   USING (current_setting('role') = 'service_role');
-- -- (repeat for each of the 9 tables)
-- COMMIT;
