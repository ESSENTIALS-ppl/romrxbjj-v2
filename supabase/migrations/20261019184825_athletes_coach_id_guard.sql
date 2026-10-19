-- APPLIED Oct 19 2026 2:48 PM ET (Jim approved 2:47 PM ET). (b) Phase A: safe to ship BEFORE the Sunday app changes.
-- athletes_update_own (USING auth.uid() = user_id, no WITH CHECK) lets a signed-in athlete write ANY value to
-- their own athletes.coach_id. A linked coach then reads that athlete's data (coaches_select_athletes,
-- assessments, game_plans, drill_sessions, protocol_sessions, completions) and can insert assessments.
-- This trigger checks direct client writes (role authenticated/anon) to coach_id:
--   * clearing to NULL (Disconnect) is always allowed
--   * a non-NULL value must be a real coaches row whose user has portal_role = 'coach' and is not the caller
-- service_role, migrations and the FK's ON DELETE SET NULL are not checked. Writes from connect_coach_by_email
-- carry a transaction-local flag and pass. Other SECURITY DEFINER functions that touch athletes (coach_promote_athlete,
-- save_my_profile, save_my_gym, handle_consent_signed) do not change coach_id, so the trigger does not fire for them.
-- Live Connect flow keeps working: live find_coach_by_email only ever returns a coach_id that passes this check.
-- Limit: this does NOT stop linking to a real coach whose coach_id the caller knows (live find_coach_by_email still
-- hands coach_id to anyone who types the coach's email). That is closed by Phase B (20261025120100) after the apps
-- call connect_coach_by_email.
CREATE OR REPLACE FUNCTION public.guard_athletes_coach_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Only direct API writes are checked. current_setting('role') is the PostgREST role and stays the same inside
  -- SECURITY DEFINER functions (same test the coaches service policy uses). service_role, migrations and the FK's
  -- ON DELETE SET NULL pass.
  if coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.coach_id is not distinct from old.coach_id then
    return new;
  end if;
  if new.coach_id is null then
    return new;  -- unlink / Disconnect always allowed
  end if;
  if current_setting('romrx.coach_connect', true) = new.coach_id::text then
    return new;  -- set by connect_coach_by_email in this transaction
  end if;
  -- SECURITY DEFINER so this lookup can see coaches/users (athletes cannot read other users' rows under RLS).
  if not exists (
    select 1
    from public.coaches c
    join public.users u on u.id = c.user_id
    where c.id = new.coach_id
      and u.portal_role = 'coach'
      and c.user_id is distinct from auth.uid()
  ) then
    raise exception 'athletes: coach_id must be an existing coach'
      using errcode = '42501', hint = 'Connect a coach with connect_coach_by_email.';
  end if;
  return new;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_athletes_coach_id() FROM public, anon, authenticated;
-- Name starts with aaa_ so it runs before athletes_updated_at (alphabetical trigger order).
DROP TRIGGER IF EXISTS aaa_guard_athletes_coach_id ON public.athletes;
CREATE TRIGGER aaa_guard_athletes_coach_id
  BEFORE UPDATE OF coach_id ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.guard_athletes_coach_id();
