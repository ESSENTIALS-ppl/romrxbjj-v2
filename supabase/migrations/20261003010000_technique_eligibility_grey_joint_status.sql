-- DRAFT, NOT APPLIED. Apply BEFORE deploying compute-tiers v43.
-- Adds the GREY tier (no ROM rule, or a required joint not measured) and per-joint statuses.
-- joint_status holds joint names and colors only (no thresholds, no degrees).
ALTER TABLE public.technique_eligibility DROP CONSTRAINT IF EXISTS technique_eligibility_tier_check;
ALTER TABLE public.technique_eligibility
  ADD CONSTRAINT technique_eligibility_tier_check CHECK (tier = ANY (ARRAY['GREEN','YELLOW','RED','GREY']));
ALTER TABLE public.technique_eligibility ADD COLUMN IF NOT EXISTS joint_status jsonb;
ALTER TABLE public.technique_eligibility ADD COLUMN IF NOT EXISTS status_reason text;
COMMENT ON COLUMN public.technique_eligibility.joint_status IS 'Per required joint: [{joint, status: GREEN|YELLOW|RED|GREY}]. No numbers.';
-- no_reference_range = a requirement far above the healthy average (hip rotation 50+) or an ankle degree-style number: GREY, "no reference range yet" (Legal).
ALTER TABLE public.technique_eligibility DROP CONSTRAINT IF EXISTS technique_eligibility_status_reason_check;
ALTER TABLE public.technique_eligibility
  ADD CONSTRAINT technique_eligibility_status_reason_check
  CHECK (status_reason IS NULL OR status_reason = ANY (ARRAY['no_rule','incomplete','no_reference_range']));
COMMENT ON COLUMN public.technique_eligibility.status_reason IS 'Only for tier GREY: no_rule | incomplete | no_reference_range.';
