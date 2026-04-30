-- rombot_context view — assembles user's full ROMRx profile for LLM injection
-- See full SQL in migration history (applied via Supabase MCP)
-- This file tracks the migration for CLI reproducibility

CREATE OR REPLACE VIEW public.rombot_context AS
SELECT
  u.id AS user_id, u.full_name, u.belt, u.platforms, u.portal_role, u.subscription_status,
  a.id AS latest_assessment_id, a.assessed_at, a.rom_total, a.rom_percentile,
  a.worst_joints, a.red_flag_triggered, a.red_flag_reasons,
  (SELECT jsonb_agg(jsonb_build_object('joint',js.joint_key,'score',js.score,'left',js.left_value,'right',js.right_value,'asymmetry_pct',js.asymmetry_pct,'flag',js.asymmetry_flag) ORDER BY js.joint_key) FROM public.joint_scores js WHERE js.assessment_id = a.id) AS joint_scores,
  (SELECT jsonb_build_object('green',COUNT(*) FILTER (WHERE te.tier='GREEN'),'yellow',COUNT(*) FILTER (WHERE te.tier='YELLOW'),'red',COUNT(*) FILTER (WHERE te.tier='RED')) FROM public.technique_eligibility te WHERE te.user_id = u.id AND te.assessment_id = a.id) AS technique_summary,
  (SELECT jsonb_agg(jsonb_build_object('name',t.name,'belt',t.belt,'category',t.category,'limiting_joints',te.limiting_joints)) FROM public.technique_eligibility te JOIN public.techniques t ON t.id = te.technique_id WHERE te.user_id = u.id AND te.assessment_id = a.id AND te.tier = 'RED' LIMIT 10) AS red_techniques,
  (SELECT jsonb_agg(jsonb_build_object('joint',p.joint_key,'rank',p.priority_rank,'exercise',e.name,'type',e.exercise_type,'sets',e.sets,'reps',e.reps,'cue',e.coaching_cue) ORDER BY p.priority_rank) FROM public.protocols p JOIN public.exercises e ON e.id = p.exercise_id WHERE p.user_id = u.id AND p.assessment_id = a.id) AS protocol
FROM public.users u
LEFT JOIN LATERAL (SELECT * FROM public.assessments WHERE user_id = u.id ORDER BY assessed_at DESC LIMIT 1) a ON true;
