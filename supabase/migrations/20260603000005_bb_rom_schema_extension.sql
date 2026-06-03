-- PR #6 Migration A: Bodybuilding ROM dimension extension
-- Adds 13 nullable ROM columns to techniques table to support BB exercise library
-- All existing BJJ rows remain unaffected (NULL = "not measured for this technique")
--
-- Sources:
-- - Quads, Hams/Glutes, Calves, Chest, Back, Shoulders, Biceps, Triceps, Core, Forearms
--   ROM Hierarchy research (10 muscle-group libraries)

ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS knee_flex_min            numeric NULL,
  ADD COLUMN IF NOT EXISTS hip_ext_min              numeric NULL,
  ADD COLUMN IF NOT EXISTS hip_add_min              numeric NULL,
  ADD COLUMN IF NOT EXISTS thoracic_ext_min         numeric NULL,
  ADD COLUMN IF NOT EXISTS shoulder_horiz_abd_min   numeric NULL,
  ADD COLUMN IF NOT EXISTS shoulder_add_min         numeric NULL,
  ADD COLUMN IF NOT EXISTS shoulder_ir_min          numeric NULL,
  ADD COLUMN IF NOT EXISTS shoulder_ext_min         numeric NULL,
  ADD COLUMN IF NOT EXISTS elbow_flex_min           numeric NULL,
  ADD COLUMN IF NOT EXISTS forearm_sup_min          numeric NULL,
  ADD COLUMN IF NOT EXISTS forearm_pron_min         numeric NULL,
  ADD COLUMN IF NOT EXISTS wrist_flex_min           numeric NULL,
  ADD COLUMN IF NOT EXISTS wrist_ext_min            numeric NULL;

COMMENT ON COLUMN public.techniques.knee_flex_min IS 'Minimum knee flexion ROM (degrees) required — critical for quads/calves/hamstrings exercises';
COMMENT ON COLUMN public.techniques.hip_ext_min IS 'Minimum hip extension ROM (degrees) — required for glute lockout';
COMMENT ON COLUMN public.techniques.hip_add_min IS 'Minimum hip adduction ROM (degrees) — adductor/groin range';
COMMENT ON COLUMN public.techniques.thoracic_ext_min IS 'Minimum thoracic extension ROM (degrees) — T-spine extension';
COMMENT ON COLUMN public.techniques.shoulder_horiz_abd_min IS 'Minimum shoulder horizontal abduction ROM (degrees) — #1 chest stretch limiter';
COMMENT ON COLUMN public.techniques.shoulder_add_min IS 'Minimum shoulder adduction ROM (degrees) — medial delt full stretch';
COMMENT ON COLUMN public.techniques.shoulder_ir_min IS 'Minimum shoulder internal rotation ROM (degrees)';
COMMENT ON COLUMN public.techniques.shoulder_ext_min IS 'Minimum shoulder extension ROM (degrees) — biceps long head stretch';
COMMENT ON COLUMN public.techniques.elbow_flex_min IS 'Minimum elbow flexion ROM (degrees) — full curl depth';
COMMENT ON COLUMN public.techniques.forearm_sup_min IS 'Minimum forearm supination ROM (degrees) — biceps peak contraction';
COMMENT ON COLUMN public.techniques.forearm_pron_min IS 'Minimum forearm pronation ROM (degrees) — pronator teres';
COMMENT ON COLUMN public.techniques.wrist_flex_min IS 'Minimum wrist flexion ROM (degrees) — wrist curl';
COMMENT ON COLUMN public.techniques.wrist_ext_min IS 'Minimum wrist extension ROM (degrees) — reverse curl';
