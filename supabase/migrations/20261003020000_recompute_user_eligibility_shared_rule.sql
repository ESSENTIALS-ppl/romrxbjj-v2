-- DRAFT, NOT APPLIED. Decision #8 (Jim): public.recompute_user_eligibility(uuid) uses the SAME rule as compute-tiers v43
-- (supabase/functions/compute-tiers/rule.ts + base_norms.ts). Keep the two in step: any constant changed there must be
-- changed here (the constants are marked below).
--
-- Apply ORDER: 1) 20261003010000_technique_eligibility_grey_joint_status.sql (GREY tier + joint_status + status_reason),
--              2) this file. Rollback: 20261003020000_recompute_user_eligibility_shared_rule.rollback.sql.txt
--              (restores the live definition captured read-only 2026-10-03, drops the helper functions).
--
-- Rule (Jim's closed decisions): each required joint is GREEN / YELLOW / RED against THAT move's requirement; the move
-- takes the WORST measured required joint; no rule, or a required joint not measured, is GREY and never GREEN.
-- YELLOW = flat 10 degrees below (ankle: flat 2 cm), not 90%. Laterality follows the sheet: BOTH/MIDLINE/blank = worse
-- side, ANY = better side, LEAD = the dominant side, HOOK/TRAIL = the other side (athletes.dominant_side; unknown dominant
-- = worse side). The old 15% / 25% side downgrade is dropped. Two rows for one move+joint: the stricter number wins.
-- Hip flexion on a move takes the Base straight-leg-raise color (per leg, sex specific, Youdas 2005; PENDING JIM flag
-- c_hip_flex_moves_use_slr). Ankle: Base measures knee-to-wall in CM; a unit-less/degree requirement (every current
-- ankle row) is NEVER compared to a cm reading, so it is GREY until a cm row ("Ankle DF (cm)") exists.

CREATE OR REPLACE FUNCTION public.rom_norm_joint(p_joint text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(btrim(p_joint))
    WHEN 'hip er' THEN 'hip_er'                   WHEN 'hip_external_rotation' THEN 'hip_er'
    WHEN 'hip ir' THEN 'hip_ir'                   WHEN 'hip_internal_rotation' THEN 'hip_ir'
    WHEN 'hip abduction' THEN 'hip_abd'           WHEN 'hip_abduction' THEN 'hip_abd'
    WHEN 'hip flexion' THEN 'hip_flex'            WHEN 'hip_flexion' THEN 'hip_flex'
    WHEN 'hip extension' THEN 'hip_ext'           WHEN 'hip_extension' THEN 'hip_ext'
    WHEN 'shoulder er' THEN 'shoulder_er'         WHEN 'shoulder_external_rotation' THEN 'shoulder_er'
    WHEN 'shoulder flexion' THEN 'shoulder_flex'  WHEN 'shoulder_flexion' THEN 'shoulder_flex'
    WHEN 'ankle df' THEN 'ankle_df'               WHEN 'ankle_dorsiflexion' THEN 'ankle_df'   WHEN 'ankle_df' THEN 'ankle_df'
    WHEN 'ankle df (cm)' THEN 'ankle_df_cm'       WHEN 'ankle_df_cm' THEN 'ankle_df_cm'       WHEN 'ankle dorsiflexion (cm)' THEN 'ankle_df_cm'
    WHEN 'cervical rotation' THEN 'cervical_rot'  WHEN 'cervical_rotation' THEN 'cervical_rot'
    WHEN 'cervical lateral flexion' THEN 'cervical_lat' WHEN 'cervical_lateral_flexion' THEN 'cervical_lat'
    WHEN 'cervical flexion' THEN 'cervical_flex'  WHEN 'cervical_flexion' THEN 'cervical_flex'
    WHEN 'cervical extension' THEN 'cervical_ext' WHEN 'cervical_extension' THEN 'cervical_ext'
    WHEN 'lumbar flexion' THEN 'lumbar_flex'      WHEN 'lumbar_flexion' THEN 'lumbar_flex'
    WHEN 'lumbar extension' THEN 'lumbar_ext'     WHEN 'lumbar_extension' THEN 'lumbar_ext'
    ELSE regexp_replace(lower(btrim(p_joint)), '\s+', '_', 'g')
  END
$$;

-- CONSTANTS (mirror rule.ts): YELLOW_TOLERANCE_DEG = 10, YELLOW_TOLERANCE_ANKLE_CM = 2
CREATE OR REPLACE FUNCTION public.rom_yellow_tolerance(p_joint text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN p_joint = 'ankle_df' THEN 2::numeric ELSE 10::numeric END $$;

CREATE OR REPLACE FUNCTION public.rom_classify_joint(p_value numeric, p_required numeric, p_joint text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN 'GREY'
    WHEN p_value >= p_required THEN 'GREEN'
    WHEN p_value >= p_required - public.rom_yellow_tolerance(p_joint) THEN 'YELLOW'
    ELSE 'RED'
  END
$$;

-- Straight-leg raise, ONE leg, sex specific (mirror base_norms.ts). Youdas 2005 JOSPT 35(4):246-252 (PMID 15901126);
-- means/SDs abstract-verified only. GREEN at or above mean - 1 SD. YELLOW edge mode (PENDING JIM, mirrors
-- HIP_FLEX_GRADING_MODE): 'flat10' (default) = within 10 degrees below the GREEN edge; 'published_sd' = down to mean - 2 SD.
-- Missing/unknown sex follows c_sex_missing (mirrors HIP_FLEX_MISSING_SEX_POLICY): 'pooled' (default, Grant for Jim) = one sex-neutral
-- PROPOSED norm derived from the men and women rows, 'grey' = Not rated, 'lenient' = lower of the two edges. Over 90 degrees is graded normally (PENDING JIM, mirrors
-- HIP_FLEX_ABOVE_REVIEW_HANDLING).
CREATE OR REPLACE FUNCTION public.rom_slr_leg(p_gender text, p_value numeric) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  c_mode constant text := 'flat10';           -- PENDING JIM: 'flat10' | 'published_sd'
  -- Mirrors HIP_FLEX_MISSING_SEX_POLICY (users.gender is empty for 31 of 35 users). 'pooled' (DEFAULT, decided by Grant for Jim) =
  -- one sex-neutral norm, PROPOSED/derived from Youdas men (n106, 68.5/6.8) and women (n108, 76.3/9.5): mean 72.4, SD 9.1,
  -- GREEN 63.3, YELLOW 53.3 (flat10) or 54.2 (published_sd); needs Quinn | 'grey' = Not rated | 'lenient' = lower of the men and women edges.
  c_sex_missing constant text := 'pooled';
  v_sex text := lower(btrim(coalesce(p_gender, '')));
  v_green numeric; v_yellow numeric;
BEGIN
  IF p_value IS NULL THEN RETURN 'GREY'; END IF;
  IF v_sex IN ('male', 'm', 'man') THEN
    v_green := 61.7; v_yellow := CASE WHEN c_mode = 'published_sd' THEN 54.9 ELSE 51.7 END;
  ELSIF v_sex IN ('female', 'f', 'woman') THEN
    v_green := 66.8; v_yellow := CASE WHEN c_mode = 'published_sd' THEN 57.3 ELSE 56.8 END;
  ELSIF c_sex_missing = 'pooled' THEN
    v_green := 63.3; v_yellow := CASE WHEN c_mode = 'published_sd' THEN 54.2 ELSE 53.3 END;
  ELSIF c_sex_missing = 'lenient' THEN
    v_green := 61.7; v_yellow := CASE WHEN c_mode = 'published_sd' THEN 54.9 ELSE 51.7 END;
  ELSE
    RETURN 'GREY';
  END IF;
  RETURN CASE WHEN p_value >= v_green THEN 'GREEN' WHEN p_value >= v_yellow THEN 'YELLOW' ELSE 'RED' END;
END $$;

-- Joint color = worst graded leg (RED > YELLOW > GREEN); GREY only when no leg could be graded. Not a blend.
CREATE OR REPLACE FUNCTION public.rom_slr_status(p_gender text, p_left numeric, p_right numeric) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  WITH l AS (SELECT unnest(ARRAY[public.rom_slr_leg(p_gender, p_left), public.rom_slr_leg(p_gender, p_right)]) AS s)
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM l WHERE s = 'RED') THEN 'RED'
    WHEN EXISTS (SELECT 1 FROM l WHERE s = 'YELLOW') THEN 'YELLOW'
    WHEN EXISTS (SELECT 1 FROM l WHERE s = 'GREEN') THEN 'GREEN'
    ELSE 'GREY'
  END
$$;

-- Pick the leg status for a joint already colored per leg (straight-leg raise), honoring the sheet's side rule
-- (mirrors pickLegStatus in rule.ts). One side missing = GREY unless the rule needs only the logged side
-- (ONE_SIDE_MISSING_POLICY = 'grey', PENDING JIM; 'use_measured_side' would fall back to the logged leg).
CREATE OR REPLACE FUNCTION public.rom_pick_leg_status(p_left text, p_right text, p_lat text, p_dom text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  c_one_side constant text := 'grey';                 -- PENDING JIM: 'grey' | 'use_measured_side'
  v_rank constant text[] := ARRAY['GREEN', 'YELLOW', 'RED'];
  v_wanted text;
  v_graded text[] := ARRAY(SELECT x FROM unnest(ARRAY[p_left, p_right]) AS x WHERE x <> 'GREY');
BEGIN
  IF coalesce(array_length(v_graded, 1), 0) = 0 THEN RETURN 'GREY'; END IF;
  IF p_lat IN ('LEAD', 'HOOK', 'TRAIL') AND p_dom IN ('left', 'right') THEN
    v_wanted := CASE WHEN (p_dom = 'left') = (p_lat = 'LEAD') THEN p_left ELSE p_right END;
    IF v_wanted <> 'GREY' THEN RETURN v_wanted; END IF;
    IF c_one_side = 'grey' THEN RETURN 'GREY'; END IF;
  ELSIF c_one_side = 'grey' AND array_length(v_graded, 1) < 2 THEN
    RETURN 'GREY';
  END IF;
  IF p_lat = 'ANY' THEN
    RETURN (SELECT x FROM unnest(v_graded) x ORDER BY array_position(v_rank, x) ASC LIMIT 1);
  END IF;
  RETURN (SELECT x FROM unnest(v_graded) x ORDER BY array_position(v_rank, x) DESC LIMIT 1);
END $$;

-- A negative reading is an invalid entry = not measured (mirrors toNum). Zero is a real value.
CREATE OR REPLACE FUNCTION public.rom_valid_reading(p_value numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN p_value >= 0 THEN p_value ELSE NULL END $$;

CREATE OR REPLACE FUNCTION public.recompute_user_eligibility(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c_hip_flex_moves_use_slr constant boolean := true;   -- PENDING JIM (mirrors HIP_FLEX_MOVES_USE_SLR_COLOR)
  c_grey_beats_yellow constant boolean := true;        -- PENDING JIM (mirrors GREY_BEATS_YELLOW; RED always wins)
  c_one_side constant text := 'grey';                  -- PENDING JIM (mirrors ONE_SIDE_MISSING_POLICY: 'grey' | 'use_measured_side')
  v_assessment   assessments%ROWTYPE;
  v_sports       text[];
  v_sport        text;
  v_now          timestamptz := now();
  v_result       jsonb := '{}'::jsonb;
  v_written      int;
  v_gender       text;
  v_dom          text;
BEGIN
  SELECT array_remove(COALESCE(sports_enabled, ARRAY['general']::text[]), 'general'), gender
    INTO v_sports, v_gender
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

  -- Dominant side drives LEAD / HOOK / TRAIL. Unknown = worse side.
  SELECT lower(btrim(a.dominant_side)) INTO v_dom
    FROM athletes a
   WHERE (v_assessment.athlete_id IS NOT NULL AND a.id = v_assessment.athlete_id)
      OR (v_assessment.athlete_id IS NULL AND a.user_id = p_user_id)
   LIMIT 1;
  v_dom := CASE WHEN v_dom IN ('left', 'l') THEN 'left' WHEN v_dom IN ('right', 'r') THEN 'right' ELSE NULL END;

  FOREACH v_sport IN ARRAY v_sports LOOP
    IF v_sport NOT IN ('bjj', 'bodybuilding') THEN
      v_result := v_result || jsonb_build_object(v_sport, 'skipped_no_catalog');
      CONTINUE;
    END IF;

    WITH
    -- athlete values per joint, left / right (single-value joints use the same value twice)
    jv(joint, l, r) AS (
      VALUES
        ('hip_er',        public.rom_valid_reading(v_assessment.hip_er_l::numeric),        public.rom_valid_reading(v_assessment.hip_er_r::numeric)),
        ('hip_ir',        public.rom_valid_reading(v_assessment.hip_ir_l::numeric),        public.rom_valid_reading(v_assessment.hip_ir_r::numeric)),
        ('hip_abd',       public.rom_valid_reading(v_assessment.hip_abd_l::numeric),       public.rom_valid_reading(v_assessment.hip_abd_r::numeric)),
        ('hip_flex',      public.rom_valid_reading(v_assessment.hip_flex_l::numeric),      public.rom_valid_reading(v_assessment.hip_flex_r::numeric)),
        ('shoulder_er',   public.rom_valid_reading(v_assessment.shoulder_er_l::numeric),   public.rom_valid_reading(v_assessment.shoulder_er_r::numeric)),
        ('shoulder_flex', public.rom_valid_reading(v_assessment.shoulder_flex_l::numeric), public.rom_valid_reading(v_assessment.shoulder_flex_r::numeric)),
        ('ankle_df',      public.rom_valid_reading(v_assessment.ankle_df_l::numeric),      public.rom_valid_reading(v_assessment.ankle_df_r::numeric)),
        ('cervical_rot',  public.rom_valid_reading(v_assessment.cervical_rot_l::numeric),  public.rom_valid_reading(v_assessment.cervical_rot_r::numeric)),
        ('cervical_lat',  public.rom_valid_reading(v_assessment.cervical_lat_l::numeric),  public.rom_valid_reading(v_assessment.cervical_lat_r::numeric)),
        ('lumbar_flex',   public.rom_valid_reading(v_assessment.lumbar_flex::numeric),     public.rom_valid_reading(v_assessment.lumbar_flex::numeric)),
        ('lumbar_ext',    public.rom_valid_reading(v_assessment.lumbar_ext::numeric),      public.rom_valid_reading(v_assessment.lumbar_ext::numeric)),
        ('cervical_flex', public.rom_valid_reading(v_assessment.cervical_flex::numeric),   public.rom_valid_reading(v_assessment.cervical_flex::numeric)),
        ('cervical_ext',  public.rom_valid_reading(v_assessment.cervical_ext::numeric),    public.rom_valid_reading(v_assessment.cervical_ext::numeric))
    ),
    -- documented requirements (rom_thresholds). An explicit cm ankle row replaces a unit-less ankle row.
    mat0 AS (
      SELECT m.technique_code, public.rom_norm_joint(m.joint) AS j0, m.required_value::numeric AS req,
             upper(btrim(m.laterality_rule)) AS lat
        FROM rom_thresholds m
       WHERE m.sport = v_sport AND m.required_value IS NOT NULL AND m.required_value > 0
    ),
    mat1 AS (
      SELECT technique_code, CASE WHEN j0 = 'ankle_df_cm' THEN 'ankle_df' ELSE j0 END AS joint,
             (j0 = 'ankle_df_cm') AS is_cm, req, lat
        FROM mat0
    ),
    mat2 AS (
      SELECT * FROM mat1 x
       WHERE NOT (x.joint = 'ankle_df' AND NOT x.is_cm
                  AND EXISTS (SELECT 1 FROM mat1 y WHERE y.technique_code = x.technique_code AND y.joint = 'ankle_df' AND y.is_cm))
    ),
    -- two rows for one move + joint: the stricter (larger) number applies
    mat AS (
      SELECT DISTINCT ON (technique_code, joint) technique_code, joint, is_cm, req, lat
        FROM mat2
       ORDER BY technique_code, joint, req DESC, lat NULLS LAST
    ),
    -- legacy techniques.*_min fills only joints the matrix has no number for (kept, flagged undocumented)
    legacy AS (
      SELECT t.code AS technique_code, j.joint, false AS is_cm, j.thresh::numeric AS req, NULL::text AS lat
        FROM techniques t
       CROSS JOIN LATERAL (VALUES
          ('hip_er', t.hip_er_min), ('hip_ir', t.hip_ir_min), ('hip_abd', t.hip_abd_min), ('hip_flex', t.hip_flex_min),
          ('shoulder_er', t.shoulder_er_min), ('shoulder_flex', t.shoulder_flex_min), ('ankle_df', t.ankle_df_min),
          ('cervical_rot', t.cervical_rot_min), ('cervical_lat', t.cervical_lat_min), ('lumbar_flex', t.lumbar_flex_min),
          ('lumbar_ext', t.lumbar_ext_min), ('cervical_flex', t.cervical_flex_min), ('cervical_ext', t.cervical_ext_min)
       ) AS j(joint, thresh)
       WHERE t.sport = v_sport AND j.thresh IS NOT NULL AND j.thresh > 0
         AND NOT EXISTS (SELECT 1 FROM mat WHERE mat.technique_code = t.code AND mat.joint = j.joint)
    ),
    reqs AS (SELECT * FROM mat UNION ALL SELECT * FROM legacy),
    graded AS (
      SELECT r.technique_code, r.joint, r.req,
             v.val,
             CASE
               WHEN r.joint = 'hip_flex' AND c_hip_flex_moves_use_slr
                 THEN public.rom_pick_leg_status(public.rom_slr_leg(v_gender, jv.l), public.rom_slr_leg(v_gender, jv.r), r.lat, v_dom)
               WHEN r.joint = 'ankle_df' AND NOT r.is_cm THEN 'GREY'          -- F-17: cm reading never vs a unit-less requirement
               ELSE public.rom_classify_joint(v.val, r.req, r.joint)
             END AS status,
             (r.joint = 'hip_flex' AND c_hip_flex_moves_use_slr) AS slr_basis,
             (r.joint = 'ankle_df' AND NOT r.is_cm) AS unit_pending
        FROM reqs r
        LEFT JOIN jv ON jv.joint = r.joint
        CROSS JOIN LATERAL (SELECT CASE
            WHEN jv.joint IS NULL OR (jv.l IS NULL AND jv.r IS NULL) THEN NULL
            WHEN r.lat IN ('LEAD', 'HOOK', 'TRAIL') AND v_dom IS NOT NULL THEN
              CASE WHEN c_one_side = 'grey' THEN CASE WHEN (v_dom = 'left') = (r.lat = 'LEAD') THEN jv.l ELSE jv.r END
                   ELSE COALESCE(CASE WHEN (v_dom = 'left') = (r.lat = 'LEAD') THEN jv.l ELSE jv.r END, LEAST(jv.l, jv.r)) END
            WHEN c_one_side = 'grey' AND (jv.l IS NULL OR jv.r IS NULL) THEN NULL
            WHEN r.lat = 'ANY' THEN GREATEST(jv.l, jv.r)
            ELSE LEAST(jv.l, jv.r)
          END AS val) v
    ),
    per_tech AS (
      SELECT t.id AS technique_id, t.code AS technique_code,
             COUNT(g.joint) AS req_count,
             BOOL_OR(g.status = 'RED') AS any_red,
             BOOL_OR(g.status = 'YELLOW') AS any_yellow,
             BOOL_OR(g.status = 'GREY') AS any_grey,
             COALESCE(jsonb_agg(
               CASE WHEN g.joint IS NOT NULL THEN
                 jsonb_build_object('joint', g.joint, 'status', g.status)
                 || CASE WHEN g.slr_basis THEN jsonb_build_object('basis', 'slr_norm') ELSE '{}'::jsonb END
               END) FILTER (WHERE g.joint IS NOT NULL), '[]'::jsonb) AS joint_status,
             COALESCE(ARRAY_REMOVE(ARRAY_AGG(
               CASE WHEN g.status = 'GREY' AND g.unit_pending THEN g.joint || ':cm_requirement_pending'
                    WHEN g.status = 'GREY' AND g.slr_basis THEN g.joint || ':slr_not_rated'
                    WHEN g.status = 'GREY' THEN g.joint || ':not_measured(min ' || fmt_num(g.req) || ')'
                    WHEN g.slr_basis AND g.status <> 'GREEN' THEN g.joint || ':slr_norm'
                    WHEN g.status <> 'GREEN' THEN g.joint || ':' || fmt_num(g.val) || ' vs min ' || fmt_num(g.req)
               END), NULL), ARRAY[]::text[]) AS limiting
        FROM techniques t
        LEFT JOIN graded g ON g.technique_code = t.code
       WHERE t.sport = v_sport
       GROUP BY t.id, t.code
    ),
    classified AS (
      SELECT technique_id, technique_code, joint_status,
             CASE WHEN req_count = 0 THEN 'GREY'
                  WHEN any_red THEN 'RED'
                  WHEN any_grey AND c_grey_beats_yellow THEN 'GREY'
                  WHEN any_yellow THEN 'YELLOW'
                  WHEN any_grey THEN 'GREY'
                  ELSE 'GREEN' END AS tier,
             CASE WHEN req_count = 0 THEN 'no_rule'
                  WHEN any_red THEN NULL
                  WHEN any_grey AND (c_grey_beats_yellow OR NOT any_yellow) THEN 'incomplete'
                  ELSE NULL END AS status_reason,
             CASE WHEN req_count = 0 OR NOT (any_red OR any_yellow OR any_grey) THEN ARRAY[]::text[]
                  ELSE limiting END AS limiting_joints
        FROM per_tech
    )
    INSERT INTO technique_eligibility
      (user_id, athlete_id, assessment_id, technique_id, technique_code, sport, tier, limiting_joints, joint_status, status_reason, computed_at)
    SELECT
      p_user_id, v_assessment.athlete_id, v_assessment.id, c.technique_id, c.technique_code,
      v_sport, c.tier, c.limiting_joints, c.joint_status, c.status_reason, v_now
    FROM classified c
    ON CONFLICT (user_id, assessment_id, technique_id)
    DO UPDATE SET
      tier = EXCLUDED.tier,
      limiting_joints = EXCLUDED.limiting_joints,
      joint_status = EXCLUDED.joint_status,
      status_reason = EXCLUDED.status_reason,
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
