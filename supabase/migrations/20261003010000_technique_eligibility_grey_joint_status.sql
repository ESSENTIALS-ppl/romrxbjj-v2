-- DRAFT, NOT APPLIED. Apply BEFORE deploying compute-tiers v43.
-- Adds the GREY tier (no ROM rule, or a required joint not measured) and per-joint statuses.
-- joint_status holds joint names and colors only (no thresholds, no degrees).
ALTER TABLE public.technique_eligibility DROP CONSTRAINT IF EXISTS technique_eligibility_tier_check;
ALTER TABLE public.technique_eligibility
  ADD CONSTRAINT technique_eligibility_tier_check CHECK (tier = ANY (ARRAY['GREEN','YELLOW','RED','GREY']));
ALTER TABLE public.technique_eligibility ADD COLUMN IF NOT EXISTS joint_status jsonb;
ALTER TABLE public.technique_eligibility ADD COLUMN IF NOT EXISTS status_reason text;
COMMENT ON COLUMN public.technique_eligibility.joint_status IS 'Per required joint: [{joint, status: GREEN|YELLOW|RED|GREY}]. No numbers.';
COMMENT ON COLUMN public.technique_eligibility.status_reason IS 'Only for tier GREY: no_rule | incomplete.';
