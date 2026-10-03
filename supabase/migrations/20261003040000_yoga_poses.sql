-- DRAFT, NOT APPLIED. +Yoga (Range & Breath) pose tables. Test mode only: the 'yoga' sport stays DISABLED (sport_config.is_active = false).
-- Rollback: 20261003040000_yoga_poses.rollback.sql.txt (kept as .txt so `supabase db push` never runs it).
--
-- Model (Jim): (1) list of poses, (2) ROM requirement per pose joint, (3) the user's Base ROM is applied to each pose, (4) user-level, no coach.
--   yoga_poses            one row per pose code (159 poses + 10 prop variants). Level (Settle / Steady / Flow / Open) is a shelf, never a color or rank.
--   yoga_pose_joints      one row per (pose, joint). Same idea as rom_thresholds (one row per move + joint + required_value), but the number is
--                         NULL until a NAMED teacher signs it (range_source = 'COACH-SET'). NULL = no rule = GREY "Not rated", never GREEN.
--   yoga_pose_evidence    Quinn's CSV rows as lineage (descriptive paper averages). Service role only. NEVER a gate and never drives a color.
-- Engine: the #74 rule (supabase/functions/compute-tiers/rule.ts, pure) via yoga_rule.ts: pose color = worst measured required joint;
-- a joint with no signed range, a joint Base does not measure, or no joints at all = GREY; flat 10 degrees YELLOW (ankle 2 cm).
-- Entitlement: sport_entitlements.sport has an FK to sport_config(slug), so a 'yoga' key needs a sport_config row. It is inserted with
-- is_active = false and the read policies below require is_active AND an active 'yoga' entitlement, so nothing is visible to clients.
-- Flipping it on is a separate step that needs Jim's yes. This migration never touches sport_entitlements rows or users.

BEGIN;

-- 1) sport key ('yoga'), DISABLED. Never flips an existing row.
INSERT INTO public.sport_config
  (slug, display_name, short_name, rank_field, rank_values, rank_labels, body_label, game_label, protocol_label,
   has_techniques, has_schools, has_coach_portal, theme_accent, is_active, sort_order)
VALUES
  ('yoga', 'Yoga (Range & Breath)', 'Yoga', 'level',
   ARRAY['settle','steady','flow','open'],
   '{"settle":"Settle","steady":"Steady","flow":"Flow","open":"Open"}'::jsonb,
   'My Body', 'My Poses', 'My Protocol',
   false, false, false, 'sage', false, 40)
ON CONFLICT (slug) DO NOTHING;

-- 2) poses
CREATE TABLE IF NOT EXISTS public.yoga_poses (
  code        text PRIMARY KEY,
  sport       text NOT NULL DEFAULT 'yoga' CHECK (sport = 'yoga') REFERENCES public.sport_config(slug),
  family_code text NOT NULL,
  family      text NOT NULL,
  sanskrit    text,
  english     text NOT NULL,
  variant_of  text REFERENCES public.yoga_poses(code),
  level       text CHECK (level IS NULL OR level IN ('Settle','Steady','Flow','Open')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yoga_poses_not_own_variant CHECK (variant_of IS NULL OR variant_of <> code)
);
COMMENT ON TABLE public.yoga_poses IS '+Yoga poses (Quinn CSV 2026-10-03). Test mode only. Level is coach-set pending and is never a color, rank or safety/readiness verdict. "Steady" is also a Base band word: never show it beside a color.';
CREATE INDEX IF NOT EXISTS yoga_poses_level_idx ON public.yoga_poses (level);
CREATE INDEX IF NOT EXISTS yoga_poses_family_idx ON public.yoga_poses (family_code, sort_order);
CREATE INDEX IF NOT EXISTS yoga_poses_variant_idx ON public.yoga_poses (variant_of);

-- 3) pose joint requirements (the sport matrix for yoga)
CREATE TABLE IF NOT EXISTS public.yoga_pose_joints (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pose_code      text NOT NULL REFERENCES public.yoga_poses(code) ON DELETE CASCADE,
  joint_key      text NOT NULL,                       -- Base key (hip_er ...) or 'x:<joint>:<direction>' for a joint Base cannot measure
  label          text NOT NULL,
  base_key       text CHECK (base_key IS NULL OR base_key IN
                   ('hip_er','hip_ir','hip_abd','hip_flex','shoulder_er','shoulder_flex','ankle_df','cervical_lat',
                    'lumbar_flex','lumbar_ext','cervical_flex','cervical_ext')),
  measure_status text NOT NULL CHECK (measure_status IN ('base','proxy','not_measured')),
  bilateral      boolean NOT NULL DEFAULT false,
  laterality_rule text CHECK (laterality_rule IS NULL OR laterality_rule IN ('BOTH','ANY','LEAD','HOOK','TRAIL','MIDLINE')),
  has_evidence   boolean NOT NULL DEFAULT false,
  -- The requirement. ALL of these stay NULL until a named teacher signs. The loader never writes them.
  required_value numeric,
  required_unit  text CHECK (required_unit IS NULL OR required_unit IN ('deg','cm')),
  range_source   text CHECK (range_source IS NULL OR range_source = 'COACH-SET'),
  signed_by      text,
  signed_at      timestamptz,
  -- generated, number-free flag the client may read
  has_signed_range boolean GENERATED ALWAYS AS (required_value IS NOT NULL) STORED,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yoga_pose_joints_pose_joint_key UNIQUE (pose_code, joint_key),
  CONSTRAINT yoga_pose_joints_status_key CHECK (
    (measure_status = 'not_measured' AND base_key IS NULL) OR (measure_status IN ('base','proxy') AND base_key IS NOT NULL)),
  -- no signed range => every requirement column is NULL; a number needs unit + COACH-SET + a named signer + a date
  CONSTRAINT yoga_pose_joints_signed_or_null CHECK (
    (required_value IS NULL AND required_unit IS NULL AND range_source IS NULL AND signed_by IS NULL AND signed_at IS NULL)
    OR (required_value > 0 AND required_unit IS NOT NULL AND range_source = 'COACH-SET'
        AND signed_by IS NOT NULL AND length(btrim(signed_by)) > 0 AND signed_at IS NOT NULL)),
  -- F-17: Base stores the ankle in centimeters (knee-to-wall). A degree number is never compared to it.
  CONSTRAINT yoga_pose_joints_ankle_cm CHECK (base_key IS DISTINCT FROM 'ankle_df' OR required_unit IS NULL OR required_unit = 'cm')
);
COMMENT ON TABLE public.yoga_pose_joints IS 'One row per pose and joint. required_value is NULL (GREY, Not rated) until range_source = COACH-SET with a named signer. Quinn paper averages are NOT requirements (see yoga_pose_evidence).';
CREATE INDEX IF NOT EXISTS yoga_pose_joints_pose_idx ON public.yoga_pose_joints (pose_code);
CREATE INDEX IF NOT EXISTS yoga_pose_joints_base_idx ON public.yoga_pose_joints (base_key) WHERE base_key IS NOT NULL;

-- 4) evidence lineage (descriptive paper averages; reference only)
CREATE TABLE IF NOT EXISTS public.yoga_pose_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pose_code           text NOT NULL REFERENCES public.yoga_poses(code) ON DELETE CASCADE,
  row_no              integer NOT NULL,                -- 1-based order of the pose's rows in the CSV
  joint_key           text,                            -- NULL for the "(none listed)" rows
  csv_joint           text NOT NULL,
  direction           text,
  label               text NOT NULL CHECK (label IN ('EVIDENCE','UNVERIFIED')),
  degrees_raw         text,                            -- Quinn's text as given, NULL when blank
  mean_value          numeric,                         -- parsed, paper sign convention kept; NOT a requirement
  sd_value            numeric,
  source              text,
  confidence          text,
  test_method         text,
  base_captures_joint text CHECK (base_captures_joint IN ('yes','no','unknown')),
  ankle_unit_mismatch boolean NOT NULL DEFAULT false,  -- Base ankle is cm, this row is degrees
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yoga_pose_evidence_pose_row_key UNIQUE (pose_code, row_no)
);
COMMENT ON TABLE public.yoga_pose_evidence IS 'Quinn CSV rows. Descriptive averages from trained practitioners, never a minimum and never a gate (Stacy section 10). Service role only.';

-- updated_at triggers (same helper the sport tables use)
DROP TRIGGER IF EXISTS yoga_poses_set_updated_at ON public.yoga_poses;
CREATE TRIGGER yoga_poses_set_updated_at BEFORE UPDATE ON public.yoga_poses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS yoga_pose_joints_set_updated_at ON public.yoga_pose_joints;
CREATE TRIGGER yoga_pose_joints_set_updated_at BEFORE UPDATE ON public.yoga_pose_joints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) RLS: same shape as the sport tables (read for signed-in users, writes service role only) plus the DISABLED gate.
ALTER TABLE public.yoga_poses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoga_pose_joints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoga_pose_evidence ENABLE ROW LEVEL SECURITY;

-- true only when the yoga sport is switched on AND the caller holds an active yoga pack. Both are false today.
CREATE OR REPLACE FUNCTION public.yoga_pack_visible()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.sport_config sc WHERE sc.slug = 'yoga' AND sc.is_active)
     AND EXISTS (SELECT 1 FROM public.sport_entitlements se
                  WHERE se.user_id = (SELECT auth.uid()) AND se.sport = 'yoga' AND se.status = 'active');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.yoga_pack_visible() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.yoga_pack_visible() TO authenticated, service_role;

DROP POLICY IF EXISTS yoga_poses_read        ON public.yoga_poses;
DROP POLICY IF EXISTS yoga_poses_write_service ON public.yoga_poses;
CREATE POLICY yoga_poses_read ON public.yoga_poses FOR SELECT TO authenticated USING (public.yoga_pack_visible());
CREATE POLICY yoga_poses_write_service ON public.yoga_poses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS yoga_pose_joints_read        ON public.yoga_pose_joints;
DROP POLICY IF EXISTS yoga_pose_joints_write_service ON public.yoga_pose_joints;
CREATE POLICY yoga_pose_joints_read ON public.yoga_pose_joints FOR SELECT TO authenticated USING (public.yoga_pack_visible());
CREATE POLICY yoga_pose_joints_write_service ON public.yoga_pose_joints FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS yoga_pose_evidence_service_only ON public.yoga_pose_evidence;
CREATE POLICY yoga_pose_evidence_service_only ON public.yoga_pose_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Range numbers never reach a browser (Stacy: hidden in v1; Strategy Guide 8.2). Clients get column-level SELECT without the requirement
-- columns; only the service role (compute-tiers) can read required_value. Evidence has no client access at all.
REVOKE ALL ON public.yoga_poses, public.yoga_pose_joints, public.yoga_pose_evidence FROM anon, authenticated;
GRANT SELECT ON public.yoga_poses TO authenticated;
GRANT SELECT (id, pose_code, joint_key, label, base_key, measure_status, bilateral, laterality_rule, has_evidence, has_signed_range)
  ON public.yoga_pose_joints TO authenticated;
GRANT ALL ON public.yoga_poses, public.yoga_pose_joints, public.yoga_pose_evidence TO service_role;

COMMIT;
