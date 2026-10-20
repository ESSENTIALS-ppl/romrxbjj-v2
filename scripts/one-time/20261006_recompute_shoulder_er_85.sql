-- =====================================================================================================================
-- ONE-TIME RECOMPUTE: shoulder ER Steady target 40 -> 85 (Oct 6 2026, 8:19 PM; Jim-approved, Quinn spec). Base shoulder ER is
-- the STANDING goal-post test again. Only shoulder_er changes; every other target stays as set by 20261006153000.
-- NOT a migration on purpose (lives outside supabase/migrations so `supabase db push` never runs it). Run it deliberately,
-- AFTER 20261006203000_shoulder_er_target_85.sql is applied and compute-tiers v40 is deployed.
--
-- What it rewrites (derived data only):
--   1. public.joint_scores.score for joint_key shoulder_er, same rule as compute_joint_scores()
--      (worse side / 85: >= 1.00 -> 3 Steady, >= 0.90 -> 2 Building, else 1 Needs focus).
--   2. public.assessments.worst_joints + rom_total, same rule as compute-tiers v40 joint_totals.ts (all JOINT_TARGETS, shoulder 85).
--   3. public.protocols where the saved protocol no longer matches protocol_joint_ranking() (persist_protocols_for_assessment).
-- What it NEVER touches: the measured angles (checked below; the run aborts if they change), techniques.*_min,
-- technique_eligibility, users, leads, emails. No trigger fires (assessments triggers are AFTER INSERT only). Nothing sends email.
-- Saved shoulder ER angles are re-scored AS STORED. Every saved shoulder ER reading on Oct 6 20:30 ET predates the tucked-elbow
-- step (all were goal-post readings); nothing was saved with the "Shoulder Extension" step (0 assessments after 16:59 UTC).
--
-- Test fixtures: skipped by default (public.is_test_account(email)); set include_test_fixtures := true in B1 to include them.
-- Idempotent: a second run changes nothing; the backup keeps the FIRST old value.
-- Rollback: section C (after restoring the old functions and compute-tiers v39 source).
-- =====================================================================================================================


-- ---------------------------------------------------------------------------------------------------------------------
-- A. DRY RUN (read-only, SELECT only). Safe on prod at any time. Same numbers whether or not the migration is applied.
-- ---------------------------------------------------------------------------------------------------------------------
WITH a AS (
  SELECT x.id, x.user_id, x.shoulder_er_l l, x.shoulder_er_r r,
         coalesce(public.is_test_account(u.email), false) AS is_test,
         row_number() OVER (PARTITION BY x.user_id ORDER BY x.assessed_at DESC NULLS LAST, x.created_at DESC NULLS LAST) = 1 AS is_latest
  FROM public.assessments x LEFT JOIN public.users u ON u.id = x.user_id),
s AS (SELECT a.*, CASE WHEN l IS NOT NULL AND r IS NOT NULL THEN least(l, r) ELSE coalesce(l, r) END worse FROM a),
sc AS (
  SELECT s.*,
    CASE WHEN worse/40 >= 1.0 THEN 3 WHEN worse/40 >= 0.90 THEN 2 ELSE 1 END AS old_score,
    CASE WHEN worse/85 >= 1.0 THEN 3 WHEN worse/85 >= 0.90 THEN 2 ELSE 1 END AS new_score,
    js.score AS stored
  FROM s LEFT JOIN public.joint_scores js ON js.assessment_id = s.id AND js.joint_key = 'shoulder_er'
  WHERE worse IS NOT NULL),
f AS (SELECT sc.*, coalesce(stored, old_score) AS cur FROM sc)
SELECT is_test,
  count(*) measured,
  count(*) FILTER (WHERE stored IS NULL) no_row,
  count(*) FILTER (WHERE stored IS NOT NULL AND stored <> old_score) stored_ne_old_formula,
  count(*) FILTER (WHERE new_score <> cur) score_changes,
  count(*) FILTER (WHERE new_score < cur) score_drops,
  count(*) FILTER (WHERE cur = 3 AND new_score < 3) steady_to_not_steady,
  count(DISTINCT user_id) FILTER (WHERE new_score <> cur) users_changed,
  count(*) FILTER (WHERE is_latest AND new_score <> cur) latest_changes
FROM f GROUP BY is_test ORDER BY is_test;

-- A2. worst_joints / rom_total (compute-tiers joint_totals.ts mirror, v39 targets vs v40 targets). Read-only.
--     worst_matches_old_mirror proves the SQL mirror reproduces what compute-tiers / the Oct 6 recompute saved.
WITH jt(ord, key, old_t, new_t) AS (VALUES
  (1,'hip_er_l',29::numeric,29::numeric),(2,'hip_er_r',29,29),(3,'hip_ir_l',26,26),(4,'hip_ir_r',26,26),
  (5,'hip_abd_l',40,40),(6,'hip_abd_r',40,40),
  (9,'hip_ext_l',30,30),(10,'hip_ext_r',30,30),(11,'shoulder_er_l',40,85),(12,'shoulder_er_r',40,85),
  (13,'shoulder_flex_l',140,140),(14,'shoulder_flex_r',140,140),(15,'ankle_df_l',6,6),(16,'ankle_df_r',6,6),
  (17,'cervical_rot_l',70,70),(18,'cervical_rot_r',70,70),(19,'cervical_lat_l',38,38),(20,'cervical_lat_r',38,38),
  (21,'cervical_flex',50,50),(22,'cervical_ext',60,60),(23,'thoracic_rot_l',45,45),(24,'thoracic_rot_r',45,45),
  (25,'lumbar_flex',60,60),(26,'lumbar_ext',25,25),(27,'balance_l',30,30),(28,'balance_r',30,30)),
a AS (
  SELECT x.id, x.worst_joints, x.rom_total, to_jsonb(x) j, coalesce(public.is_test_account(u.email), false) is_test
  FROM public.assessments x LEFT JOIN public.users u ON u.id = x.user_id),
v AS (SELECT a.id, jt.ord, jt.key, (a.j->>jt.key)::numeric val, jt.old_t, jt.new_t FROM a CROSS JOIN jt WHERE (a.j->>jt.key) IS NOT NULL),
p AS (SELECT id, ord, key, greatest(0, least(1, val/old_t)) po, greatest(0, least(1, val/new_t)) pn FROM v),
agg AS (
  SELECT id, (array_agg(key ORDER BY po, ord))[1:5] worst_old, (array_agg(key ORDER BY pn, ord))[1:5] worst_new,
         round(avg(po*100))::int rom_old, round(avg(pn*100))::int rom_new
  FROM p GROUP BY id)
SELECT a.is_test, count(*) assessments,
  count(*) FILTER (WHERE a.worst_joints = agg.worst_old) worst_matches_old_mirror,
  count(*) FILTER (WHERE agg.worst_new IS DISTINCT FROM a.worst_joints) worst_changes,
  count(*) FILTER (WHERE agg.rom_new IS DISTINCT FROM a.rom_total) rom_changes
FROM a LEFT JOIN agg ON agg.id = a.id
GROUP BY a.is_test ORDER BY a.is_test;


-- ---------------------------------------------------------------------------------------------------------------------
-- B. APPLY (one transaction). Needs Jim's yes. Run as the postgres / service role. Rehearse with ROLLBACK instead of COMMIT.
-- ---------------------------------------------------------------------------------------------------------------------
BEGIN;

-- B0. Guard: both functions must already carry 85 (apply 20261006203000_shoulder_er_target_85.sql first).
DO $guard$
BEGIN
  IF position('(''shoulder_er'',''shoulder_er_l'',''shoulder_er_r'',85)' IN pg_get_functiondef('public.compute_joint_scores(uuid)'::regprocedure)) = 0
     OR position('(5, ''shoulder_er'', ''shoulder_er_l'', ''shoulder_er_r'', NULL, 85, 85)' IN pg_get_functiondef('public.protocol_joint_ranking(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'shoulder_er target 85 is not live yet: apply 20261006203000_shoulder_er_target_85.sql first';
  END IF;
END
$guard$;

-- B1. Scope. include_test_fixtures: false = skip public.is_test_account() users (default).
CREATE TEMP TABLE _ser_scope ON COMMIT DROP AS
WITH cfg AS (SELECT false AS include_test_fixtures)
SELECT x.id AS assessment_id
FROM public.assessments x LEFT JOIN public.users u ON u.id = x.user_id CROSS JOIN cfg
WHERE (x.shoulder_er_l IS NOT NULL OR x.shoulder_er_r IS NOT NULL)
  AND (cfg.include_test_fixtures OR NOT coalesce(public.is_test_account(u.email), false));

-- B2. Fingerprint of every measured angle in scope (must be identical at the end).
CREATE TEMP TABLE _ser_fp ON COMMIT DROP AS
SELECT md5(string_agg((to_jsonb(x) - 'worst_joints' - 'rom_total')::text, '|' ORDER BY x.id)) AS fp
FROM public.assessments x JOIN _ser_scope s ON s.assessment_id = x.id;

-- B3. Backup table (service-only: RLS on, no policies, no grants to anon/authenticated). Keeps the FIRST old value.
CREATE TABLE IF NOT EXISTS public._recompute_shoulder_er_85_20261006_backup (
  assessment_id uuid NOT NULL,
  item text NOT NULL,                 -- 'joint_score:shoulder_er' | 'totals'
  old_score smallint, new_score smallint,
  old_worst_joints text[], new_worst_joints text[],
  old_rom_total integer, new_rom_total integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, item));
ALTER TABLE public._recompute_shoulder_er_85_20261006_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._recompute_shoulder_er_85_20261006_backup FROM PUBLIC;
DO $rv$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public._recompute_shoulder_er_85_20261006_backup FROM anon, authenticated';
  END IF;
END $rv$;

-- B4. New shoulder_er joint scores (same CASE as compute_joint_scores, target 85).
CREATE TEMP TABLE _ser_new ON COMMIT DROP AS
WITH w AS (
  SELECT s.assessment_id,
         CASE WHEN x.shoulder_er_l IS NOT NULL AND x.shoulder_er_r IS NOT NULL THEN least(x.shoulder_er_l, x.shoulder_er_r)
              ELSE coalesce(x.shoulder_er_l, x.shoulder_er_r) END::numeric AS worse
  FROM _ser_scope s JOIN public.assessments x ON x.id = s.assessment_id)
SELECT w.assessment_id, 'shoulder_er'::text AS joint_key,
       (CASE WHEN worse/85 >= 1.0 THEN 3 WHEN worse/85 >= 0.90 THEN 2 ELSE 1 END)::smallint AS new_score,
       js.score AS old_score, (js.assessment_id IS NULL) AS missing_row
FROM w LEFT JOIN public.joint_scores js ON js.assessment_id = w.assessment_id AND js.joint_key = 'shoulder_er'
WHERE w.worse IS NOT NULL;

INSERT INTO public._recompute_shoulder_er_85_20261006_backup (assessment_id, item, old_score, new_score)
SELECT assessment_id, 'joint_score:shoulder_er', old_score, new_score
FROM _ser_new WHERE NOT missing_row AND old_score IS DISTINCT FROM new_score
ON CONFLICT (assessment_id, item) DO NOTHING;

UPDATE public.joint_scores js SET score = n.new_score
FROM _ser_new n
WHERE js.assessment_id = n.assessment_id AND js.joint_key = 'shoulder_er' AND js.score IS DISTINCT FROM n.new_score;

-- Missing shoulder_er rows (none on prod at the Oct 6 20:30 ET dry run): let the (new) function write them.
SELECT public.compute_joint_scores(assessment_id) FROM (SELECT DISTINCT assessment_id FROM _ser_new WHERE missing_row) m;

-- B5. worst_joints + rom_total (compute-tiers v40 joint_totals.ts mirror; hip_flex unscored; same key order as JOINT_TARGETS).
CREATE TEMP TABLE _ser_totals ON COMMIT DROP AS
WITH jt(ord, key, t) AS (VALUES
  (1,'hip_er_l',29::numeric),(2,'hip_er_r',29),(3,'hip_ir_l',26),(4,'hip_ir_r',26),(5,'hip_abd_l',40),(6,'hip_abd_r',40),
  (9,'hip_ext_l',30),(10,'hip_ext_r',30),(11,'shoulder_er_l',85),(12,'shoulder_er_r',85),
  (13,'shoulder_flex_l',140),(14,'shoulder_flex_r',140),(15,'ankle_df_l',6),(16,'ankle_df_r',6),
  (17,'cervical_rot_l',70),(18,'cervical_rot_r',70),(19,'cervical_lat_l',38),(20,'cervical_lat_r',38),
  (21,'cervical_flex',50),(22,'cervical_ext',60),(23,'thoracic_rot_l',45),(24,'thoracic_rot_r',45),
  (25,'lumbar_flex',60),(26,'lumbar_ext',25),(27,'balance_l',30),(28,'balance_r',30)),
p AS (
  SELECT s.assessment_id, jt.ord, jt.key, greatest(0, least(1, (to_jsonb(x)->>jt.key)::numeric / jt.t)) AS pct
  FROM _ser_scope s JOIN public.assessments x ON x.id = s.assessment_id CROSS JOIN jt
  WHERE (to_jsonb(x)->>jt.key) IS NOT NULL),
agg AS (
  SELECT assessment_id, (array_agg(key ORDER BY pct, ord))[1:5] AS new_worst, round(avg(pct * 100))::int AS new_rom
  FROM p GROUP BY assessment_id)
SELECT g.assessment_id, x.worst_joints AS old_worst, g.new_worst, x.rom_total AS old_rom, g.new_rom
FROM agg g JOIN public.assessments x ON x.id = g.assessment_id
WHERE x.worst_joints IS DISTINCT FROM g.new_worst OR x.rom_total IS DISTINCT FROM g.new_rom;

INSERT INTO public._recompute_shoulder_er_85_20261006_backup (assessment_id, item, old_worst_joints, new_worst_joints, old_rom_total, new_rom_total)
SELECT assessment_id, 'totals', old_worst, new_worst, old_rom, new_rom FROM _ser_totals
ON CONFLICT (assessment_id, item) DO NOTHING;

UPDATE public.assessments x SET worst_joints = t.new_worst, rom_total = t.new_rom
FROM _ser_totals t WHERE x.id = t.assessment_id;

-- B6. Re-save the protocol wherever the saved one no longer matches protocol_joint_ranking() (what compute-tiers does).
CREATE TEMP TABLE _ser_proto ON COMMIT DROP AS
SELECT s.assessment_id FROM _ser_scope s
WHERE (SELECT coalesce(array_agg(DISTINCT p.joint_key || ':' || p.priority_rank ORDER BY p.joint_key || ':' || p.priority_rank), '{}')
       FROM public.protocols p WHERE p.assessment_id = s.assessment_id)
   IS DISTINCT FROM
      (SELECT coalesce(array_agg(r.joint_key || ':' || r.priority_rank ORDER BY r.joint_key || ':' || r.priority_rank), '{}')
       FROM public.protocol_joint_ranking(s.assessment_id) r);
SELECT public.persist_protocols_for_assessment(assessment_id) FROM _ser_proto;

-- B7. Measured angles untouched, or abort.
DO $fp$
BEGIN
  IF (SELECT fp FROM _ser_fp) IS DISTINCT FROM (
      SELECT md5(string_agg((to_jsonb(x) - 'worst_joints' - 'rom_total')::text, '|' ORDER BY x.id))
      FROM public.assessments x JOIN _ser_scope s ON s.assessment_id = x.id) THEN
    RAISE EXCEPTION 'measured angles changed during the recompute: aborting';
  END IF;
END
$fp$;

-- B8. Summary (inspect before COMMIT; ROLLBACK instead if anything looks wrong).
SELECT
  (SELECT count(*) FROM _ser_scope) AS assessments_in_scope,
  (SELECT count(*) FROM _ser_new WHERE old_score IS DISTINCT FROM new_score) AS joint_scores_changed,
  (SELECT count(*) FROM _ser_new WHERE coalesce(old_score, 0) = 3 AND new_score < 3) AS steady_to_not_steady,
  (SELECT count(*) FROM _ser_totals WHERE old_worst IS DISTINCT FROM new_worst) AS worst_joints_changed,
  (SELECT count(*) FROM _ser_totals WHERE old_rom IS DISTINCT FROM new_rom) AS rom_total_changed,
  (SELECT count(*) FROM _ser_proto) AS protocols_resaved;

COMMIT;


-- ---------------------------------------------------------------------------------------------------------------------
-- C. ROLLBACK (only if the 85 target is reverted). First restore the old functions
--    (supabase/migrations/20261006203000_shoulder_er_target_85.rollback.sql.txt) and the compute-tiers v39 source, then run this block.
-- ---------------------------------------------------------------------------------------------------------------------
-- BEGIN;
-- UPDATE public.joint_scores js SET score = b.old_score
-- FROM public._recompute_shoulder_er_85_20261006_backup b
-- WHERE b.item = 'joint_score:shoulder_er' AND js.assessment_id = b.assessment_id AND js.joint_key = 'shoulder_er';
-- UPDATE public.assessments x SET worst_joints = b.old_worst_joints, rom_total = b.old_rom_total
-- FROM public._recompute_shoulder_er_85_20261006_backup b
-- WHERE b.item = 'totals' AND x.id = b.assessment_id;
-- SELECT public.persist_protocols_for_assessment(x.id)
-- FROM public.assessments x
-- WHERE x.id IN (SELECT DISTINCT assessment_id FROM public._recompute_shoulder_er_85_20261006_backup)
--   AND (SELECT coalesce(array_agg(DISTINCT p.joint_key || ':' || p.priority_rank ORDER BY p.joint_key || ':' || p.priority_rank), '{}')
--        FROM public.protocols p WHERE p.assessment_id = x.id)
--       IS DISTINCT FROM
--       (SELECT coalesce(array_agg(r.joint_key || ':' || r.priority_rank ORDER BY r.joint_key || ':' || r.priority_rank), '{}')
--        FROM public.protocol_joint_ranking(x.id) r);
-- COMMIT;
-- (Then, once nobody needs it: DROP TABLE public._recompute_shoulder_er_85_20261006_backup;)
