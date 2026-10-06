-- NOT APPLIED until Jim says yes. Steady targets (Jim decisions, Oct 6 2026, closed; sources in
-- ledger/ROMRX-ASSESSMENT-STUDY-REFERENCE.md):
--   * seated hip rotation reads Steady once inside the typical range (Simoneau et al. 1998, Quinn option B1):
--     hip_er target 45 -> 29, hip_ir target 45 -> 26
--   * standing hip abduction: hip_abd target 90 -> 40 (Svenningsen 1989; no range shown)
--   * shoulder flexion: shoulder_flex target 180 -> 140 (Gill et al. 2020, mean minus 1 SD)
--   * ankle knee-to-wall: ankle_df target 20 -> 6 cm (mean minus 1 SD, Konor 2012 / McBride 2026; no range shown)
--   * neck (Jim approved 11:29 AM): cervical_rot 80 -> 70 (mean minus 1 SD, ages 20-49) and cervical_lat 45 -> 38
--     (20-29 mean minus 1 SD); Swinkels & Swinkels-Meewisse 2014, Spine, PMID 24573069. cervical_flex 50 / ext 60 unchanged.
-- Supersedes the compute_joint_scores() / protocol_joint_ranking() bodies of 20261003030000_hip_flex_unscored_scoring.sql
-- (and 20260929040000_base_protocol_ranking_matches_my_protocol.sql); those files are history and are not edited.
-- 1. public.compute_joint_scores(): only the seven target values change. Body = the live definition read 2026-10-06
--    (md5 3cb3161a3ad67f7fb23e5fcc4cf00ef8, identical to 20261003030000: no drift).
-- 2. public.protocol_joint_ranking(): only the same values in the `target` column change (it has no cervical_lat row) (Base ranking: severity =
--    target minus worse side, the My Protocol tie-break after the top problem areas from worst_joints). Body = the live
--    definition read 2026-10-06 (md5 91ee8f4611b07a9f1951b4afad1caa6c, identical to 20261003030000: no drift).
--    NOT changed: the `normal_min` column (sport-pack legacy Protocol severity: hip ER 40, IR 30, abd 40, hip flex 100,
--    shoulder flex 140, ankle 10, neck rotation 70), because Jim's decision keeps Protocol and technique minimums as they are.
--    Ranking order CAN change for Base users: the target feeds severity, and worst_joints (written by compute-tiers v39 or the
--    one-time recompute) feeds the top problem areas.
-- NOT changed: techniques.*_min (technique minimums), recompute_user_eligibility(), persist_protocols_for_assessment().
-- Mirrors: romrx-io-web app/src/lib/mobilityBands.ts JOINT_SCORE_TARGETS, compute-tiers JOINT_TARGETS (v39),
--          submit-lead-assessment/email.ts BAND_JOINTS.
-- Existing joint_scores rows are NOT rewritten here. Run scripts/one-time/20261006_recompute_steady_targets.sql deliberately after.
-- Rollback: 20261006153000_steady_targets_hip_shoulder_ankle.rollback.sql.txt restores the exact live definition.

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
      ('shoulder_er','shoulder_er_l','shoulder_er_r',90),
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
      CASE WHEN worse/target >= 1.0 THEN 3 WHEN worse/target >= 0.90 THEN 2 ELSE 1 END::smallint AS score
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
  -- Jim closed the hip flexion rule: never judged against 120. true = hip flexion is never ranked (not a weak spot) and a stored
  -- worst_joints entry for it is ignored. Set to false to restore the old ranking. Retired when #74 ships.
  cfg AS (SELECT true AS hip_flex_unscored),
  joint_defs(ord, key, left_key, right_key, single_key, normal_min, target) AS (VALUES
    (1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric, 29::numeric),  -- Oct 6 2026: target was 45
    (2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30, 26),  -- Oct 6 2026: target was 45
    (3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40),  -- Oct 6 2026: target was 90
    (4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 100, 120),
    (5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 90),
    (6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 140),  -- Oct 6 2026: target was 180
    (7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10, 6),  -- Oct 6 2026: target was 20 cm
    (8, 'lumbar_flex', NULL, NULL, 'lumbar_flex', 40, 60),
    (9, 'lumbar_ext', NULL, NULL, 'lumbar_ext', 20, 25),
    (10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 70)  -- Oct 6 2026: target was 80
  ),
  problem AS (
    SELECT t.base_key, (row_number() OVER (ORDER BY t.first_ord) - 1)::int AS idx
    FROM (
      SELECT regexp_replace(w, '_(l|r)$', '') AS base_key, min(o) AS first_ord
      FROM a, cfg, unnest(a.worst_joints) WITH ORDINALITY AS u(w, o)
      WHERE coalesce(w, '') <> ''
        AND NOT (cfg.hip_flex_unscored AND regexp_replace(w, '_(l|r)$', '') = 'hip_flex')
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
    FROM vals v LEFT JOIN problem p ON p.base_key = v.key CROSS JOIN cfg
    WHERE (v.lv IS NOT NULL OR v.rv IS NOT NULL OR v.sv IS NOT NULL)
      AND NOT (cfg.hip_flex_unscored AND v.key = 'hip_flex')
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
