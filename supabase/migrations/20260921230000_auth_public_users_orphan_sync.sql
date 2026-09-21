-- Auth → public.users profile sync harden + safe backfill for Base beta orphans.
--
-- Root cause (EVIDENCE): May 2026 on_auth_user_created / handle_new_user only
-- inserted public.athletes. public.users depended on a skippable FE path.
-- July 2026 handle_new_user began inserting public.users for new signups, but
-- May orphans (athletes yes, users no) remained. Assessed cohort: 7/7 have
-- public.users; orphans cannot reach assessable app state.
--
-- Durable fix:
--   1) ensure_public_user_profile() — single upsert path for athletes + users
--   2) handle_new_user() — calls ensure (cannot skip on signup)
--   3) handle_auth_user_updated() — heals missing public.users on login /
--      metadata refresh (last_sign_in_at UPDATE)
--
-- Backfill: 4 customerish orphans ONLY. Defaults match handle_new_user
-- (base_status=inactive, active_sport=general, portal_role=athlete).
-- No grandfather / sport entitlements / activation emails.
-- Explicitly NOT touched: send.jim.scott@, ardrenna, Crystal, Damian/Aaron,
-- test@gmail.com.

CREATE OR REPLACE FUNCTION public.ensure_public_user_profile(
  p_id uuid,
  p_email text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_full_name text := coalesce(
    nullif(trim(p_meta->>'full_name'), ''),
    split_part(p_email, '@', 1)
  );
  v_sport text := coalesce(nullif(p_meta->>'active_sport', ''), 'general');
  v_bb_tier text := nullif(p_meta->>'active_bb_tier', '');
  v_belt text := nullif(p_meta->>'belt', '');
BEGIN
  IF p_id IS NULL OR p_email IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sport_config sc WHERE sc.slug = v_sport) THEN
    v_sport := 'general';
  END IF;

  IF v_bb_tier IS NOT NULL
     AND v_bb_tier NOT IN ('beginner', 'intermediate', 'advanced') THEN
    v_bb_tier := NULL;
  END IF;

  IF v_belt IS NOT NULL
     AND v_belt NOT IN ('white', 'blue', 'purple', 'brown', 'black') THEN
    v_belt := NULL;
  END IF;

  INSERT INTO public.athletes (user_id, email, full_name)
  VALUES (p_id, p_email, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  -- GATE: sports_enabled/platforms ALWAYS general at signup. Sport access is
  -- granted only by Stripe webhook. active_sport is UI display hint.
  -- portal_role forced athlete — do not promote coach from raw meta.
  INSERT INTO public.users (
    id, email, full_name, belt,
    active_sport, active_bb_tier,
    platforms, sports_enabled,
    portal_role, subscription_status, subscription_tier, base_status
  )
  VALUES (
    p_id, p_email, v_full_name, v_belt,
    v_sport, v_bb_tier,
    ARRAY['general']::text[], ARRAY['general']::text[],
    'athlete', 'inactive', 'free', 'inactive'
  )
  ON CONFLICT (id) DO UPDATE
    SET email          = EXCLUDED.email,
        full_name      = COALESCE(EXCLUDED.full_name, public.users.full_name),
        belt           = COALESCE(public.users.belt, EXCLUDED.belt),
        active_sport   = CASE
                           WHEN public.users.active_sport IS NULL
                             OR public.users.active_sport = 'general'
                           THEN EXCLUDED.active_sport
                           ELSE public.users.active_sport
                         END,
        active_bb_tier = COALESCE(public.users.active_bb_tier, EXCLUDED.active_bb_tier);
        -- sports_enabled / platforms / base_status / subscription_* intentionally
        -- NOT overwritten so returning paid users keep granted access.
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sport text := coalesce(new.raw_user_meta_data->>'active_sport', 'general');
  v_athlete_id uuid;
  v_lead record;
  v_ad jsonb;
BEGIN
  PERFORM public.ensure_public_user_profile(
    new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );

  SELECT id INTO v_athlete_id FROM public.athletes WHERE user_id = new.id;

  IF NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.user_id = new.id) THEN
    SELECT l.id, l.assessment_data
      INTO v_lead
      FROM public.leads l
      WHERE l.email = new.email
        AND l.assessment_data IS NOT NULL
        AND l.created_at >= now() - interval '30 days'
        AND l.converted_user_id IS NULL
      ORDER BY l.created_at DESC
      LIMIT 1;

    IF v_lead.id IS NOT NULL AND v_athlete_id IS NOT NULL THEN
      v_ad := v_lead.assessment_data;
      INSERT INTO public.assessments (
        user_id, athlete_id, sport, assessed_at,
        hip_er_l, hip_er_r, hip_ir_l, hip_ir_r,
        hip_abd_l, hip_abd_r, hip_flex_l, hip_flex_r,
        ankle_df_l, ankle_df_r,
        shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r,
        lumbar_flex, lumbar_ext,
        cervical_flex, cervical_ext, cervical_lat_l, cervical_lat_r
      ) VALUES (
        new.id, v_athlete_id, v_sport, now(),
        (v_ad->>'hip_er_l')::numeric, (v_ad->>'hip_er_r')::numeric,
        (v_ad->>'hip_ir_l')::numeric, (v_ad->>'hip_ir_r')::numeric,
        (v_ad->>'hip_abd_l')::numeric, (v_ad->>'hip_abd_r')::numeric,
        (v_ad->>'hip_flex_l')::numeric, (v_ad->>'hip_flex_r')::numeric,
        (v_ad->>'ankle_df_l')::numeric, (v_ad->>'ankle_df_r')::numeric,
        (v_ad->>'shoulder_er_l')::numeric, (v_ad->>'shoulder_er_r')::numeric,
        (v_ad->>'shoulder_flex_l')::numeric, (v_ad->>'shoulder_flex_r')::numeric,
        (v_ad->>'lumbar_flex')::numeric, (v_ad->>'lumbar_ext')::numeric,
        (v_ad->>'cervical_flex')::numeric, (v_ad->>'cervical_ext')::numeric,
        (v_ad->>'cervical_lat_l')::numeric, (v_ad->>'cervical_lat_r')::numeric
      );

      UPDATE public.leads
        SET converted_user_id = new.id, converted_at = now()
        WHERE id = v_lead.id;
    END IF;
  END IF;

  RETURN new;
END;
$function$;

-- Heal path: any auth.users UPDATE (incl. last_sign_in_at on login) ensures
-- a public.users row exists. Future orphans self-heal without ops.
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.id) THEN
    PERFORM public.ensure_public_user_profile(
      NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data, '{}'::jsonb)
    );
  ELSIF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Safe backfill: 4 customerish May orphans ONLY
-- Values mirror ensure_public_user_profile / handle_new_user defaults.
-- base_status=inactive · active_sport=general · no grandfather / sport packs
-- ---------------------------------------------------------------------------
INSERT INTO public.users (
  id, email, full_name, belt,
  active_sport, active_bb_tier,
  platforms, sports_enabled,
  portal_role, subscription_status, subscription_tier, base_status
)
SELECT
  a.id,
  a.email,
  coalesce(nullif(trim(a.raw_user_meta_data->>'full_name'), ''), split_part(a.email, '@', 1)),
  CASE
    WHEN a.raw_user_meta_data->>'belt' IN ('white','blue','purple','brown','black')
      THEN a.raw_user_meta_data->>'belt'
    ELSE NULL
  END,
  'general',
  NULL,
  ARRAY['general']::text[],
  ARRAY['general']::text[],
  'athlete',
  'inactive',
  'free',
  'inactive'
FROM auth.users a
WHERE a.email IN (
  'jtfmitchell@gmail.com',
  'tkballentine8999@gmail.com',
  'lehvann@gmail.com',
  'loremartialarts@gmail.com'
)
AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
ON CONFLICT (id) DO NOTHING;
