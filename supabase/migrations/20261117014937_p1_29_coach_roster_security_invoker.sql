-- P1-29 coach_roster security_invoker (UNAPPLIED). BUILD ONLY, do not apply until gated.
-- Live view (public.coach_roster) is security_barrier=true only, owner postgres, which is
-- SECURITY DEFINER behavior and is the remaining security advisor ERROR.
-- This keeps the same view query and security_barrier, and sets security_invoker=true so
-- RLS on athletes, coaches, and users applies to the caller.
-- A narrow users SELECT policy is required so a linked coach can still see full_name and
-- belt of their own athletes (users RLS otherwise allows only self, school admin, and
-- service_role). That is the same data the definer view already exposed, limited to
-- linked athletes. Do not re-apply a34aa573; this file is the only new statement.

BEGIN;

ALTER VIEW public.coach_roster SET (security_invoker = true);

DROP POLICY IF EXISTS "users: linked coach reads roster athletes" ON public.users;
CREATE POLICY "users: linked coach reads roster athletes"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athletes a
      JOIN public.coaches c ON c.id = a.coach_id
      WHERE a.user_id = users.id
        AND c.user_id = (SELECT auth.uid())
    )
  );

COMMIT;
