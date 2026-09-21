-- Phase A1: persist My Protocol daily Rx into public.protocols for rombot_context.
-- Applied live 2026-09-16 via MCP. Called from compute-tiers after assessment scoring.
-- FE (My Protocol) and ai-chat (rombot_context.protocol) share one DB source of truth.

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
BEGIN
  SELECT * INTO a FROM public.assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assessment_not_found');
  END IF;

  DELETE FROM public.protocols WHERE assessment_id = p_assessment_id;

  INSERT INTO public.protocols (assessment_id, user_id, exercise_id, joint_key, priority_rank)
  SELECT p_assessment_id, a.user_id, x.exercise_id, x.joint_key, x.priority_rank
  FROM (
    WITH joint_defs AS (
      SELECT * FROM (VALUES
        ('hip_er', 'hip_er_l', 'hip_er_r', NULL::text, 40::numeric),
        ('hip_ir', 'hip_ir_l', 'hip_ir_r', NULL, 30),
        ('hip_abd', 'hip_abd_l', 'hip_abd_r', NULL, 40),
        ('hip_flex', 'hip_flex_l', 'hip_flex_r', NULL, 100),
        ('shoulder_er', 'shoulder_er_l', 'shoulder_er_r', NULL, 60),
        ('shoulder_flex', 'shoulder_flex_l', 'shoulder_flex_r', NULL, 140),
        ('ankle_df', 'ankle_df_l', 'ankle_df_r', NULL, 10),
        ('lumbar_flex', NULL, NULL, 'lumbar_flex', 40),
        ('lumbar_ext', NULL, NULL, 'lumbar_ext', 20),
        ('cervical_rot', 'cervical_rot_l', 'cervical_rot_r', NULL, 70)
      ) AS t(key, left_key, right_key, single_key, normal_min)
    ),
    scored AS (
      SELECT d.key,
        CASE WHEN d.left_key IS NOT NULL AND d.right_key IS NOT NULL
             AND (to_jsonb(a)->>d.left_key) IS NOT NULL AND (to_jsonb(a)->>d.right_key) IS NOT NULL
          THEN abs((to_jsonb(a)->>d.left_key)::numeric - (to_jsonb(a)->>d.right_key)::numeric) ELSE 0 END AS asymmetry,
        CASE
          WHEN d.left_key IS NOT NULL AND d.right_key IS NOT NULL
               AND (to_jsonb(a)->>d.left_key) IS NOT NULL AND (to_jsonb(a)->>d.right_key) IS NOT NULL
            THEN GREATEST(0, d.normal_min - LEAST((to_jsonb(a)->>d.left_key)::numeric, (to_jsonb(a)->>d.right_key)::numeric))
          WHEN d.single_key IS NOT NULL AND (to_jsonb(a)->>d.single_key) IS NOT NULL
            THEN GREATEST(0, d.normal_min - (to_jsonb(a)->>d.single_key)::numeric)
          ELSE 0 END AS severity,
        CASE
          WHEN d.left_key IS NOT NULL AND ((to_jsonb(a)->>d.left_key) IS NOT NULL OR (to_jsonb(a)->>d.right_key) IS NOT NULL) THEN true
          WHEN d.single_key IS NOT NULL AND (to_jsonb(a)->>d.single_key) IS NOT NULL THEN true
          ELSE false END AS has_data
      FROM joint_defs d
    ),
    ranked AS (
      SELECT key, row_number() OVER (ORDER BY asymmetry DESC, severity DESC)::int AS rank
      FROM scored WHERE has_data
      ORDER BY asymmetry DESC, severity DESC
      LIMIT 3
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

  RETURN jsonb_build_object('ok', true, 'written', v_written, 'joints', to_jsonb(v_joints));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.persist_protocols_for_assessment(uuid) TO service_role;
