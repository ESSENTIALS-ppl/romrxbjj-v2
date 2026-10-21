-- NOT APPLIED. LOCAL DRAFT ONLY. Needs Jim's own typed OK ("run batch 1021") before any apply (prod migration, deletes saved data).
-- Lumbar saved numbers removed (Jim Oct 21 2026 7:24 PM ET via Grant). Run ONLY AFTER 20261021220000_rescore_saved.sql.
-- What it does, in one transaction:
--   (a) guard: refuses unless the rescore backup tables exist and are populated, unless every saved lumbar value is in them,
--       if any assessment would be left with no non-lumbar value (lumbar-only), or if any trigger could fire (same guard as
--       the rescore: no non-internal trigger on joint_scores / protocols; assessments triggers must be INSERT-only);
--   (b) backs up exactly what it changes into public.lumbar_null_backup_20261021_assessments (id, lumbar_flex, lumbar_ext),
--       _joint_scores and _protocols (full lumbar rows), RLS on, no grants to anon / authenticated;
--   (c) NULLs assessments.lumbar_flex / lumbar_ext (rows kept), deletes lumbar rows from joint_scores and protocols.
-- There are no ranking tables (protocol_joint_ranking is a function; 20261021215000 already excludes lumbar).
-- technique_eligibility is not touched (no technique has a lumbar minimum in the seeds).
-- No emails / notifications: UPDATE / DELETE only on tables the guard proves have no firing trigger.
-- Rollback: 20261021223000_lumbar_null_saved.rollback.sql.txt (run FIRST, before the rescore rollback).

DO $guard$
DECLARE v_bad text; v_n int;
BEGIN
  IF to_regclass('public.rescore_backup_20261021_assessments') IS NULL
     OR to_regclass('public.rescore_backup_20261021_joint_scores') IS NULL
     OR to_regclass('public.rescore_backup_20261021_protocols') IS NULL THEN
    RAISE EXCEPTION 'lumbar_null: rescore backup tables missing (run 20261021220000_rescore_saved first)';
  END IF;
  IF (SELECT count(*) FROM public.rescore_backup_20261021_assessments) = 0
     OR (SELECT count(*) FROM public.rescore_backup_20261021_assessments) < (SELECT count(*) FROM public.assessments) THEN
    RAISE EXCEPTION 'lumbar_null: rescore backup not populated (or fewer rows than assessments)';
  END IF;
  -- every saved lumbar value must already be in the rescore backup, unchanged
  SELECT count(*) INTO v_n FROM public.assessments a
    LEFT JOIN public.rescore_backup_20261021_assessments b ON b.id = a.id
   WHERE (a.lumbar_flex IS NOT NULL OR a.lumbar_ext IS NOT NULL)
     AND (b.id IS NULL OR a.lumbar_flex IS DISTINCT FROM b.lumbar_flex OR a.lumbar_ext IS DISTINCT FROM b.lumbar_ext);
  IF v_n > 0 THEN RAISE EXCEPTION 'lumbar_null: % assessments have lumbar values not matching the rescore backup', v_n; END IF;
  -- lumbar-only stop: an assessment with lumbar but no other measured value would become empty
  SELECT string_agg(a.id::text, ', ') INTO v_bad FROM public.assessments a
   WHERE (a.lumbar_flex IS NOT NULL OR a.lumbar_ext IS NOT NULL)
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each_text(to_jsonb(a)) e
        WHERE e.key IN ('hip_er_l','hip_er_r','hip_ir_l','hip_ir_r','hip_abd_l','hip_abd_r','hip_flex_l','hip_flex_r',
                        'hip_ext_l','hip_ext_r','shoulder_er_l','shoulder_er_r','shoulder_flex_l','shoulder_flex_r',
                        'ankle_df_l','ankle_df_r','cervical_rot_l','cervical_rot_r','cervical_lat_l','cervical_lat_r',
                        'cervical_flex','cervical_ext','thoracic_rot_l','thoracic_rot_r','balance_l','balance_r')
          AND e.value IS NOT NULL);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'lumbar_null: refusing, lumbar-only assessments would be left empty: %', v_bad; END IF;
  SELECT string_agg(c.relname || '.' || t.tgname, ', ') INTO v_bad
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    AND (c.relname IN ('joint_scores', 'protocols')
         OR (c.relname = 'assessments' AND (t.tgtype & (8 | 16 | 32)) <> 0));  -- DELETE | UPDATE | TRUNCATE
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'lumbar_null: refusing, a trigger could fire on the rows this touches: %', v_bad; END IF;
END
$guard$;

CREATE TABLE public.lumbar_null_backup_20261021_assessments AS
  SELECT id, lumbar_flex, lumbar_ext FROM public.assessments WHERE lumbar_flex IS NOT NULL OR lumbar_ext IS NOT NULL;
CREATE TABLE public.lumbar_null_backup_20261021_joint_scores AS
  SELECT * FROM public.joint_scores WHERE joint_key IN ('lumbar_flex', 'lumbar_ext');
CREATE TABLE public.lumbar_null_backup_20261021_protocols AS
  SELECT * FROM public.protocols WHERE joint_key IN ('lumbar_flex', 'lumbar_ext');
ALTER TABLE public.lumbar_null_backup_20261021_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumbar_null_backup_20261021_joint_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumbar_null_backup_20261021_protocols ENABLE ROW LEVEL SECURITY;
DO $rev$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.lumbar_null_backup_20261021_assessments, public.lumbar_null_backup_20261021_joint_scores,
      public.lumbar_null_backup_20261021_protocols FROM anon, authenticated;
  END IF;
END $rev$;

UPDATE public.assessments SET lumbar_flex = NULL, lumbar_ext = NULL
 WHERE lumbar_flex IS NOT NULL OR lumbar_ext IS NOT NULL;
DELETE FROM public.joint_scores WHERE joint_key IN ('lumbar_flex', 'lumbar_ext');
DELETE FROM public.protocols WHERE joint_key IN ('lumbar_flex', 'lumbar_ext');
