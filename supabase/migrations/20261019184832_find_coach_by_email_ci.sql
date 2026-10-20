-- APPLIED Oct 19 2026 2:48 PM ET (Jim approved 2:47 PM ET). (c) Case-insensitive coach email lookup. Safe BEFORE the Sunday app changes:
-- same return shape as live (found, reason, coach_id, user_id, full_name, email), so live Connect keeps working.
-- Only the match changes: lower() on BOTH sides (live lowercases only the typed email).
-- Read-only check Oct 19: 0 lowercase collisions in public.users (all roles) and auth.users; 0 users emails with
-- uppercase/spaces; 0 public.users vs auth.users email mismatches; 0 coach-role users today.
-- The unique index on lower(email) makes the match unambiguous going forward and lets the lower(email) lookup use an
-- index. It fails to build only if a case-only duplicate exists (none today).
-- Step 2 (20261025120000, Sunday) replaces this function with the yes/no version, which already uses lower(u.email).
CREATE OR REPLACE FUNCTION public.find_coach_by_email(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coach_user_id uuid;
  v_coach_id uuid;
  v_full_name text;
  v_email text;
BEGIN
  SELECT id, full_name, email INTO v_coach_user_id, v_full_name, v_email
  FROM public.users
  WHERE lower(email) = lower(trim(coalesce(p_email, '')))
    AND portal_role = 'coach'
  LIMIT 1;

  IF v_coach_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = v_coach_user_id
  LIMIT 1;

  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'coach_row_missing');
  END IF;

  IF v_full_name IS NULL THEN
    SELECT au.raw_user_meta_data->>'full_name' INTO v_full_name FROM auth.users au WHERE au.id = v_coach_user_id;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'coach_id', v_coach_id,
    'user_id', v_coach_user_id,
    'full_name', v_full_name,
    'email', v_email
  );
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON public.users (lower(email));
