-- NOT APPLIED. Needs Jim's go ("run eligibility colour"). Prepared Oct 20 2026.
-- Jim ledger (closed Oct 3 2026): L128 move color = WORST measured required joint; missing joint or no rule = grey "Not rated",
--   NEVER GREEN. L129 YELLOW = flat 10 degrees (ankle 2 cm), NOT the 90% ratio. L135 recompute_user_eligibility uses the one
--   shared color rule. Mirror of compute-tiers v41 move_colour.ts.
-- 1. technique_eligibility.tier may now be 'GREY'.
-- 2. public.recompute_user_eligibility(): ONLY the per_tech / classified colour logic changes. Body = live definition read
--    2026-10-20 (pg_get_functiondef md5 71283967d1891f2e704bdb41829a55ce).
-- NOT changed: compute_joint_scores() (Base bands), techniques.*_min, any other function.
-- Order: apply this, then deploy compute-tiers v41. Stored rows change only when recompute runs or a new assessment is saved.
-- Rollback: 20261020180000_eligibility_colour_flat10_grey.rollback.sql.txt
ALTER TABLE public.technique_eligibility DROP CONSTRAINT IF EXISTS technique_eligibility_tier_check;
ALTER TABLE public.technique_eligibility
  ADD CONSTRAINT technique_eligibility_tier_check CHECK (tier = ANY (ARRAY['GREEN'::text, 'YELLOW'::text, 'RED'::text, 'GREY'::text]));

CREATE OR REPLACE FUNCTION public.recompute_user_eligibility(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assessment   assessments%ROWTYPE;
  v_sports       text[];
  v_sport        text;
  v_now          timestamptz := now();
  v_result       jsonb := '{}'::jsonb;
  v_written      int;
BEGIN
  SELECT array_remove(COALESCE(sports_enabled, ARRAY['general']::text[]), 'general')
    INTO v_sports
    FROM users WHERE id = p_user_id;

  IF v_sports IS NULL OR array_length(v_sports, 1) IS NULL THEN
    RETURN jsonb_build_object('user_id', p_user_id, 'status', 'no_owned_sports');
  END IF;

  SELECT * INTO v_assessment
    FROM assessments
   WHERE user_id = p_user_id
   ORDER BY assessed_at DESC NULLS LAST, created_at DESC NULLS LAST
   LIMIT 1;

  IF v_assessment.id IS NULL THEN
    RETURN jsonb_build_object('user_id', p_user_id, 'status', 'no_assessment');
  END IF;

  BEGIN
    PERFORM public.compute_joint_scores(v_assessment.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  FOREACH v_sport IN ARRAY v_sports LOOP
    IF v_sport NOT IN ('bjj', 'bodybuilding') THEN
      v_result := v_result || jsonb_build_object(v_sport, 'skipped_no_catalog');
      CONTINUE;
    END IF;

    WITH
    av AS (
      SELECT
        LEAST(v_assessment.hip_er_l,        v_assessment.hip_er_r)        AS hip_er,
        LEAST(v_assessment.hip_ir_l,        v_assessment.hip_ir_r)        AS hip_ir,
        LEAST(v_assessment.hip_abd_l,       v_assessment.hip_abd_r)       AS hip_abd,
        LEAST(v_assessment.hip_flex_l,      v_assessment.hip_flex_r)      AS hip_flex,
        LEAST(v_assessment.shoulder_er_l,   v_assessment.shoulder_er_r)   AS shoulder_er,
        LEAST(v_assessment.shoulder_flex_l, v_assessment.shoulder_flex_r) AS shoulder_flex,
        LEAST(v_assessment.ankle_df_l,      v_assessment.ankle_df_r)      AS ankle_df,
        LEAST(v_assessment.cervical_rot_l,  v_assessment.cervical_rot_r)  AS cervical_rot,
        LEAST(v_assessment.cervical_lat_l,  v_assessment.cervical_lat_r)  AS cervical_lat,
        v_assessment.lumbar_flex   AS lumbar_flex,
        v_assessment.lumbar_ext    AS lumbar_ext,
        v_assessment.cervical_flex AS cervical_flex,
        v_assessment.cervical_ext  AS cervical_ext
    ),
    reqs AS (
      SELECT t.id AS technique_id, t.code AS technique_code,
             j.joint, j.thresh, j.aval
      FROM techniques t
      CROSS JOIN LATERAL (
        VALUES
          ('hip_er',        t.hip_er_min,        (SELECT hip_er FROM av)),
          ('hip_ir',        t.hip_ir_min,        (SELECT hip_ir FROM av)),
          ('hip_abd',       t.hip_abd_min,       (SELECT hip_abd FROM av)),
          ('hip_flex',      t.hip_flex_min,      (SELECT hip_flex FROM av)),
          ('shoulder_er',   t.shoulder_er_min,   (SELECT shoulder_er FROM av)),
          ('shoulder_flex', t.shoulder_flex_min, (SELECT shoulder_flex FROM av)),
          ('ankle_df',      t.ankle_df_min,      (SELECT ankle_df FROM av)),
          ('cervical_rot',  t.cervical_rot_min,  (SELECT cervical_rot FROM av)),
          ('cervical_lat',  t.cervical_lat_min,  (SELECT cervical_lat FROM av)),
          ('lumbar_flex',   t.lumbar_flex_min,   (SELECT lumbar_flex FROM av)),
          ('lumbar_ext',    t.lumbar_ext_min,    (SELECT lumbar_ext FROM av)),
          ('cervical_flex', t.cervical_flex_min, (SELECT cervical_flex FROM av)),
          ('cervical_ext',  t.cervical_ext_min,  (SELECT cervical_ext FROM av))
      ) AS j(joint, thresh, aval)
      WHERE t.sport = v_sport
        AND j.thresh IS NOT NULL AND j.thresh <> 0
    ),
    -- Jim L129: per joint, GREEN at or above the minimum, YELLOW within a flat 10 deg below (ankle_df: 2 cm), else RED.
    judged AS (
      SELECT r.*, CASE WHEN r.aval IS NULL THEN NULL
                       WHEN r.aval >= r.thresh THEN 3
                       WHEN r.thresh - r.aval <= (CASE WHEN r.joint = 'ankle_df' THEN 2 ELSE 10 END) THEN 2
                       ELSE 1 END AS colour
      FROM reqs r
    ),
    per_tech AS (
      SELECT
        t.id AS technique_id, t.code AS technique_code,
        MIN(j.colour) AS worst_colour,
        BOOL_OR(j.joint IS NOT NULL AND j.aval IS NULL) AS any_missing,
        COUNT(j.joint) AS req_count,
        ARRAY_REMOVE(ARRAY_AGG(
          CASE WHEN j.colour = 1 THEN j.joint || ':' || fmt_num(j.aval) || ' vs min ' || fmt_num(j.thresh) END
        ), NULL) AS below_band,
        ARRAY_REMOVE(ARRAY_AGG(
          CASE WHEN j.colour IN (1, 2) THEN j.joint || ':' || fmt_num(j.aval) || ' vs min ' || fmt_num(j.thresh) END
        ), NULL) AS short_any,
        ARRAY_REMOVE(ARRAY_AGG(
          CASE WHEN j.joint IS NOT NULL AND j.aval IS NULL
               THEN j.joint || ':not_measured(min ' || fmt_num(j.thresh) || ')' END
        ), NULL) AS missing
      FROM techniques t
      LEFT JOIN judged j ON j.technique_id = t.id
      WHERE t.sport = v_sport
      GROUP BY t.id, t.code
    ),
    -- Jim L128/L135: move colour = WORST measured required joint; no rule or a missing joint = GREY "Not rated", never GREEN.
    classified AS (
      SELECT
        technique_id, technique_code,
        CASE
          WHEN req_count = 0 THEN 'GREY'
          WHEN any_missing THEN 'GREY'
          WHEN worst_colour = 1 THEN 'RED'
          WHEN worst_colour = 2 THEN 'YELLOW'
          ELSE 'GREEN'
        END AS tier,
        CASE
          WHEN req_count = 0 THEN ARRAY[]::text[]
          WHEN any_missing THEN COALESCE(missing, ARRAY[]::text[])
          WHEN worst_colour = 1 THEN COALESCE(below_band, ARRAY[]::text[])
          WHEN worst_colour = 2 THEN COALESCE(short_any, ARRAY[]::text[])
          ELSE ARRAY[]::text[]
        END AS limiting_joints
      FROM per_tech
    )
    INSERT INTO technique_eligibility
      (user_id, athlete_id, assessment_id, technique_id, technique_code, sport, tier, limiting_joints, computed_at)
    SELECT
      p_user_id, v_assessment.athlete_id, v_assessment.id, c.technique_id, c.technique_code,
      v_sport, c.tier, c.limiting_joints, v_now
    FROM classified c
    ON CONFLICT (user_id, assessment_id, technique_id)
    DO UPDATE SET
      tier = EXCLUDED.tier,
      limiting_joints = EXCLUDED.limiting_joints,
      technique_code = EXCLUDED.technique_code,
      sport = EXCLUDED.sport,
      athlete_id = EXCLUDED.athlete_id,
      computed_at = EXCLUDED.computed_at;

    GET DIAGNOSTICS v_written = ROW_COUNT;
    v_result := v_result || jsonb_build_object(v_sport, v_written);
  END LOOP;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'assessment_id', v_assessment.id,
    'status', 'ok',
    'written', v_result
  );
END;
$function$;
