-- Migration M4: Extended threshold columns for defense techniques (WS9, WD1-WD8)
-- Adds shoulder_flex_min, lumbar_ext_min, cervical_rot_min, cervical_ext_min to techniques
-- Adds flag column to technique_eligibility for DELAY_TECHNIQUE / HIGH_RISK / AT_RISK
-- Date: 2026-05-26

ALTER TABLE public.techniques
  ADD COLUMN IF NOT EXISTS shoulder_flex_min  NUMERIC,
  ADD COLUMN IF NOT EXISTS lumbar_ext_min     NUMERIC,
  ADD COLUMN IF NOT EXISTS cervical_rot_min   NUMERIC,
  ADD COLUMN IF NOT EXISTS cervical_ext_min   NUMERIC;

-- Populate from rom_thresholds
UPDATE public.techniques t SET shoulder_flex_min = sub.v
FROM (SELECT technique_code, required_value::numeric AS v FROM public.rom_thresholds WHERE joint = 'shoulder_flexion') sub
WHERE sub.technique_code = t.code AND t.shoulder_flex_min IS NULL;

UPDATE public.techniques t SET lumbar_ext_min = sub.v
FROM (SELECT technique_code, required_value::numeric AS v FROM public.rom_thresholds WHERE joint = 'lumbar_extension') sub
WHERE sub.technique_code = t.code AND t.lumbar_ext_min IS NULL;

UPDATE public.techniques t SET cervical_rot_min = sub.v
FROM (SELECT technique_code, required_value::numeric AS v FROM public.rom_thresholds WHERE joint = 'cervical_rotation') sub
WHERE sub.technique_code = t.code AND t.cervical_rot_min IS NULL;

UPDATE public.techniques t SET cervical_ext_min = sub.v
FROM (SELECT technique_code, required_value::numeric AS v FROM public.rom_thresholds WHERE joint = 'cervical_extension') sub
WHERE sub.technique_code = t.code AND t.cervical_ext_min IS NULL;

-- Add flag to technique_eligibility
ALTER TABLE public.technique_eligibility ADD COLUMN IF NOT EXISTS flag TEXT;
ALTER TABLE public.technique_eligibility DROP CONSTRAINT IF EXISTS eligibility_flag_check;
ALTER TABLE public.technique_eligibility ADD CONSTRAINT eligibility_flag_check
  CHECK (flag IN ('DELAY_TECHNIQUE','HIGH_RISK','AT_RISK') OR flag IS NULL);
