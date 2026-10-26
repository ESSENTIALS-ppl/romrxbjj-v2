-- NOT APPLIED. LOCAL DRAFT ONLY. Needs Jim's own typed OK before any apply (prod migration).
-- T1 REBASED on the range reset. Apply ONLY AFTER 20261021203000_range_reset_pooled.sql.
-- Jim, Oct 21 2026: 10:53 AM ET "T1: A plus C"; 11:47 AM ET narrowed buffers (Quinn t1-quinn-buffers.md);
--   4:38 PM ET (via Grant 4:56 PM) "Drop the T1 buffers on the reset moves".
-- Supersedes the never-applied 20261021150000_t1_narrow_bands.sql (old Oct 6 targets; kept only on backup branch
--   feat/t1-narrow-bands-20261021 at ff6bf0f, NOT in this branch).
-- A: per-joint buffers now ONLY on joints the reset did not change: hip_abd 2/0, cervical_rot 5/5, shoulder_er 5/5 (deg).
--    Neck side bend, flexion, extension, hip ER, hip IR, shoulder flexion, ankle: NO buffer, plain 100% / 90% rule on the NEW targets.
-- C: public.t1_weighted_gap() (0.5 weight on narrow joints until two assessments agree). protocol_joint_ranking NOT redefined
--    (stays as 20261021203000 left it).
-- compute_joint_scores body = the post-reset text in 20261021203000_range_reset_pooled.sql (NEW targets: hip_er 23, hip_ir 24,
--   shoulder_flex 141, ankle_df 6.1, cervical_lat 37, cervical_flex 39, cervical_ext 48); ONLY the score CASE line changes.
-- Existing joint_scores rows are NOT rewritten. Rollback: 20261021210000_t1_rebased.rollback.sql.txt (restores the post-reset body).
-- Mirrors: romrx-io-web mobilityBands.ts NARROW_BAND_CONFIG, romrxbjj-v2 functions/_shared/t1_narrow_bands.ts.

CREATE OR REPLACE FUNCTION public.t1_narrow_buffer(p_joint_key text, p_line text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce((
    SELECT CASE WHEN p_line = 'building' THEN c.building ELSE c.steady END
    FROM (VALUES
      ('hip_abd',       2::numeric, 0::numeric),
      ('cervical_rot',  5,   5),
      ('shoulder_er',   5,   5)
    ) AS c(joint_key, steady, building)
    WHERE c.joint_key = regexp_replace(coalesce(p_joint_key, ''), '_(l|r)$', '')
  ), 0);
$function$;

CREATE OR REPLACE FUNCTION public.t1_is_narrow(p_joint_key text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.t1_narrow_buffer(p_joint_key, 'steady') > 0 OR public.t1_narrow_buffer(p_joint_key, 'building') > 0;
$function$;

CREATE OR REPLACE FUNCTION public.t1_joint_band(p_joint_key text, p_worse numeric, p_target numeric)
 RETURNS smallint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT (CASE
    WHEN p_worse IS NULL OR p_target IS NULL OR p_target <= 0 THEN 1
    WHEN NOT public.t1_is_narrow(p_joint_key) THEN
      CASE WHEN p_worse/p_target >= 1.0 THEN 3 WHEN p_worse/p_target >= 0.90 THEN 2 ELSE 1 END
    WHEN p_worse + public.t1_narrow_buffer(p_joint_key, 'steady') >= p_target THEN 3
    WHEN p_worse + public.t1_narrow_buffer(p_joint_key, 'building') >= 0.90 * p_target THEN 2
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
      * CASE WHEN NOT public.t1_is_narrow(p_joint_key) THEN 1
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
      ('hip_er','hip_er_l','hip_er_r',23::numeric),  -- Oct 21 2026 range reset (PMIDs 9742472, 1881956): was 29
      ('hip_ir','hip_ir_l','hip_ir_r',24),  -- Oct 21 2026 range reset (PMIDs 9742472, 1881956): was 26
      ('hip_abd','hip_abd_l','hip_abd_r',40),  -- Oct 6 2026: was 90
      ('hip_flex','hip_flex_l','hip_flex_r',120),
      ('shoulder_er','shoulder_er_l','shoulder_er_r',85),  -- Oct 6 2026 8:19 PM: standing goal-post test (was 40 tucked elbow; 90 before)
      ('shoulder_flex','shoulder_flex_l','shoulder_flex_r',141),  -- Oct 21 2026 range reset (PMIDs 33046038): was 140
      ('ankle_df','ankle_df_l','ankle_df_r',6.1),  -- Oct 21 2026 range reset (PMIDs 41723909): was 6 cm
      ('cervical_rot','cervical_rot_l','cervical_rot_r',70),  -- Oct 6 2026: was 80 (Swinkels 2014)
      ('cervical_lat','cervical_lat_l','cervical_lat_r',37)  -- Oct 21 2026 range reset (PMIDs 23829201, 32626769, 33868830, 39677250): was 38
  ),
  single(joint_key, col, target) AS (
    VALUES
      ('lumbar_flex','lumbar_flex',60::numeric),
      ('lumbar_ext','lumbar_ext',25),
      ('cervical_flex','cervical_flex',39),  -- Oct 21 2026 range reset (PMIDs 23829201, 32626769, 33868830, 39677250): was 50
      ('cervical_ext','cervical_ext',48)  -- Oct 21 2026 range reset (PMIDs 23829201, 32626769, 33868830, 39677250): was 60
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
      public.t1_joint_band(joint_key, worse, target) AS score  -- T1 option A (rebased Oct 21 2026): buffer on hip_abd, cervical_rot, shoulder_er only
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
