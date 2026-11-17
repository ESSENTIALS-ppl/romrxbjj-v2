-- P1-29b coach_linked_athletes (UNAPPLIED). BUILD ONLY, do not apply until gated.
-- DEPENDS ON P1-29 (20261117020100_p1_29_coach_roster_security_invoker, commit ae58b91f,
-- SQL sha256 b4861884) being applied first. That migration sets coach_roster
-- security_invoker=true and adds the users policy "users: linked coach reads roster
-- athletes", which lets a linked coach read EVERY users column of a linked athlete.
-- Stacy option A: narrow coach access to id, full_name and belt only.
--   1. public.coach_linked_athletes(): SECURITY DEFINER, search_path = '', returns only
--      id, full_name, belt of users linked to auth.uid() as coach (same athletes/coaches
--      join as coach_roster and the P1-29 policy).
--   2. EXECUTE for authenticated only (revoked from PUBLIC, anon and service_role).
--   3. DROP the P1-29 users policy, so a coach cannot read athlete users rows directly.
--   4. coach_roster keeps its 4 output columns (athlete_id, user_id, full_name, belt) and
--      security_barrier + security_invoker; full_name and belt now come from the helper.

BEGIN;

CREATE OR REPLACE FUNCTION public.coach_linked_athletes()
RETURNS TABLE (id uuid, full_name text, belt text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT u.id, u.full_name, u.belt
  FROM public.athletes a
  JOIN public.coaches c ON c.id = a.coach_id
  JOIN public.users u ON u.id = a.user_id
  WHERE c.user_id = (SELECT auth.uid());
$fn$;

REVOKE ALL ON FUNCTION public.coach_linked_athletes() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.coach_linked_athletes() TO authenticated;

DROP POLICY IF EXISTS "users: linked coach reads roster athletes" ON public.users;

CREATE OR REPLACE VIEW public.coach_roster
  WITH (security_barrier = true, security_invoker = true) AS
  SELECT a.id AS athlete_id,
         a.user_id,
         h.full_name,
         h.belt
  FROM public.athletes a
  JOIN public.coaches c ON c.id = a.coach_id
  JOIN public.coach_linked_athletes() h ON h.id = a.user_id
  WHERE c.user_id = (SELECT auth.uid());

COMMIT;
