-- Sprint 3-lite (2026-09-06): close set_my_bb_tier payment bypass + leads anon PII SELECT
-- LIVE applied on romrxbjj-v2 as sprint3_fix_bb_tier_bypass_and_leads_rls

-- 1) set_my_bb_tier: may set tier only; MUST NOT grant bodybuilding access.
CREATE OR REPLACE FUNCTION public.set_my_bb_tier(p_tier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_has_bb boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF p_tier NOT IN ('beginner','intermediate','advanced') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid tier');
  END IF;

  SELECT
    COALESCE(u.sports_enabled, ARRAY[]::text[]) @> ARRAY['bodybuilding']::text[]
    OR EXISTS (
      SELECT 1 FROM public.sport_entitlements se
      WHERE se.user_id = v_uid
        AND se.sport = 'bodybuilding'
        AND se.status IN ('active', 'trialing')
    )
  INTO v_has_bb
  FROM public.users u
  WHERE u.id = v_uid;

  IF NOT EXISTS(v_has_bb) OR v_has_bb IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bodybuilding_entitlement_required');
  END IF;

  UPDATE public.users
  SET active_bb_tier = p_tier,
      updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'tier', p_tier);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_my_bb_tier(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_bb_tier(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_bb_tier(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_bb_tier(text) TO service_role;

-- 2) leads: drop broad SELECT of all unclaimed rows (PII).
-- Lead lookup by unlock_token stays on edge functions with service_role.
DROP POLICY IF EXISTS leads_select_unclaimed ON public.leads;
