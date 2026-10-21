-- NOT APPLIED. LOCAL DRAFT ONLY. Needs Jim's own typed OK before any apply (prod migration, rewrites saved scores).
-- Saved-score rescore (Jim decision Oct 21 2026 4:49 PM ET via Grant). Run ONLY AFTER 20261021203000_range_reset_pooled.sql
-- and 20261021210000_t1_rebased.sql (guard below refuses otherwise).
-- What it does, in one transaction:
--   (a) backs up every saved assessment row, every joint_scores row and every protocols row, all columns, into
--       public.rescore_backup_20261021_assessments / _joint_scores / _protocols (RLS on, no grants to anon/authenticated);
--   (b) recomputes for every assessment: worst_joints + rom_total (SQL mirror of compute-tiers v42 joint_totals.ts,
--       T1 weighted gap with the previous assessment of the same user), then public.compute_joint_scores(id), then
--       public.persist_protocols_for_assessment(id) (which uses protocol_joint_ranking).
--   technique_eligibility is NOT touched: it uses techniques.*_min, which the reset did not change.
-- No emails / notifications: the guard proves, inside the txn, that no non-internal trigger exists on joint_scores or
--   protocols and that every trigger on assessments fires on INSERT only (this migration only UPDATEs assessments).
--   The assessments INSERT webhook (compute-tiers http_request) and zz_pe_assessment_inserted therefore never fire.
--   No pg_net / http call, no edge invocation, no email_sends / notification rows are written here.
-- Rollback: 20261021220000_rescore_saved.rollback.sql.txt (restores the backup rows exactly).
-- Export the backup before and after apply: scripts/rescore_backup_export_20261021.sh.
-- Backup tables rescore_backup_20261021_* and lumbar_null_backup_20261021_* must be dropped by Thu Nov 5, 2026 (Stacy condition A), after any export Jim wants; log it in the SSOT.

DO $guard$
DECLARE v_bad text;
BEGIN
  IF position('t1_joint_band' in pg_get_functiondef('public.compute_joint_scores(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'rescore: T1 rebased compute_joint_scores not applied (run 20261021203000 then 20261021210000 first)';
  END IF;
  IF position('''hip_er'',''hip_er_l'',''hip_er_r'',23' in pg_get_functiondef('public.compute_joint_scores(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'rescore: range reset targets not present in compute_joint_scores';
  END IF;
  SELECT string_agg(c.relname || '.' || t.tgname, ', ') INTO v_bad
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    AND (c.relname IN ('joint_scores', 'protocols')
         OR (c.relname = 'assessments' AND (t.tgtype & (8 | 16 | 32)) <> 0));  -- DELETE | UPDATE | TRUNCATE
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'rescore: refusing, a trigger could fire on the rows this touches: %', v_bad;
  END IF;
END
$guard$;

CREATE TABLE public.rescore_backup_20261021_assessments AS SELECT * FROM public.assessments;
CREATE TABLE public.rescore_backup_20261021_joint_scores AS SELECT * FROM public.joint_scores;
CREATE TABLE public.rescore_backup_20261021_protocols AS SELECT * FROM public.protocols;
ALTER TABLE public.rescore_backup_20261021_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescore_backup_20261021_joint_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescore_backup_20261021_protocols ENABLE ROW LEVEL SECURITY;
DO $rev$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.rescore_backup_20261021_assessments, public.rescore_backup_20261021_joint_scores,
      public.rescore_backup_20261021_protocols FROM anon, authenticated;
  END IF;
END $rev$;

-- Needs 20261021215000_lumbar_never_ranked applied first. SQL mirror of compute-tiers v42 (JOINT_TARGETS order + joint_totals.ts worstJointKeys / romTotal). Temporary, dropped below.
CREATE FUNCTION public.rescore_20261021_totals(p_id uuid, OUT worst text[], OUT total integer)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $fn$
  WITH a AS (SELECT to_jsonb(x) j, x.user_id, x.created_at FROM public.assessments x WHERE x.id = p_id),
  prev AS (
    SELECT to_jsonb(p) j FROM public.assessments p, a
    WHERE a.user_id IS NOT NULL AND p.user_id = a.user_id AND p.created_at < a.created_at
    ORDER BY p.created_at DESC LIMIT 1
  ),
  t(ord, key, target) AS (VALUES
    (1,'hip_er_l',23::numeric),(2,'hip_er_r',23),(3,'hip_ir_l',24),(4,'hip_ir_r',24),(5,'hip_abd_l',40),(6,'hip_abd_r',40),
    (7,'hip_flex_l',120),(8,'hip_flex_r',120),(9,'hip_ext_l',30),(10,'hip_ext_r',30),(11,'shoulder_er_l',85),(12,'shoulder_er_r',85),
    (13,'shoulder_flex_l',141),(14,'shoulder_flex_r',141),(15,'ankle_df_l',6.1),(16,'ankle_df_r',6.1),
    (17,'cervical_rot_l',70),(18,'cervical_rot_r',70),(19,'cervical_lat_l',37),(20,'cervical_lat_r',37),
    (21,'cervical_flex',39),(22,'cervical_ext',48),(23,'thoracic_rot_l',45),(24,'thoracic_rot_r',45),
    (25,'lumbar_flex',60),(26,'lumbar_ext',25),(27,'balance_l',30),(28,'balance_r',30)
  ),
  v AS (
    SELECT t.ord, t.key, t.target, (a.j ->> t.key)::numeric AS val, ((SELECT j FROM prev) ->> t.key)::numeric AS pval
    FROM t, a
    WHERE regexp_replace(t.key, '_(l|r)$', '') <> 'hip_flex'   -- HIP_FLEX_UNSCORED
  ),
  m AS (SELECT * FROM v WHERE val IS NOT NULL)
  SELECT
    coalesce((SELECT array_agg(key ORDER BY g DESC, ord) FROM (
      SELECT key, ord, public.t1_weighted_gap(key, val, target, pval) g FROM m
      WHERE key NOT IN ('lumbar_flex', 'lumbar_ext')   -- lumbar never ranked (Grant Oct 21 7:10 PM; mirrors worstJointKeys); rom_total also skips it (Grant 7:20 PM)
      ORDER BY g DESC, ord LIMIT 5) s), ARRAY[]::text[]),
    coalesce((SELECT round(avg(least(1, greatest(0, val / target)) * 100))::int FROM m
      WHERE key NOT IN ('lumbar_flex', 'lumbar_ext')), 0);   -- Grant Oct 21 2026 7:20 PM: lumbar out of the overall (rom_total; mirrors romTotal)
$fn$;

DO $rescore$
DECLARE r record; v_n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.assessments ORDER BY created_at, id LOOP
    UPDATE public.assessments a SET worst_joints = s.worst, rom_total = s.total
      FROM public.rescore_20261021_totals(r.id) s WHERE a.id = r.id;
    PERFORM public.compute_joint_scores(r.id);
    PERFORM public.persist_protocols_for_assessment(r.id);
    v_n := v_n + 1;
  END LOOP;
  RAISE NOTICE 'rescore_20261021: % assessments rescored', v_n;
END
$rescore$;

DROP FUNCTION public.rescore_20261021_totals(uuid);
