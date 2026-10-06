-- NOT APPLIED. Pack minimums rescale (Jim said YES Oct 6 2026 12:10 PM ET; Quinn's recommendation
-- quinn-research/base-joint-list-20261006/MINIMUMS-RESCALE-REC-QUINN-20261006.md). Ship in the SAME sitting as
-- 20261006153000_steady_targets_hip_shoulder_ankle.sql (this file restates its protocol_joint_ranking() body), never alone.
--
-- Rule: new minimum = round(old minimum x new target / old target), so every technique keeps its difficulty relative to the
-- target while the Base targets move to the study numbers:
--   hip_er_min        x 29/45   (target 45 -> 29)
--   hip_ir_min        x 26/45   (target 45 -> 26)
--   shoulder_flex_min x 140/180 (target 180 -> 140)
--   hip_flex_min      x 63/120  (checked against the straight-leg raise; ASSUMES an SLR target of about 63 = mean minus 1 SD;
--                                Jim's on-screen typical range is 60-80. Open item.)
--   ankle_df_min      x 6/20    (cm; Quinn CAUTION: may be too easy because 20 cm was never a real number; spot-check the
--                                deep-squat / lunge lifts before it ships)
--   cervical_rot_min  x 70/80   (neck rotation)
--   cervical_lat_min  x 38/45   (neck side bend)
-- NOT rescaled: shoulder_er_min (Base shoulder ER is now the tucked-elbow lying test, target 40; live bjj 24 rows 55-70,
-- bodybuilding 86 rows 50-88; open item for Quinn), hip_abd_min (not in Quinn's list; bjj WS9 = 45), lumbar_* and
-- cervical_flex/ext and every other *_min. "Not measured is never a miss" handling is unchanged (no engine change here).
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
-- Live dry run (read-only, Oct 6 ~12:30 PM ET; weekly-batch/MINIMUMS-RESCALE-IMPL-20261006.md): bjj 195 values on 110 of 132
-- rows (hip_er 64, ankle 54, hip_ir 32, cervical_lat 32, hip_flex 6, shoulder_flex 6, cervical_rot 1); bodybuilding 272 values
-- on 218 of 274 rows (shoulder_flex 112, hip_flex 112, ankle 48). Total 467 values / 328 rows.
--
-- 2. public.protocol_joint_ranking(): ONLY the normal_min column (sport-pack legacy Protocol severity; mirrors the pack apps'
-- MyProtocol normalMin) is rescaled with the same ratios for the same joints: hip_er 40->26, hip_ir 30->17, hip_flex 100->53,
-- shoulder_flex 140->109, ankle_df 10->3, cervical_rot 70->61. Unchanged: hip_abd 40, shoulder_er 60 (open item), lumbar 40/20,
-- every target. Body = 20261006153000's definition with those 6 values (supersedes its "normal_min kept" note).
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
  v_summary jsonb;
  v_rows    int;
BEGIN
  IF EXISTS (SELECT 1 FROM public._minimums_rescale_20261006_log) THEN
    RAISE NOTICE 'pack minimums rescale 20261006 already applied at %; skipping (run-once)',
      (SELECT applied_at FROM public._minimums_rescale_20261006_log);
    RETURN;
  END IF;

  INSERT INTO public._minimums_rescale_20261006_backup
    (technique_id, code, sport, hip_er_min, hip_ir_min, shoulder_flex_min, hip_flex_min, ankle_df_min, cervical_rot_min, cervical_lat_min)
  SELECT id, code, sport, hip_er_min, hip_ir_min, shoulder_flex_min, hip_flex_min, ankle_df_min, cervical_rot_min, cervical_lat_min
  FROM public.techniques;

  -- per sport / column: values that change (same expression as the UPDATE below)
  SELECT jsonb_object_agg(sport, cols) INTO v_summary FROM (
    SELECT sport, jsonb_build_object(
      'hip_er_min',        count(*) FILTER (WHERE coalesce(hip_er_min, 0) <> 0        AND round(hip_er_min * 29 / 45.0) <> hip_er_min),
      'hip_ir_min',        count(*) FILTER (WHERE coalesce(hip_ir_min, 0) <> 0        AND round(hip_ir_min * 26 / 45.0) <> hip_ir_min),
      'shoulder_flex_min', count(*) FILTER (WHERE coalesce(shoulder_flex_min, 0) <> 0 AND round(shoulder_flex_min * 140 / 180.0) <> shoulder_flex_min),
      'hip_flex_min',      count(*) FILTER (WHERE coalesce(hip_flex_min, 0) <> 0      AND round(hip_flex_min * 63 / 120.0) <> hip_flex_min),
      'ankle_df_min',      count(*) FILTER (WHERE coalesce(ankle_df_min, 0) <> 0      AND round(ankle_df_min * 6 / 20.0) <> ankle_df_min),
      'cervical_rot_min',  count(*) FILTER (WHERE coalesce(cervical_rot_min, 0) <> 0  AND round(cervical_rot_min * 70 / 80.0) <> cervical_rot_min),
      'cervical_lat_min',  count(*) FILTER (WHERE coalesce(cervical_lat_min, 0) <> 0  AND round(cervical_lat_min * 38 / 45.0) <> cervical_lat_min)
    ) AS cols
    FROM public.techniques GROUP BY sport
  ) s;

  UPDATE public.techniques SET
    hip_er_min        = CASE WHEN coalesce(hip_er_min, 0) <> 0        THEN round(hip_er_min * 29 / 45.0)          ELSE hip_er_min END,
    hip_ir_min        = CASE WHEN coalesce(hip_ir_min, 0) <> 0        THEN round(hip_ir_min * 26 / 45.0)          ELSE hip_ir_min END,
    shoulder_flex_min = CASE WHEN coalesce(shoulder_flex_min, 0) <> 0 THEN round(shoulder_flex_min * 140 / 180.0) ELSE shoulder_flex_min END,
    hip_flex_min      = CASE WHEN coalesce(hip_flex_min, 0) <> 0      THEN round(hip_flex_min * 63 / 120.0)       ELSE hip_flex_min END,
    ankle_df_min      = CASE WHEN coalesce(ankle_df_min, 0) <> 0      THEN round(ankle_df_min * 6 / 20.0)         ELSE ankle_df_min END,
    cervical_rot_min  = CASE WHEN coalesce(cervical_rot_min, 0) <> 0  THEN round(cervical_rot_min * 70 / 80.0)    ELSE cervical_rot_min END,
    cervical_lat_min  = CASE WHEN coalesce(cervical_lat_min, 0) <> 0  THEN round(cervical_lat_min * 38 / 45.0)    ELSE cervical_lat_min END
  WHERE coalesce(hip_er_min, 0) <> 0 OR coalesce(hip_ir_min, 0) <> 0 OR coalesce(shoulder_flex_min, 0) <> 0
     OR coalesce(hip_flex_min, 0) <> 0 OR coalesce(ankle_df_min, 0) <> 0 OR coalesce(cervical_rot_min, 0) <> 0
     OR coalesce(cervical_lat_min, 0) <> 0;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public._minimums_rescale_20261006_log (summary)
  VALUES (jsonb_build_object('technique_rows_updated', v_rows, 'values_changed', coalesce(v_summary, '{}'::jsonb)));
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
    (1, 'hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 26::numeric, 29::numeric),  -- Oct 6 2026: target was 45; normal_min 40 -> 26 (x 29/45, minimums rescale)
    (2, 'hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 17, 26),  -- Oct 6 2026: target was 45; normal_min 30 -> 17 (x 26/45, minimums rescale)
    (3, 'hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40, 40),  -- Oct 6 2026: target was 90
    (4, 'hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 53, 120),  -- Oct 6 2026: normal_min 100 -> 53 (x 63/120, SLR; row unused while hip_flex_unscored)
    (5, 'shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60, 40),  -- Oct 6 2026: target was 90; normal_min 60 kept (above target, see header)
    (6, 'shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 109, 140),  -- Oct 6 2026: target was 180; normal_min 140 -> 109 (x 140/180, minimums rescale)
    (7, 'ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 3, 6),  -- Oct 6 2026: target was 20 cm; normal_min 10 -> 3 cm (x 6/20, minimums rescale)
    (8, 'lumbar_flex', NULL, NULL, 'lumbar_flex', 40, 60),
    (9, 'lumbar_ext', NULL, NULL, 'lumbar_ext', 20, 25),
    (10, 'cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 61, 70)  -- Oct 6 2026: target was 80; normal_min 70 -> 61 (x 70/80, minimums rescale)
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
