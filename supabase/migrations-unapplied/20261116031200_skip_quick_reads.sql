-- P1-06 server-side quick-row skip (Grant 9:44 PM ET, item 2). UNAPPLIED. Needs 20261116031000 (assessments.check_kind).
-- Every latest-assessment read skips check_kind = 'quick' with IS DISTINCT FROM (NULL counts as full). Bodies are the live
-- definitions read Nov 15, 2026 (read only) with only the filter line added. Signatures, return types, SECURITY, search_path,
-- grants and the view's columns and security_invoker=true are unchanged (CREATE OR REPLACE keeps grants).
-- get_my_profile returns each assessment through to_jsonb(a), so 'check_kind' is in 'assessment' and every 'assessments'
-- item once the column exists (Jules's client filter on feat/p1-06b-skip-quick-reads-20261115 reads it).
-- Rollback: 20261116031200_skip_quick_reads_rollback.sql (the live definitions).

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_profile JSONB;
  v_assessment JSONB;
  v_assessments JSONB;
  v_eligibility JSONB;
  v_sport_entitlements JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT to_jsonb(u) INTO v_profile FROM public.users u WHERE u.id = v_uid;

  SELECT to_jsonb(a) INTO v_assessment
    FROM public.assessments a
    WHERE a.user_id = v_uid
      AND a.check_kind IS DISTINCT FROM 'quick'
    ORDER BY a.assessed_at DESC
    LIMIT 1;

  SELECT jsonb_agg(to_jsonb(a) ORDER BY a.assessed_at DESC) INTO v_assessments
    FROM (
      SELECT * FROM public.assessments a
      WHERE a.user_id = v_uid
        AND a.check_kind IS DISTINCT FROM 'quick'
      ORDER BY a.assessed_at DESC
      LIMIT 4
    ) a;

  -- BJJ "My Game" only. The techniques + technique_eligibility tables are shared
  -- across sports (Base ROM architecture); +Bodybuilding rows must not leak into
  -- the BJJ view. +Bodybuilding uses its own app and never calls this function.
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', te.id, 'technique_id', te.technique_id, 'technique_code', te.technique_code,
      'tier', te.tier, 'flag', te.flag, 'limiting_joints', te.limiting_joints,
      'techniques', jsonb_build_object('code', t.code, 'name', t.name, 'belt', t.belt, 'category', t.category)
    ) ORDER BY te.tier
  ) INTO v_eligibility
    FROM public.technique_eligibility te
    LEFT JOIN public.techniques t ON t.id = te.technique_id
    WHERE te.user_id = v_uid
      AND te.sport = 'bjj';

  SELECT jsonb_agg(
    jsonb_build_object(
      'sport', se.sport,
      'status', se.status,
      'stripe_subscription_id', se.stripe_subscription_id,
      'granted_at', se.granted_at,
      'expires_at', se.expires_at
    ) ORDER BY se.granted_at DESC
  ) INTO v_sport_entitlements
    FROM public.sport_entitlements se
    WHERE se.user_id = v_uid;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'assessment', v_assessment,
    'assessments', COALESCE(v_assessments, '[]'::jsonb),
    'eligibility', COALESCE(v_eligibility, '[]'::jsonb),
    'sport_entitlements', COALESCE(v_sport_entitlements, '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.my_joint_history(p_limit integer DEFAULT 20)
 RETURNS TABLE(assessment_id uuid, assessed_at timestamp with time zone, rom_total numeric, joint_key text, score smallint, left_value numeric, right_value numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH mine AS (
    SELECT a.id, COALESCE(a.assessed_at, a.created_at) AS at, a.rom_total
    FROM public.assessments a
    WHERE a.user_id = auth.uid()
      AND a.check_kind IS DISTINCT FROM 'quick'
    ORDER BY COALESCE(a.assessed_at, a.created_at) DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
  )
  SELECT m.id, m.at, m.rom_total, j.joint_key, j.score, j.left_value, j.right_value
  FROM mine m JOIN public.joint_scores j ON j.assessment_id = m.id
  ORDER BY m.at ASC, j.joint_key ASC;
$function$;

CREATE OR REPLACE FUNCTION public.my_joint_start_vs_now()
 RETURNS TABLE(joint_key text, first_assessed_at timestamp with time zone, latest_assessed_at timestamp with time zone, first_score smallint, latest_score smallint, first_left numeric, first_right numeric, latest_left numeric, latest_right numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH rows AS (
    SELECT j.joint_key, COALESCE(a.assessed_at, a.created_at) AS at, j.score, j.left_value, j.right_value,
           row_number() OVER (PARTITION BY j.joint_key ORDER BY COALESCE(a.assessed_at, a.created_at) ASC)  AS rn_first,
           row_number() OVER (PARTITION BY j.joint_key ORDER BY COALESCE(a.assessed_at, a.created_at) DESC) AS rn_last
    FROM public.assessments a JOIN public.joint_scores j ON j.assessment_id = a.id
    WHERE a.user_id = auth.uid()
      AND a.check_kind IS DISTINCT FROM 'quick'
  )
  SELECT f.joint_key, f.at, l.at, f.score, l.score, f.left_value, f.right_value, l.left_value, l.right_value
  FROM rows f JOIN rows l ON l.joint_key = f.joint_key AND l.rn_last = 1
  WHERE f.rn_first = 1 AND f.at < l.at
  ORDER BY f.joint_key;
$function$;

CREATE OR REPLACE VIEW public.rombot_context WITH (security_invoker = true) AS
 SELECT u.id AS user_id,
    u.full_name,
    u.belt,
    u.platforms,
    u.portal_role,
    u.subscription_status,
    a.id AS latest_assessment_id,
    a.assessed_at,
    a.rom_total,
    a.rom_percentile,
    a.worst_joints,
    a.red_flag_triggered,
    a.red_flag_reasons,
    ( SELECT jsonb_agg(jsonb_build_object('joint', js.joint_key, 'score', js.score, 'left', js.left_value, 'right', js.right_value, 'asymmetry_pct', js.asymmetry_pct, 'flag', js.asymmetry_flag) ORDER BY js.joint_key) AS jsonb_agg
           FROM joint_scores js
          WHERE js.assessment_id = a.id) AS joint_scores,
    ( SELECT jsonb_build_object('green', count(*) FILTER (WHERE te.tier = 'GREEN'::text AND te.flag IS NULL), 'yellow', count(*) FILTER (WHERE te.tier = 'YELLOW'::text AND te.flag IS NULL), 'red', count(*) FILTER (WHERE te.tier = 'RED'::text OR te.flag = 'DELAY_TECHNIQUE'::text)) AS jsonb_build_object
           FROM technique_eligibility te
          WHERE te.user_id = u.id AND te.assessment_id = a.id) AS technique_summary,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'belt', t.belt, 'category', t.category, 'limiting_joints', te.limiting_joints)) AS jsonb_agg
           FROM technique_eligibility te
             JOIN techniques t ON t.id = te.technique_id
          WHERE te.user_id = u.id AND te.assessment_id = a.id AND (te.tier = 'RED'::text OR te.flag = 'DELAY_TECHNIQUE'::text)
         LIMIT 10) AS red_techniques,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'category', t.category, 'belt', t.belt) ORDER BY t.category, t.name) AS jsonb_agg
           FROM technique_eligibility te
             JOIN techniques t ON t.id = te.technique_id
          WHERE te.user_id = u.id AND te.assessment_id = a.id AND te.tier = 'GREEN'::text AND te.flag IS NULL) AS green_techniques,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'category', t.category, 'belt', t.belt, 'limiting_joints', te.limiting_joints) ORDER BY t.category, t.name) AS jsonb_agg
           FROM technique_eligibility te
             JOIN techniques t ON t.id = te.technique_id
          WHERE te.user_id = u.id AND te.assessment_id = a.id AND te.tier = 'YELLOW'::text AND te.flag IS NULL) AS yellow_techniques,
    ( SELECT jsonb_agg(jsonb_build_object('joint', p.joint_key, 'rank', p.priority_rank, 'exercise',
                CASE
                    WHEN a.is_base THEN regexp_replace(e.name, '\s*[\u2014\u2013]\s*'::text, ', '::text, 'g'::text)
                    ELSE e.name
                END, 'type', e.exercise_type, 'sets', e.sets, 'reps',
                CASE
                    WHEN a.is_base THEN regexp_replace(e.reps, '\s*[\u2014\u2013]\s*'::text, ', '::text, 'g'::text)
                    ELSE e.reps
                END, 'cue',
                CASE
                    WHEN a.is_base THEN regexp_replace(e.coaching_cue, '\s*[\u2014\u2013]\s*'::text, ', '::text, 'g'::text)
                    ELSE e.coaching_cue
                END) ORDER BY p.priority_rank) AS jsonb_agg
           FROM protocols p
             JOIN exercises e ON e.id = p.exercise_id
          WHERE p.user_id = u.id AND p.assessment_id = a.id) AS protocol,
    ( SELECT jsonb_agg(jsonb_build_object('name', gp.name, 'path_mode', gp.path_mode, 'techniques', gp.techniques, 'created_at', gp.created_at) ORDER BY gp.created_at DESC) AS jsonb_agg
           FROM ( SELECT gp2.id,
                    gp2.user_id,
                    gp2.name,
                    gp2.description,
                    gp2.path_mode,
                    gp2.techniques,
                    gp2.created_at,
                    gp2.updated_at
                   FROM game_plans gp2
                  WHERE gp2.user_id = u.id
                  ORDER BY gp2.created_at DESC
                 LIMIT 5) gp) AS saved_game_plans
   FROM users u
     LEFT JOIN LATERAL ( SELECT assessments.id,
            assessments.user_id,
            assessments.assessed_at,
            assessments.rom_total,
            assessments.rom_percentile,
            assessments.worst_joints,
            assessments.red_flag_triggered,
            assessments.red_flag_reasons,
            lower(COALESCE(assessments.sport, ''::text)) = ANY (ARRAY['general'::text, 'base'::text]) AS is_base
           FROM assessments
          WHERE assessments.user_id = u.id AND assessments.check_kind IS DISTINCT FROM 'quick'
          ORDER BY assessments.assessed_at DESC
         LIMIT 1) a ON true;
