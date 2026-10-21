-- NOT APPLIED. Needs Jim's own typed line before anyone applies it to prod.
-- T1 (Jim, Oct 21 2026 10:53 AM ET, "T1: A plus C"; spec Quinn narrow-bands-options.md, options A and C).
-- A: narrow joints get a buffer E below each cutoff and a reading inside the buffer gets the better color:
--    Steady if worse + E >= target, Building if worse + E >= 0.90 x target, else Needs focus. Stored values never change.
--    E: cervical_rot / cervical_lat / cervical_flex / cervical_ext 5 deg, hip_er / hip_ir / hip_abd 5 deg, shoulder_er 5 deg,
--    ankle_df 1 cm. Every other joint keeps the old CASE exactly (E = 0).
-- C: public.t1_weighted_gap(): Protocol gap (0 when Steady, else 1 - min(1, worse/target)) x 0.5 on narrow joints unless the
--    previous assessment shows the same band, then x 1. compute-tiers v41 orders worst_joints with the same rule, and
--    protocol_joint_ranking() already ranks Base by worst_joints first, so it is NOT redefined here (its live body, md5
--    eb0f00cad6ea6d1cc170b8ce289e0437, carries the Oct 19 neck rows that are not on main; restating it would risk dropping them).
-- No retest step, note or hint anywhere (Jim card 15, ledger L655). No user-visible copy.
-- 1. public.compute_joint_scores(): body = live definition read 2026-10-21 10:58 AM ET (md5 49f15fc3737b31ddf003342d21d313f1,
--    identical to 20261006203000), ONLY the score CASE line changes to call public.t1_joint_band().
-- Mirrors: romrx-io-web mobilityBands.ts NARROW_BAND_BUFFER / bandScoreForJoint / weightedJointGap,
--   compute-tiers joint_totals.ts bandForJoint / weightedGap, submit-lead-assessment email.ts bandFromRatio.
-- Existing joint_scores rows are NOT rewritten here. A recompute would be a separate, deliberate step.
-- Rollback: 20261021150000_t1_narrow_bands.rollback.sql.txt (restores the exact live body, drops the helpers).

CREATE OR REPLACE FUNCTION public.t1_narrow_buffer(p_joint_key text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE regexp_replace(coalesce(p_joint_key, ''), '_(l|r)$', '')
    WHEN 'cervical_rot' THEN 5 WHEN 'cervical_lat' THEN 5 WHEN 'cervical_flex' THEN 5 WHEN 'cervical_ext' THEN 5
    WHEN 'hip_er' THEN 5 WHEN 'hip_ir' THEN 5 WHEN 'hip_abd' THEN 5
    WHEN 'shoulder_er' THEN 5
    WHEN 'ankle_df' THEN 1
    ELSE 0 END::numeric;
$function$;

CREATE OR REPLACE FUNCTION public.t1_joint_band(p_joint_key text, p_worse numeric, p_target numeric)
 RETURNS smallint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT (CASE
    WHEN p_worse IS NULL OR p_target IS NULL OR p_target <= 0 THEN 1
    WHEN public.t1_narrow_buffer(p_joint_key) = 0 THEN
      CASE WHEN p_worse/p_target >= 1.0 THEN 3 WHEN p_worse/p_target >= 0.90 THEN 2 ELSE 1 END
    WHEN p_worse + public.t1_narrow_buffer(p_joint_key) >= p_target THEN 3
    WHEN p_worse + public.t1_narrow_buffer(p_joint_key) >= 0.90 * p_target THEN 2
    ELSE 1 END)::smallint;
$function$;

CREATE OR REPLACE FUNCTION public.t1_weighted_gap(p_joint_key text, p_worse numeric, p_target numeric, p_prev_worse numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_worse IS NULL OR p_target IS NULL OR p_target <= 0 THEN NULL
    WHEN public.t1_joint_band(p_joint_key, p_worse, p_target) = 3 THEN 0
    ELSE (1 - least(1, greatest(0, p_worse / p_target)))
      * CASE WHEN public.t1_narrow_buffer(p_joint_key) = 0 THEN 1
             WHEN p_prev_worse IS NOT NULL
              AND public.t1_joint_band(p_joint_key, p_prev_worse, p_target) = public.t1_joint_band(p_joint_key, p_worse, p_target) THEN 1
             ELSE 0.5 END
  END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_joint_scores(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Jim closed the hip flexion rule: the straight-leg raise is never judged against 120 (unreachable, the average man is about 68).
  -- true = hip flexion is stored on the assessment but gets NO joint_scores row (no band, not in the /100, never a weak spot).
  -- Set to false to restore the old behavior. Retired when the sex-specific norm engine (romrxbjj-v2 #74) ships.
  c_hip_flex_unscored constant boolean := true;
  v_written int := 0;
  v_a jsonb;
BEGIN
  SELECT to_jsonb(a) INTO v_a FROM public.assessments a WHERE a.id = p_assessment_id;
  IF v_a IS NULL THEN
    RETURN jsonb_build_object('status','assessment_not_found','assessment_id',p_assessment_id);
  END IF;

  WITH bilateral(joint_key, lcol, rcol, target) AS (
    VALUES
      ('hip_er','hip_er_l','hip_er_r',29::numeric),  -- Oct 6 2026: was 45 (Simoneau 1998)
      ('hip_ir','hip_ir_l','hip_ir_r',26),  -- Oct 6 2026: was 45 (Simoneau 1998)
      ('hip_abd','hip_abd_l','hip_abd_r',40),  -- Oct 6 2026: was 90
      ('hip_flex','hip_flex_l','hip_flex_r',120),
      ('shoulder_er','shoulder_er_l','shoulder_er_r',85),  -- Oct 6 2026 8:19 PM: standing goal-post test (was 40 tucked elbow; 90 before)
      ('shoulder_flex','shoulder_flex_l','shoulder_flex_r',140),  -- Oct 6 2026: was 180 (Gill 2020)
      ('ankle_df','ankle_df_l','ankle_df_r',6),  -- Oct 6 2026: was 20 cm (Konor 2012 / McBride 2026)
      ('cervical_rot','cervical_rot_l','cervical_rot_r',70),  -- Oct 6 2026: was 80 (Swinkels 2014)
      ('cervical_lat','cervical_lat_l','cervical_lat_r',38)  -- Oct 6 2026: was 45 (Swinkels 2014)
  ),
  single(joint_key, col, target) AS (
    VALUES
      ('lumbar_flex','lumbar_flex',60::numeric),
      ('lumbar_ext','lumbar_ext',25),
      ('cervical_flex','cervical_flex',50),
      ('cervical_ext','cervical_ext',60)
  ),
  bi AS (
    SELECT b.joint_key, (v_a ->> b.lcol)::numeric AS left_value, (v_a ->> b.rcol)::numeric AS right_value, b.target FROM bilateral b
  ),
  si AS (
    SELECT s.joint_key, (v_a ->> s.col)::numeric AS left_value, NULL::numeric AS right_value, s.target FROM single s
  ),
  u AS (SELECT * FROM bi UNION ALL SELECT * FROM si),
  scored AS (
    SELECT joint_key, left_value, right_value, target,
      CASE WHEN left_value IS NOT NULL AND right_value IS NOT NULL THEN LEAST(left_value, right_value) WHEN left_value IS NOT NULL THEN left_value WHEN right_value IS NOT NULL THEN right_value ELSE NULL END AS worse,
      CASE WHEN left_value IS NOT NULL AND right_value IS NOT NULL AND GREATEST(left_value,right_value) > 0 THEN ROUND(ABS(left_value - right_value) / GREATEST(left_value, right_value) * 100, 2) ELSE NULL END AS asymmetry_pct
    FROM u
  ),
  final AS (
    SELECT joint_key, left_value, right_value, asymmetry_pct,
      public.t1_joint_band(joint_key, worse, target) AS score  -- T1 option A (Oct 21 2026): narrow-joint buffer, better color wins
    FROM scored WHERE worse IS NOT NULL AND NOT (c_hip_flex_unscored AND joint_key = 'hip_flex')
  ),
  ins AS (
    INSERT INTO public.joint_scores (assessment_id, joint_key, score, left_value, right_value, asymmetry_pct, asymmetry_flag)
    SELECT p_assessment_id, joint_key, score, left_value, right_value, asymmetry_pct, NULL FROM final
    ON CONFLICT (assessment_id, joint_key) DO UPDATE SET score = EXCLUDED.score, left_value = EXCLUDED.left_value, right_value = EXCLUDED.right_value, asymmetry_pct = EXCLUDED.asymmetry_pct
    RETURNING 1
  )
  SELECT count(*) INTO v_written FROM ins;

  DELETE FROM public.joint_scores js
  WHERE js.assessment_id = p_assessment_id
    AND js.joint_key NOT IN (
      SELECT joint_key FROM (
        WITH bilateral(joint_key, lcol, rcol) AS (
          VALUES ('hip_er','hip_er_l','hip_er_r'),('hip_ir','hip_ir_l','hip_ir_r'),('hip_abd','hip_abd_l','hip_abd_r'),('hip_flex','hip_flex_l','hip_flex_r'),('shoulder_er','shoulder_er_l','shoulder_er_r'),('shoulder_flex','shoulder_flex_l','shoulder_flex_r'),('ankle_df','ankle_df_l','ankle_df_r'),('cervical_rot','cervical_rot_l','cervical_rot_r'),('cervical_lat','cervical_lat_l','cervical_lat_r')
        ),
        single(joint_key, col) AS (
          VALUES ('lumbar_flex','lumbar_flex'),('lumbar_ext','lumbar_ext'),('cervical_flex','cervical_flex'),('cervical_ext','cervical_ext')
        )
        SELECT joint_key FROM bilateral WHERE ((v_a ->> lcol) IS NOT NULL OR (v_a ->> rcol) IS NOT NULL) AND NOT (c_hip_flex_unscored AND joint_key = 'hip_flex')
        UNION ALL
        SELECT joint_key FROM single WHERE (v_a ->> col) IS NOT NULL
      ) present
    );

  RETURN jsonb_build_object('status','ok','assessment_id',p_assessment_id,'written',v_written);
END;
$function$;
