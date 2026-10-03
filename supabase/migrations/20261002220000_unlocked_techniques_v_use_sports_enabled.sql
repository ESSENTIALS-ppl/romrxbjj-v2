-- BB Exercise Library / Program Generator empty for users whose users.active_sport is not 'bodybuilding'.
-- Cause: unlocked_techniques_v only returned sport='bodybuilding' rows when u.active_sport = 'bodybuilding'.
-- The BB site never writes active_sport (shared field), add_sport_access() does not set it, and a Base-first
-- buyer stays 'general'. So a paid BB user sees "Set your tier to unlock exercises" and Generate says
-- "No unlocked ... exercises" even with active_bb_tier set.
-- Fix: the bodybuilding branch checks ownership with sports_enabled (same field the sport sites gate on)
-- instead of active_sport. Tier filter is unchanged. general and bjj branches are unchanged.
--
-- ROLLBACK (restores the previous definition): re-run this file with the line
--   t.sport = 'bodybuilding' AND 'bodybuilding' = ANY(u.sports_enabled) AND ...
-- replaced by
--   t.sport = 'bodybuilding' AND u.active_sport = 'bodybuilding' AND ...
CREATE OR REPLACE VIEW public.unlocked_techniques_v AS
 SELECT t.id, t.code, t.name, t.belt, t.category, t.subcategory,
    t.hip_er_min, t.hip_ir_min, t.hip_abd_min, t.hip_flex_min, t.shoulder_er_min, t.ankle_df_min,
    t.lumbar_flex_min, t.thoracic_rot_min, t.notes, t.created_at, t.sport, t.shoulder_flex_min,
    t.lumbar_ext_min, t.cervical_rot_min, t.cervical_ext_min, t.knee_flex_min, t.hip_ext_min,
    t.hip_add_min, t.thoracic_ext_min, t.shoulder_horiz_abd_min, t.shoulder_add_min, t.shoulder_ir_min,
    t.shoulder_ext_min, t.elbow_flex_min, t.forearm_sup_min, t.forearm_pron_min, t.wrist_flex_min,
    t.wrist_ext_min, t.tier, t.ruleset, t.cervical_lat_min, t.cervical_flex_min, t.primary_muscle,
    t.secondary_muscles, t.stretch_emphasis, t.limiting_joint, t.rom_note
   FROM techniques t
     LEFT JOIN users u ON u.id = auth.uid()
  WHERE t.sport = 'general'::text
     OR (t.sport = 'bjj'::text AND (u.active_sport IS NULL OR u.active_sport = 'bjj'::text))
     OR (t.sport = 'bodybuilding'::text
         AND 'bodybuilding'::text = ANY (u.sports_enabled)
         AND u.active_bb_tier IS NOT NULL
         AND t.tier IS NOT NULL
         AND bb_tier_ordinal(t.tier) <= bb_tier_ordinal(u.active_bb_tier));
ALTER VIEW public.unlocked_techniques_v SET (security_invoker = on);
