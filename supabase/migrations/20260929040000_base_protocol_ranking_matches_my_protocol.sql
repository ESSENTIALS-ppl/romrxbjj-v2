-- Base protocol ranking = My Protocol page ranking (2026-09-29, Jim via Chief of Staff).
-- LIVE applied via Supabase MCP as base_protocol_ranking_matches_my_protocol.
--
-- Why: after Fix A (romrx-io-web PR #75) My Protocol ranks the top three joints as
--   1. the top problem areas (first three distinct joints in assessments.worst_joints), in that order,
--   2. then asymmetry (|L - R|, rounded to 0.1) high to low,
--   3. then severity (Base target from JOINT_SCORE_TARGETS minus the worse side) high to low,
--   4. then the page's fixed joint order (JS sort is stable).
-- public.persist_protocols_for_assessment still ranked by asymmetry, then severity against the old
-- normal_min table, so the saved protocol ROMBot reads (rombot_context.protocol) disagreed with the
-- page (fixture 03: saved shoulder_er / hip_er / shoulder_flex, page hip_abd / ankle_df / shoulder_er).
--
-- Scope: Base only (assessments.sport general/base). Sport pack assessments (bjj, bodybuilding)
-- keep the legacy ranking unchanged. Exercise picking (preferred names, richness) is unchanged.
-- rombot_context: for Base assessments only, em dashes / en dashes in the protocol exercise text
-- are rewritten as ", " so the Base protocol text ROMBot reads has no em dashes. Sport rows unchanged.

-- 1) Shared ranking: the exact joints and order the saved protocol uses.
CREATE OR REPLACE FUNCTION public.protocol_joint_ranking(p_assessment_id uuid)
 RETURNS TABLE(joint_key text, priority_rank integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH a AS (
    SELECT to_jsonb(x) AS j, x.worst_joints,
           lower(coalesce(x.sport, '')) IN ('general', 'base') AS is_base
    FROM public.assessments x WHERE x.id = p_assessment_id
  ),
  -- Same joints and order as MyProtocol.tsx JOINTS. normal_min = legacy (sport) ranking,
  -- target = JOINT_SCORE_TARGETS (Base, same targets as the bands).
  joint_defs(ord, key, left_key, right_key, single_key, normal_min, target) AS (VALUES
    (1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric, 45::numeric),
    (2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30, 45),
    (3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 90),
    (4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 100, 120),
    (5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 90),
    (6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 180),
    (7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10, 20),
    (8, 'lumbar_flex', NULL, NULL, 'lumbar_flex', 40, 60),
    (9, 'lumbar_ext', NULL, NULL, 'lumbar_ext', 20, 25),
    (10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 80)
  ),
  -- topProblemAreas(worst_joints): first three distinct joints (sides collapsed), in order.
  problem AS (
    SELECT t.base_key, (row_number() OVER (ORDER BY t.first_ord) - 1)::int AS idx
    FROM (
      SELECT regexp_replace(w, '_(l|r)$', '') AS base_key, min(o) AS first_ord
      FROM a, unnest(a.worst_joints) WITH ORDINALITY AS u(w, o)
      WHERE coalesce(w, '') <> ''
      GROUP BY 1
    ) t
  ),
  vals AS (
    SELECT d.*, (a.j ->> d.left_key)::numeric AS lv, (a.j ->> d.right_key)::numeric AS rv,
           (a.j ->> d.single_key)::numeric AS sv, a.is_base
    FROM joint_defs d CROSS JOIN a
  ),
  scored AS (
    SELECT v.ord, v.key, v.is_base,
      CASE WHEN v.lv IS NOT NULL AND v.rv IS NOT NULL THEN abs(v.lv - v.rv) ELSE 0 END AS asym_legacy,
      CASE WHEN v.lv IS NOT NULL AND v.rv IS NOT NULL THEN greatest(0, v.normal_min - least(v.lv, v.rv))
           WHEN v.sv IS NOT NULL THEN greatest(0, v.normal_min - v.sv) ELSE 0 END AS sev_legacy,
      CASE WHEN v.lv IS NOT NULL AND v.rv IS NOT NULL THEN round(abs(v.lv - v.rv) * 10) / 10 ELSE 0 END AS asym_base,
      CASE WHEN v.lv IS NOT NULL AND v.rv IS NOT NULL THEN greatest(0, v.target - least(v.lv, v.rv))
           WHEN v.sv IS NOT NULL THEN greatest(0, v.target - v.sv) ELSE 0 END AS sev_base,
      CASE WHEN p.idx < 3 THEN p.idx END AS problem_idx
    FROM vals v LEFT JOIN problem p ON p.base_key = v.key
    WHERE v.lv IS NOT NULL OR v.rv IS NOT NULL OR v.sv IS NOT NULL
  ),
  ranked AS (
    SELECT s.key,
      row_number() OVER (ORDER BY
        CASE WHEN s.is_base THEN coalesce(s.problem_idx, 1000000) ELSE 0 END,
        CASE WHEN s.is_base THEN s.asym_base ELSE s.asym_legacy END DESC,
        CASE WHEN s.is_base THEN s.sev_base ELSE s.sev_legacy END DESC,
        CASE WHEN s.is_base THEN s.ord ELSE 0 END
      )::int AS rnk
    FROM scored s
  )
  SELECT r.key, r.rnk FROM ranked r WHERE r.rnk <= 3 ORDER BY r.rnk;
$function$;

REVOKE ALL ON FUNCTION public.protocol_joint_ranking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protocol_joint_ranking(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_joint_ranking(uuid) TO service_role;

-- 2) persist_protocols_for_assessment: identical exercise pick, ranking from protocol_joint_ranking().
CREATE OR REPLACE FUNCTION public.persist_protocols_for_assessment(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a public.assessments%ROWTYPE;
  v_written int := 0;
  v_joints text[];
  v_ranked text[];
BEGIN
  SELECT * INTO a FROM public.assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assessment_not_found');
  END IF;

  DELETE FROM public.protocols WHERE assessment_id = p_assessment_id;

  INSERT INTO public.protocols (assessment_id, user_id, exercise_id, joint_key, priority_rank)
  SELECT p_assessment_id, a.user_id, x.exercise_id, x.joint_key, x.priority_rank
  FROM (
    WITH ranked AS (
      SELECT r.joint_key AS key, r.priority_rank AS rank
      FROM public.protocol_joint_ranking(p_assessment_id) r
    ),
    aliases AS (
      SELECT r.key, r.rank, unnest(CASE r.key
        WHEN 'hip_abd' THEN ARRAY['hip_abd','hip_abduction']
        WHEN 'hip_flex' THEN ARRAY['hip_flex','hip_flexion']
        WHEN 'shoulder_flex' THEN ARRAY['shoulder_flex','shoulder_flexion']
        WHEN 'lumbar_flex' THEN ARRAY['lumbar_flex','lumbar_flexion']
        WHEN 'lumbar_ext' THEN ARRAY['lumbar_ext','lumbar_extension']
        WHEN 'cervical_rot' THEN ARRAY['cervical_rot','cervical_rotation']
        ELSE ARRAY[r.key] END) AS joint_key_alias
      FROM ranked r
    ),
    preferred AS (
      SELECT * FROM (VALUES
        ('ankle_df','resistance','Knee-to-Wall Mobilization'),
        ('ankle_df','stretch','Standing Gastrocnemius Stretch (Straight Knee)'),
        ('ankle_df','foam_roll','Calf Foam Roll'),
        ('hip_er','resistance','Clamshell with Band'),
        ('hip_er','stretch','Supine Figure-4 Stretch (Piriformis)'),
        ('hip_er','foam_roll','Piriformis/Glute Foam Roll'),
        ('hip_ir','resistance','Seated Banded Hip Internal Rotation'),
        ('hip_ir','stretch','90/90 Internal Rotation Stretch'),
        ('hip_ir','foam_roll','TFL/Lateral Hip Foam Roll'),
        ('hip_abd','resistance','Side-Lying Hip Abduction with Band'),
        ('hip_abd','stretch','Frog Stretch'),
        ('hip_abd','foam_roll','Adductor/Inner Thigh Foam Roll')
      ) AS t(joint_key, exercise_type, name)
    ),
    candidates AS (
      SELECT DISTINCT ON (al.key, e.exercise_type, lower(trim(e.name)))
        al.key AS joint_key,
        al.rank::smallint AS priority_rank,
        e.id AS exercise_id,
        e.exercise_type,
        e.name,
        (CASE WHEN e.sets IS NOT NULL THEN 2 ELSE 0 END)
          + coalesce(length(e.reps),0)
          + coalesce(length(e.coaching_cue),0) AS richness
      FROM aliases al
      JOIN public.exercises e ON e.joint_key = al.joint_key_alias
      WHERE e.sports @> ARRAY['general']::text[]
        AND e.exercise_type IN ('resistance','stretch','foam_roll')
      ORDER BY al.key, e.exercise_type, lower(trim(e.name)),
        (CASE WHEN e.sets IS NOT NULL THEN 2 ELSE 0 END)
          + coalesce(length(e.reps),0)
          + coalesce(length(e.coaching_cue),0) DESC
    )
    SELECT DISTINCT ON (c.joint_key, c.exercise_type)
      c.joint_key, c.priority_rank, c.exercise_id
    FROM candidates c
    LEFT JOIN preferred p
      ON p.joint_key = c.joint_key AND p.exercise_type = c.exercise_type
    ORDER BY c.joint_key, c.exercise_type,
      CASE WHEN p.name IS NOT NULL AND c.name = p.name THEN 0 ELSE 1 END,
      c.richness DESC,
      c.name
  ) x;

  GET DIAGNOSTICS v_written = ROW_COUNT;
  SELECT coalesce(array_agg(DISTINCT joint_key ORDER BY joint_key), ARRAY[]::text[])
    INTO v_joints FROM public.protocols WHERE assessment_id = p_assessment_id;
  SELECT coalesce(array_agg(r.joint_key ORDER BY r.priority_rank), ARRAY[]::text[])
    INTO v_ranked FROM public.protocol_joint_ranking(p_assessment_id) r;

  RETURN jsonb_build_object('ok', true, 'written', v_written, 'joints', to_jsonb(v_joints), 'ranked', to_jsonb(v_ranked));
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_protocols_for_assessment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_protocols_for_assessment(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_protocols_for_assessment(uuid) TO service_role;

-- 3) rombot_context: Base protocol text without em dashes. Same columns as before; only the
--    protocol exercise text expression changes, and only for Base assessments.
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
          WHERE (js.assessment_id = a.id)) AS joint_scores,
    ( SELECT jsonb_build_object('green', count(*) FILTER (WHERE ((te.tier = 'GREEN'::text) AND (te.flag IS NULL))), 'yellow', count(*) FILTER (WHERE ((te.tier = 'YELLOW'::text) AND (te.flag IS NULL))), 'red', count(*) FILTER (WHERE ((te.tier = 'RED'::text) OR (te.flag = 'DELAY_TECHNIQUE'::text)))) AS jsonb_build_object
           FROM technique_eligibility te
          WHERE ((te.user_id = u.id) AND (te.assessment_id = a.id))) AS technique_summary,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'belt', t.belt, 'category', t.category, 'limiting_joints', te.limiting_joints)) AS jsonb_agg
           FROM (technique_eligibility te
             JOIN techniques t ON ((t.id = te.technique_id)))
          WHERE ((te.user_id = u.id) AND (te.assessment_id = a.id) AND ((te.tier = 'RED'::text) OR (te.flag = 'DELAY_TECHNIQUE'::text)))
         LIMIT 10) AS red_techniques,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'category', t.category, 'belt', t.belt) ORDER BY t.category, t.name) AS jsonb_agg
           FROM (technique_eligibility te
             JOIN techniques t ON ((t.id = te.technique_id)))
          WHERE ((te.user_id = u.id) AND (te.assessment_id = a.id) AND (te.tier = 'GREEN'::text) AND (te.flag IS NULL))) AS green_techniques,
    ( SELECT jsonb_agg(jsonb_build_object('name', t.name, 'category', t.category, 'belt', t.belt, 'limiting_joints', te.limiting_joints) ORDER BY t.category, t.name) AS jsonb_agg
           FROM (technique_eligibility te
             JOIN techniques t ON ((t.id = te.technique_id)))
          WHERE ((te.user_id = u.id) AND (te.assessment_id = a.id) AND (te.tier = 'YELLOW'::text) AND (te.flag IS NULL))) AS yellow_techniques,
    ( SELECT jsonb_agg(jsonb_build_object(
               'joint', p.joint_key,
               'rank', p.priority_rank,
               'exercise', CASE WHEN a.is_base THEN regexp_replace(e.name, '\s*[\u2014\u2013]\s*', ', ', 'g') ELSE e.name END,
               'type', e.exercise_type,
               'sets', e.sets,
               'reps', CASE WHEN a.is_base THEN regexp_replace(e.reps, '\s*[\u2014\u2013]\s*', ', ', 'g') ELSE e.reps END,
               'cue', CASE WHEN a.is_base THEN regexp_replace(e.coaching_cue, '\s*[\u2014\u2013]\s*', ', ', 'g') ELSE e.coaching_cue END
             ) ORDER BY p.priority_rank) AS jsonb_agg
           FROM (protocols p
             JOIN exercises e ON ((e.id = p.exercise_id)))
          WHERE ((p.user_id = u.id) AND (p.assessment_id = a.id))) AS protocol,
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
                  WHERE (gp2.user_id = u.id)
                  ORDER BY gp2.created_at DESC
                 LIMIT 5) gp) AS saved_game_plans
   FROM (users u
     LEFT JOIN LATERAL ( SELECT assessments.id,
            assessments.user_id,
            assessments.assessed_at,
            assessments.rom_total,
            assessments.rom_percentile,
            assessments.worst_joints,
            assessments.red_flag_triggered,
            assessments.red_flag_reasons,
            (lower(COALESCE(assessments.sport, ''::text)) = ANY (ARRAY['general'::text, 'base'::text])) AS is_base
           FROM assessments
          WHERE (assessments.user_id = u.id)
          ORDER BY assessments.assessed_at DESC
         LIMIT 1) a ON (true));
