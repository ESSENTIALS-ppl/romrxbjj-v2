-- NOT APPLIED. Pack minimums rescale (Jim said YES Oct 6 2026 12:10 PM ET; Quinn's recommendation
-- quinn-research/base-joint-list-20261006/MINIMUMS-RESCALE-REC-QUINN-20261006.md, plus Quinn's calls 12:25 PM
-- RESCALE-CALLS-QUINN-20261006.md: shoulder ER x 40/90, SLR target 60, 4 ankle overrides, pjr normal_min = Base target). Ship in the SAME sitting as
-- 20261006153000_steady_targets_hip_shoulder_ankle.sql (this file restates its protocol_joint_ranking() body), never alone.
--
-- Rule: new minimum = round(old minimum x new target / old target), so every technique keeps its difficulty relative to the
-- target while the Base targets move to the study numbers:
--   hip_er_min        x 29/45   (target 45 -> 29)
--   hip_ir_min        x 26/45   (target 45 -> 26)
--   shoulder_flex_min x 140/180 (target 180 -> 140)
--   hip_flex_min      x 60/120  (checked against the straight-leg raise; SLR target 60 = floor of Jim's 60-80 range, Quinn 12:25)
--   ankle_df_min      x 6/20    (cm; Quinn spot-checked squats / level changes: ratio OK) THEN 4 overrides (Quinn 12:25):
--                                Wall Sit 026 -> 4, Dumbbell Step-Up 008 -> 4, Cable Pull-Through (Squat) 013 -> 3,
--                                Sissy Squat (Bodyweight) 025 -> 6 (by code; each must hit exactly 1 row or the migration aborts)
--   shoulder_er_min   x 40/90   (Base shoulder ER = tucked-elbow lying test, target 90 -> 40; Quinn 12:25: same ratio rule)
--   cervical_rot_min  x 70/80   (neck rotation)
--   cervical_lat_min  x 38/45   (neck side bend)
-- NOT rescaled: hip_abd_min (not in Quinn's list; bjj WS9 = 45), lumbar_* and cervical_flex/ext and every other *_min. "Not measured is never a miss" handling is unchanged (no engine change here).
-- NULL and 0 stay as they are (both engines skip them). postgres round(numeric) rounds half away from zero (4.5 -> 5).
--
-- Who reads techniques.*_min (no constants to change; they all follow this UPDATE): compute-tiers classify() (sport packs),
-- public.recompute_user_eligibility() (add_sport_access), unlocked_techniques_v (view), and the pack apps
-- (romrx-bodybuilding-web / romrx-yoga-web programGenerator.ts + MyGame.tsx, romrx-bjj-web via technique_eligibility).
-- Stored technique_eligibility rows are NOT rewritten here: run scripts/one-time/20261006_recompute_eligibility_minimums.sql after.
--
-- RUN-ONCE: guarded by public._minimums_rescale_20261006_log (one row). A second run is a no-op (NOTICE). Old values are kept
-- in public._minimums_rescale_20261006_backup for the rollback
-- (20261006170000_pack_minimums_rescale.rollback.sql.txt). Both tables: RLS on, no policies, no anon/authenticated grants.
--
-- Live dry run (read-only, Oct 6 round 2; weekly-batch/MINIMUMS-RESCALE-IMPL-20261006.md): bjj 219 values on 113 of 132
-- rows (hip_er 64, ankle 54, hip_ir 32, cervical_lat 32, shoulder_er 24, hip_flex 6, shoulder_flex 6, cervical_rot 1);
-- bodybuilding 358 values on 245 of 274 rows (shoulder_flex 112, hip_flex 112, shoulder_er 86, ankle 48, of which 4 ankle
-- overrides). Total 577 values / 358 rows. Rounding is half away from zero (e.g. hip_flex 115 x 0.5 = 57.5 -> 58).
--
-- 2. public.protocol_joint_ranking(): ONLY the normal_min column (sport-pack legacy Protocol severity; mirrors the pack apps'
-- MyProtocol normalMin) changes, to the Base target (Quinn 12:25 consistency rule, not a ratio): hip_er 40->29, hip_ir 30->26,
-- hip_flex 100->60 (SLR target; Quinn's item 3 said 50, item 4 says = target; row inert while hip_flex_unscored),
-- shoulder_er 60->40, shoulder_flex 140 (unchanged, = target), ankle_df 10->6, cervical_rot 70 (unchanged, = target).
-- Unchanged: hip_abd 40, lumbar 40/20, every target. Body = 20261006153000's definition with those values (supersedes its
-- "normal_min kept" note).
-- Base assessments rank by target, so Base users (all 18 live assessments) see no Protocol change from this.

CREATE TABLE IF NOT EXISTS public._minimums_rescale_20261006_backup (
  technique_id      uuid PRIMARY KEY,
  code              text,
  sport             text,
  hip_er_min        numeric,
  hip_ir_min        numeric,
  shoulder_flex_min numeric,
  hip_flex_min      numeric,
  ankle_df_min      numeric,
  cervical_rot_min  numeric,
  cervical_lat_min  numeric,
  shoulder_er_min   numeric,
  backed_up_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public._minimums_rescale_20261006_log (
  id         int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  applied_at timestamptz NOT NULL DEFAULT now(),
  summary    jsonb NOT NULL
);
ALTER TABLE public._minimums_rescale_20261006_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._minimums_rescale_20261006_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._minimums_rescale_20261006_backup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public._minimums_rescale_20261006_log FROM PUBLIC, anon, authenticated;

DO $rescale$
DECLARE
  v_summary   jsonb;
  v_rows      int;
  v_hit       int;
  v_code      text;
  v_val       numeric;
  v_overrides jsonb := '{}'::jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public._minimums_rescale_20261006_log) THEN
    RAISE NOTICE 'pack minimums rescale 20261006 already applied at %; skipping (run-once)',
      (SELECT applied_at FROM public._minimums_rescale_20261006_log);
    RETURN;
  END IF;

  INSERT INTO public._minimums_rescale_20261006_backup
    (technique_id, code, sport, hip_er_min, hip_ir_min, shoulder_flex_min, hip_flex_min, ankle_df_min, cervical_rot_min, cervical_lat_min, shoulder_er_min)
  SELECT id, code, sport, hip_er_min, hip_ir_min, shoulder_flex_min, hip_flex_min, ankle_df_min, cervical_rot_min, cervical_lat_min, shoulder_er_min
  FROM public.techniques;

  -- per sport / column: values that change (same expression as the UPDATE below)
  SELECT jsonb_object_agg(sport, cols) INTO v_summary FROM (
    SELECT sport, jsonb_build_object(
      'hip_er_min',        count(*) FILTER (WHERE coalesce(hip_er_min, 0) <> 0        AND round(hip_er_min * 29 / 45.0) <> hip_er_min),
      'hip_ir_min',        count(*) FILTER (WHERE coalesce(hip_ir_min, 0) <> 0        AND round(hip_ir_min * 26 / 45.0) <> hip_ir_min),
      'shoulder_flex_min', count(*) FILTER (WHERE coalesce(shoulder_flex_min, 0) <> 0 AND round(shoulder_flex_min * 140 / 180.0) <> shoulder_flex_min),
      'hip_flex_min',      count(*) FILTER (WHERE coalesce(hip_flex_min, 0) <> 0      AND round(hip_flex_min * 60 / 120.0) <> hip_flex_min),
      'ankle_df_min',      count(*) FILTER (WHERE coalesce(ankle_df_min, 0) <> 0      AND round(ankle_df_min * 6 / 20.0) <> ankle_df_min),
      'cervical_rot_min',  count(*) FILTER (WHERE coalesce(cervical_rot_min, 0) <> 0  AND round(cervical_rot_min * 70 / 80.0) <> cervical_rot_min),
      'cervical_lat_min',  count(*) FILTER (WHERE coalesce(cervical_lat_min, 0) <> 0  AND round(cervical_lat_min * 38 / 45.0) <> cervical_lat_min),
      'shoulder_er_min',   count(*) FILTER (WHERE coalesce(shoulder_er_min, 0) <> 0   AND round(shoulder_er_min * 40 / 90.0) <> shoulder_er_min)
    ) AS cols
    FROM public.techniques GROUP BY sport
  ) s;

  UPDATE public.techniques SET
    hip_er_min        = CASE WHEN coalesce(hip_er_min, 0) <> 0        THEN round(hip_er_min * 29 / 45.0)          ELSE hip_er_min END,
    hip_ir_min        = CASE WHEN coalesce(hip_ir_min, 0) <> 0        THEN round(hip_ir_min * 26 / 45.0)          ELSE hip_ir_min END,
    shoulder_flex_min = CASE WHEN coalesce(shoulder_flex_min, 0) <> 0 THEN round(shoulder_flex_min * 140 / 180.0) ELSE shoulder_flex_min END,
    hip_flex_min      = CASE WHEN coalesce(hip_flex_min, 0) <> 0      THEN round(hip_flex_min * 60 / 120.0)       ELSE hip_flex_min END,
    ankle_df_min      = CASE WHEN coalesce(ankle_df_min, 0) <> 0      THEN round(ankle_df_min * 6 / 20.0)         ELSE ankle_df_min END,
    cervical_rot_min  = CASE WHEN coalesce(cervical_rot_min, 0) <> 0  THEN round(cervical_rot_min * 70 / 80.0)    ELSE cervical_rot_min END,
    cervical_lat_min  = CASE WHEN coalesce(cervical_lat_min, 0) <> 0  THEN round(cervical_lat_min * 38 / 45.0)    ELSE cervical_lat_min END,
    shoulder_er_min   = CASE WHEN coalesce(shoulder_er_min, 0) <> 0   THEN round(shoulder_er_min * 40 / 90.0)     ELSE shoulder_er_min END
  WHERE coalesce(hip_er_min, 0) <> 0 OR coalesce(hip_ir_min, 0) <> 0 OR coalesce(shoulder_flex_min, 0) <> 0
     OR coalesce(hip_flex_min, 0) <> 0 OR coalesce(ankle_df_min, 0) <> 0 OR coalesce(cervical_rot_min, 0) <> 0
     OR coalesce(cervical_lat_min, 0) <> 0 OR coalesce(shoulder_er_min, 0) <> 0;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Ankle overrides AFTER the ratio (Quinn 12:25: old 20 / 16 looked mis-tagged). By code; exactly 1 row each or abort.
  FOR v_code, v_val IN VALUES
    ('bb_quads_wall_sit_isometric_026', 4::numeric),               -- Wall Sit (Isometric): 20 -> ratio 6 -> 4
    ('bb_quads_dumbbell_step_up_008', 4),                          -- Dumbbell Step-Up: 20 -> 6 -> 4
    ('bb_quads_cable_pull_through_squat_variation_013', 3),        -- Cable Pull-Through (Squat Variation): 20 -> 6 -> 3
    ('bb_quads_sissy_squat_bodyweight_025', 6)                     -- Sissy Squat (Bodyweight): 16 -> 5 -> 6
  LOOP
    UPDATE public.techniques SET ankle_df_min = v_val WHERE code = v_code AND sport = 'bodybuilding';
    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit <> 1 THEN
      RAISE EXCEPTION 'ankle override %: expected 1 row, got %', v_code, v_hit;
    END IF;
    v_overrides := v_overrides || jsonb_build_object(v_code, v_val);
  END LOOP;

  INSERT INTO public._minimums_rescale_20261006_log (summary)
  VALUES (jsonb_build_object('technique_rows_updated', v_rows, 'values_changed', coalesce(v_summary, '{}'::jsonb),
                             'ankle_overrides', v_overrides));
  RAISE NOTICE 'pack minimums rescale 20261006: % technique rows updated; %', v_rows, v_summary;
END
$rescale$;

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
    (1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 29::numeric, 29::numeric),  -- Oct 6 2026: target was 45; normal_min 40 -> 29 (= Base target, minimums rescale)
    (2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 26, 26),  -- Oct 6 2026: target was 45; normal_min 30 -> 26 (= Base target, minimums rescale)
    (3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40),  -- Oct 6 2026: target was 90
    (4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 60, 120),  -- Oct 6 2026: normal_min 100 -> 60 (SLR target 60; row unused while hip_flex_unscored)
    (5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 40, 40),  -- Oct 6 2026: target was 90; normal_min 60 -> 40 (= Base target, Quinn 12:25)
    (6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140, 140),  -- Oct 6 2026: target was 180; normal_min 140 kept (= Base target)
    (7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 6, 6),  -- Oct 6 2026: target was 20 cm; normal_min 10 -> 6 cm (= Base target, minimums rescale)
    (8, 'lumbar_flex', NULL, NULL, 'lumbar_flex', 40, 60),
    (9, 'lumbar_ext', NULL, NULL, 'lumbar_ext', 20, 25),
    (10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70, 70)  -- Oct 6 2026: target was 80; normal_min 70 kept (= Base target)
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
