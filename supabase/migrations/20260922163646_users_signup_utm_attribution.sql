-- Persist first-touch UTM / signup_source onto public.users for ops Field.
-- Source of truth at signup remains auth.users.raw_user_meta_data (FE #48).
-- This copies into public.users so Reid can verify without auth.* only.
-- First-touch: do not overwrite non-null attribution columns on later updates.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_source text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;

COMMENT ON COLUMN public.users.signup_source IS
  'First-touch signup source (utm_source or fallback romrx.io) from auth user_metadata.';
COMMENT ON COLUMN public.users.utm_source IS 'First-touch utm_source from signup metadata.';
COMMENT ON COLUMN public.users.utm_medium IS 'First-touch utm_medium from signup metadata.';
COMMENT ON COLUMN public.users.utm_campaign IS 'First-touch utm_campaign from signup metadata.';
COMMENT ON COLUMN public.users.utm_content IS 'First-touch utm_content from signup metadata.';
COMMENT ON COLUMN public.users.utm_term IS 'First-touch utm_term from signup metadata.';

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
  v_signup_source text := nullif(trim(p_meta->>'signup_source'), '');
  v_utm_source text := nullif(trim(p_meta->>'utm_source'), '');
  v_utm_medium text := nullif(trim(p_meta->>'utm_medium'), '');
  v_utm_campaign text := nullif(trim(p_meta->>'utm_campaign'), '');
  v_utm_content text := nullif(trim(p_meta->>'utm_content'), '');
  v_utm_term text := nullif(trim(p_meta->>'utm_term'), '');
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

  -- Prefer explicit signup_source; else utm_source; else leave null (FE may set romrx.io).
  IF v_signup_source IS NULL AND v_utm_source IS NOT NULL THEN
    v_signup_source := v_utm_source;
  END IF;

  INSERT INTO public.athletes (user_id, email, full_name)
  VALUES (p_id, p_email, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.users (
    id, email, full_name, belt,
    active_sport, active_bb_tier,
    platforms, sports_enabled,
    portal_role, subscription_status, subscription_tier, base_status,
    signup_source, utm_source, utm_medium, utm_campaign, utm_content, utm_term
  )
  VALUES (
    p_id, p_email, v_full_name, v_belt,
    v_sport, v_bb_tier,
    ARRAY['general']::text[], ARRAY['general']::text[],
    'athlete', 'inactive', 'free', 'inactive',
    v_signup_source, v_utm_source, v_utm_medium, v_utm_campaign, v_utm_content, v_utm_term
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
        active_bb_tier = COALESCE(public.users.active_bb_tier, EXCLUDED.active_bb_tier),
        -- First-touch attribution: fill only when currently null.
        signup_source  = COALESCE(public.users.signup_source, EXCLUDED.signup_source),
        utm_source     = COALESCE(public.users.utm_source, EXCLUDED.utm_source),
        utm_medium     = COALESCE(public.users.utm_medium, EXCLUDED.utm_medium),
        utm_campaign   = COALESCE(public.users.utm_campaign, EXCLUDED.utm_campaign),
        utm_content    = COALESCE(public.users.utm_content, EXCLUDED.utm_content),
        utm_term       = COALESCE(public.users.utm_term, EXCLUDED.utm_term);
        -- sports_enabled / platforms / base_status / subscription_* intentionally
        -- NOT overwritten so returning paid users keep granted access.
END;
$function$;

-- Keep P1 revoke: anon/authenticated must not EXECUTE this SECURITY DEFINER RPC.
REVOKE ALL ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_public_user_profile(uuid, text, jsonb) TO postgres;

-- Backfill from auth metadata where public.users attribution is still null.
UPDATE public.users u
SET
  signup_source = COALESCE(
    u.signup_source,
    nullif(trim(a.raw_user_meta_data->>'signup_source'), ''),
    nullif(trim(a.raw_user_meta_data->>'utm_source'), '')
  ),
  utm_source = COALESCE(u.utm_source, nullif(trim(a.raw_user_meta_data->>'utm_source'), '')),
  utm_medium = COALESCE(u.utm_medium, nullif(trim(a.raw_user_meta_data->>'utm_medium'), '')),
  utm_campaign = COALESCE(u.utm_campaign, nullif(trim(a.raw_user_meta_data->>'utm_campaign'), '')),
  utm_content = COALESCE(u.utm_content, nullif(trim(a.raw_user_meta_data->>'utm_content'), '')),
  utm_term = COALESCE(u.utm_term, nullif(trim(a.raw_user_meta_data->>'utm_term'), ''))
FROM auth.users a
WHERE a.id = u.id
  AND (
    (u.signup_source IS NULL AND nullif(trim(a.raw_user_meta_data->>'signup_source'), '') IS NOT NULL)
    OR (u.signup_source IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_source'), '') IS NOT NULL)
    OR (u.utm_source IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_source'), '') IS NOT NULL)
    OR (u.utm_medium IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_medium'), '') IS NOT NULL)
    OR (u.utm_campaign IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_campaign'), '') IS NOT NULL)
    OR (u.utm_content IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_content'), '') IS NOT NULL)
    OR (u.utm_term IS NULL AND nullif(trim(a.raw_user_meta_data->>'utm_term'), '') IS NOT NULL)
  );
