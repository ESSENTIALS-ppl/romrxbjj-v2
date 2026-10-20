-- APPLIED Oct 19 2026 2:48 PM ET (Jim approved 2:47 PM ET). Step 1 of 2 (backward compatible, can ship before app changes).
-- Rechecked Oct 19 10:xx: added the set_config flag for the coach_id guard; otherwise unchanged.
-- Adds connect_coach_by_email: server-side lookup + link, so the app never needs coach_id or the name before linking.
CREATE OR REPLACE FUNCTION public.connect_coach_by_email(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_coach_user_id uuid;
  v_coach_id uuid;
  v_full_name text;
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  SELECT u.id, u.full_name INTO v_coach_user_id, v_full_name
  FROM public.users u
  WHERE lower(u.email) = lower(trim(coalesce(p_email, '')))
    AND u.portal_role = 'coach'
  LIMIT 1;
  IF v_coach_user_id IS NOT NULL THEN
    SELECT c.id INTO v_coach_id FROM public.coaches c WHERE c.user_id = v_coach_user_id LIMIT 1;
  END IF;
  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_coach_user_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self');
  END IF;
  -- Tells guard_athletes_coach_id (Phase B) this write came through this function. Transaction-local; clients
  -- cannot set it (pg_catalog.set_config is not exposed through the API).
  PERFORM set_config('romrx.coach_connect', v_coach_id::text, true);
  UPDATE public.athletes SET coach_id = v_coach_id, updated_at = now() WHERE user_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_athlete_profile');
  END IF;
  IF v_full_name IS NULL THEN
    SELECT au.raw_user_meta_data->>'full_name' INTO v_full_name FROM auth.users au WHERE au.id = v_coach_user_id;
  END IF;
  -- Caller is now linked, so the coach's display name may be shown.
  RETURN jsonb_build_object('ok', true, 'coach_name', v_full_name);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.connect_coach_by_email(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.connect_coach_by_email(text) TO authenticated;
