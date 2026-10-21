-- Lumbar never ranked (Grant Oct 21 2026 7:10 PM ET; Jim ledger L312). LOCAL ONLY, NOT APPLIED.
-- Runs AFTER 20261021210000_t1_rebased and BEFORE 20261021220000_rescore_saved (so the rescore's persist_protocols uses it).
-- protocol_joint_ranking = the 20261021203000 body with lumbar_flex / lumbar_ext excluded from worst_joints picks and from
-- the fill. Saved lumbar values are NOT touched. Rollback: 20261021215000_lumbar_never_ranked.rollback.sql.txt.
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
    (1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 23::numeric, 23::numeric),  -- Oct 21 2026 range reset: 29 -> 23 (normal_min = target);  -- Oct 6 2026: target was 45; normal_min 40 -> 29 (= Base target, minimums rescale)
    (2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 24, 24),  -- Oct 21 2026 range reset: 26 -> 24;  -- Oct 6 2026: target was 45; normal_min 30 -> 26 (= Base target, minimums rescale)
    (3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40),  -- Oct 6 2026: target was 90
    (4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 60, 120),  -- Oct 6 2026: normal_min 100 -> 60 (SLR target 60; row unused while hip_flex_unscored)
    (5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 85, 85),  -- Oct 6 2026 8:19 PM: standing goal-post, normal_min 60 -> 85, target 40 -> 85
    (6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 141, 141),  -- Oct 21 2026 range reset: 140 -> 141;  -- Oct 6 2026: target was 180
    (7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 6.1, 6.1),  -- Oct 21 2026 range reset: 6 -> 6.1 cm;  -- Oct 6 2026: target was 20 cm; normal_min 10 -> 6 cm (= Base target, minimums rescale)
    (8, 'lumbar_flex', NULL, NULL, 'lumbar_flex', 40, 60),
    (9, 'lumbar_ext', NULL, NULL, 'lumbar_ext', 20, 25),
    (10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 70),  -- Oct 6 2026: target was 80
    (11, 'cervical_ext', NULL, NULL, 'cervical_ext', 48, 48),  -- Oct 21 2026 range reset: 60 -> 48;  -- Oct 19 2026: = compute_joint_scores target 60 (Quinn memo, PMID 24573069; Base app main mobilityBands.ts:74)
    (12, 'cervical_flex', NULL, NULL, 'cervical_flex', 39, 39),  -- Oct 21 2026 range reset: 50 -> 39;  -- Oct 19 2026: = compute_joint_scores target 50 (Quinn memo, PMID 24573069; Base app main mobilityBands.ts:73)
    (13, 'cervical_lat', 'cervical_lat_l', 'cervical_lat_r', NULL, 37, 37)  -- Oct 21 2026 range reset: 38 -> 37;  -- Oct 19 2026: side bend 38 per side (Jim Oct 6; Swinkels; = live compute_joint_scores target 38)
  ),
  problem AS (
    SELECT t.base_key, (row_number() OVER (ORDER BY t.first_ord) - 1)::int AS idx
    FROM (
      SELECT regexp_replace(w, '_(l|r)$', '') AS base_key, min(o) AS first_ord
      FROM a, cfg, unnest(a.worst_joints) WITH ORDINALITY AS u(w, o)
      WHERE coalesce(w, '') <> ''
        AND NOT (cfg.hip_flex_unscored AND regexp_replace(w, '_(l|r)$', '') = 'hip_flex')
        AND w NOT IN ('lumbar_flex', 'lumbar_ext')   -- Grant Oct 21 2026 7:10 PM: low back never ranked
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
      AND v.key NOT IN ('lumbar_flex', 'lumbar_ext')   -- Grant Oct 21 2026 7:10 PM: low back never ranked
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
