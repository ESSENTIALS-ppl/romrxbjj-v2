-- P1-29c coach athletes narrow (UNAPPLIED). BUILD ONLY, do not apply until gated.
-- DEPENDS ON, in this order:
--   P1-29  20261117020100_p1_29_coach_roster_security_invoker (ae58b91f, SQL sha256 b4861884...)
--   P1-29b 20261117020300_p1_29b_coach_linked_athletes      (89b0be9c, SQL sha256 f0558b74...)
-- This file must be applied after both.
--
-- Goal: a linked coach can no longer SELECT public.athletes rows directly (email, age,
-- injury_flags, ...). Live policy "coaches_select_athletes" is dropped.
--
-- Column proof (receipt): no user-JWT client or edge-function path reads public.athletes as a
-- coach. Coach screens get athletes columns only through service-role edge functions
-- (get-coach-roster v21, coach-actions v27, ai-chat v96), which bypass RLS. The only JWT
-- consumers of the coach->athlete link are RLS policies and coach_roster, and they need only
-- the link keys athletes.id and athletes.user_id.
--
-- 1. public.coach_linked_athlete_ids(): SECURITY DEFINER, search_path '', returns only
--    athlete_id and user_id of athletes linked to auth.uid() as coach.
-- 2. EXECUTE for authenticated only (revoked from PUBLIC, anon, service_role).
-- 3. DROP POLICY coaches_select_athletes ON public.athletes.
-- 4. The six coach policies on other tables that subquery public.athletes under the caller's
--    RLS would silently return nothing once (3) lands. Each is recreated with the same name,
--    same command and the same predicate, read through the helper, TO authenticated
--    (for anon the old predicate was always false because auth.uid() is null).
-- 5. coach_roster keeps its 4 columns, security_barrier and security_invoker; it reads the
--    link through coach_linked_athlete_ids() and names through coach_linked_athletes() (29b).

BEGIN;

CREATE OR REPLACE FUNCTION public.coach_linked_athlete_ids()
RETURNS TABLE (athlete_id uuid, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT a.id, a.user_id
  FROM public.athletes a
  JOIN public.coaches c ON c.id = a.coach_id
  WHERE c.user_id = (SELECT auth.uid());
$fn$;

REVOKE ALL ON FUNCTION public.coach_linked_athlete_ids() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.coach_linked_athlete_ids() TO authenticated;

DROP POLICY IF EXISTS coaches_select_athletes ON public.athletes;

DROP POLICY IF EXISTS coaches_select_assessments ON public.assessments;
CREATE POLICY coaches_select_assessments ON public.assessments
  FOR SELECT TO authenticated
  USING (assessments.athlete_id IN (SELECT l.athlete_id FROM public.coach_linked_athlete_ids() l));

DROP POLICY IF EXISTS coaches_insert_assessments ON public.assessments;
CREATE POLICY coaches_insert_assessments ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (assessments.athlete_id IN (SELECT l.athlete_id FROM public.coach_linked_athlete_ids() l));

DROP POLICY IF EXISTS drill_sessions_coach ON public.drill_sessions;
CREATE POLICY drill_sessions_coach ON public.drill_sessions
  FOR SELECT TO authenticated
  USING (drill_sessions.user_id IN (SELECT l.user_id FROM public.coach_linked_athlete_ids() l));

DROP POLICY IF EXISTS game_plans_coach ON public.game_plans;
CREATE POLICY game_plans_coach ON public.game_plans
  FOR SELECT TO authenticated
  USING (game_plans.user_id IN (SELECT l.user_id FROM public.coach_linked_athlete_ids() l));

DROP POLICY IF EXISTS completions_coach_read ON public.protocol_completions;
CREATE POLICY completions_coach_read ON public.protocol_completions
  FOR SELECT TO authenticated
  USING (protocol_completions.user_id IN (SELECT l.user_id FROM public.coach_linked_athlete_ids() l));

DROP POLICY IF EXISTS ps_coach ON public.protocol_sessions;
CREATE POLICY ps_coach ON public.protocol_sessions
  FOR SELECT TO authenticated
  USING (protocol_sessions.user_id IN (SELECT l.user_id FROM public.coach_linked_athlete_ids() l));

CREATE OR REPLACE VIEW public.coach_roster
  WITH (security_barrier = true, security_invoker = true) AS
  SELECT l.athlete_id,
         l.user_id,
         h.full_name,
         h.belt
  FROM public.coach_linked_athlete_ids() l
  JOIN public.coach_linked_athletes() h ON h.id = l.user_id;

COMMIT;
