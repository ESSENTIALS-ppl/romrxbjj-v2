-- =====================================================================================================================
-- ONE-TIME RECOMPUTE: Steady targets (Jim decisions, Oct 6 2026): hip_er 45 -> 29, hip_ir 45 -> 26, hip_abd 90 -> 40,
-- shoulder_flex 180 -> 140, ankle_df 20 -> 6 cm, cervical_rot 80 -> 70, cervical_lat 45 -> 38 (Swinkels 2014).
-- Sources: ledger/ROMRX-ASSESSMENT-STUDY-REFERENCE.md.
-- NOT a migration on purpose (lives outside supabase/migrations so `supabase db push` never runs it). Run it deliberately,
-- AFTER 20261006153000_steady_targets_hip_shoulder_ankle.sql is applied and compute-tiers v39 is deployed.
--
-- What it rewrites (derived data only):
--   1. public.joint_scores.score for joint_key hip_er / hip_ir / hip_abd / shoulder_flex / ankle_df / cervical_rot / cervical_lat, from the SAME rule as compute_joint_scores()
--      (worse side / target: >= 1.00 -> 3 Steady, >= 0.90 -> 2 Building, else 1 Needs focus).
--   2. public.assessments.worst_joints + rom_total, from the SAME rule as compute-tiers joint_totals.ts (v39 targets),
--      because the app's top-3 problem areas read worst_joints first (a now-Steady joint would otherwise stay "#1 Problem area").
--   3. public.protocols where the saved protocol no longer matches protocol_joint_ranking() (new worst_joints and the new
--      ranking targets): public.persist_protocols_for_assessment(id) (what compute-tiers runs), so ROMBot's saved protocol
--      matches My Protocol.
-- What it NEVER touches: the measured angles (assessments.*_l / *_r / midline columns; checked below, the run aborts if they
-- change), techniques.*_min, technique_eligibility (reads raw angles vs technique minimums, unchanged), users, emails.
-- No trigger fires: the only assessments triggers are AFTER INSERT (compute-tiers webhook, product event); joint_scores and
-- protocols have no triggers. Nothing sends email.
--
-- Test fixtures: skipped by default (public.is_test_account(email)). To include them set include_test_fixtures := true in
-- the scope step (QA accounts keep their old saved bands otherwise, because saved joint_scores win over the formula).
--
-- Idempotent: a second run changes nothing (every write is "only where different"); the backup keeps the FIRST old value.
-- Rollback: section C (restores every saved value from the backup table). Run it after restoring the old function.
-- =====================================================================================================================


-- ---------------------------------------------------------------------------------------------------------------------
-- A. DRY RUN (read-only, SELECT only). Safe on prod at any time. Same numbers whether or not the migration is applied.
-- ---------------------------------------------------------------------------------------------------------------------
WITH tgt(joint_key, lcol, rcol, old_t, new_t) AS (VALUES
  ('hip_er','hip_er_l','hip_er_r',45::numeric,29::numeric),
  ('hip_ir','hip_ir_l','hip_ir_r',45,26),
  ('hip_abd','hip_abd_l','hip_abd_r',90,40),
  ('shoulder_flex','shoulder_flex_l','shoulder_flex_r',180,140),
  ('ankle_df','ankle_df_l','ankle_df_r',20,6),
  ('cervical_rot','cervical_rot_l','cervical_rot_r',80,70),
  ('cervical_lat','cervical_lat_l','cervical_lat_r',45,38)),
a AS (
  SELECT x.id, x.user_id, to_jsonb(x) j,
         coalesce(public.is_test_account(u.email), false) AS is_test,
         row_number() OVER (PARTITION BY x.user_id ORDER BY x.assessed_at DESC NULLS LAST, x.created_at DESC NULLS LAST) = 1 AS is_latest
  FROM public.assessments x LEFT JOIN public.users u ON u.id = x.user_id),
v AS (
  SELECT a.id assessment_id, a.user_id, a.is_test, a.is_latest, t.joint_key, t.old_t, t.new_t,
         (a.j->>t.lcol)::numeric l, (a.j->>t.rcol)::numeric r
  FROM a CROSS JOIN tgt t),
s AS (SELECT v.*, CASE WHEN l IS NOT NULL AND r IS NOT NULL THEN least(l, r) ELSE coalesce(l, r) END worse FROM v),
sc AS (
  SELECT s.*,
    CASE WHEN worse/old_t >= 1.0 THEN 3 WHEN worse/old_t >= 0.90 THEN 2 ELSE 1 END AS old_score,
    CASE WHEN worse/new_t >= 1.0 THEN 3 WHEN worse/new_t >= 0.90 THEN 2 ELSE 1 END AS new_score,
    js.score AS stored
  FROM s LEFT JOIN public.joint_scores js ON js.assessment_id = s.assessment_id AND js.joint_key = s.joint_key
  WHERE worse IS NOT NULL),
f AS (SELECT sc.*, coalesce(stored, old_score) AS cur FROM sc)
SELECT coalesce(joint_key, 'ALL') joint_key, is_test,
  count(*) measured,
  count(*) FILTER (WHERE stored IS NULL) no_row,
  count(*) FILTER (WHERE stored IS NOT NULL AND stored <> old_score) stored_ne_old_formula,
  count(*) FILTER (WHERE new_score <> cur) score_changes,
  count(*) FILTER (WHERE new_score = 3 AND cur < 3) flip_to_steady,
  count(*) FILTER (WHERE cur = 1 AND new_score = 2) needs_focus_to_building,
  count(DISTINCT assessment_id) FILTER (WHERE new_score <> cur) assessments_changed,
  count(DISTINCT user_id) FILTER (WHERE new_score <> cur) users_changed,
  count(*) FILTER (WHERE is_latest AND new_score <> cur) latest_changes,
  count(*) FILTER (WHERE is_latest AND new_score = 3 AND cur < 3) latest_flip_to_steady,
  count(DISTINCT user_id) FILTER (WHERE is_latest AND new_score = 3 AND cur < 3) latest_users_flip_to_steady
FROM f
GROUP BY GROUPING SETS ((joint_key, is_test), (is_test))
ORDER BY is_test, joint_key NULLS LAST;

-- A2. Dry run for worst_joints / rom_total (compute-tiers joint_totals.ts mirror, old vs new targets). Read-only.
--     worst_matches_old_mirror proves the SQL mirror reproduces what compute-tiers saved.
WITH jt(ord, key, old_t, new_t) AS (VALUES
  (1,'hip_er_l',45::numeric,29::numeric),(2,'hip_er_r',45,29),(3,'hip_ir_l',45,26),(4,'hip_ir_r',45,26),
  (5,'hip_abd_l',90,40),(6,'hip_abd_r',90,40),
  (9,'hip_ext_l',30,30),(10,'hip_ext_r',30,30),(11,'shoulder_er_l',90,90),(12,'shoulder_er_r',90,90),
  (13,'shoulder_flex_l',180,140),(14,'shoulder_flex_r',180,140),(15,'ankle_df_l',20,6),(16,'ankle_df_r',20,6),
  (17,'cervical_rot_l',80,70),(18,'cervical_rot_r',80,70),(19,'cervical_lat_l',45,38),(20,'cervical_lat_r',45,38),
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
-- B. APPLY (one transaction). Needs Jim's yes. Run as the postgres / service role (SQL editor or psql).
-- ---------------------------------------------------------------------------------------------------------------------
BEGIN;

-- B0. Guard: the function must already carry the new targets (apply 20261006153000_steady_targets_hip_shoulder_ankle.sql first).
DO $guard$
DECLARE d text := pg_get_functiondef('public.compute_joint_scores(uuid)'::regprocedure);
BEGIN
  IF position('(''hip_er'',''hip_er_l'',''hip_er_r'',29::numeric)' IN d) = 0
     OR position('(''hip_ir'',''hip_ir_l'',''hip_ir_r'',26)' IN d) = 0
     OR position('(''hip_abd'',''hip_abd_l'',''hip_abd_r'',40)' IN d) = 0
     OR position('(''shoulder_flex'',''shoulder_flex_l'',''shoulder_flex_r'',140)' IN d) = 0
     OR position('(''ankle_df'',''ankle_df_l'',''ankle_df_r'',6)' IN d) = 0
     OR position('(''cervical_rot'',''cervical_rot_l'',''cervical_rot_r'',70)' IN d) = 0
     OR position('(''cervical_lat'',''cervical_lat_l'',''cervical_lat_r'',38)' IN d) = 0 THEN
    RAISE EXCEPTION 'compute_joint_scores() does not have the Oct 6 targets yet: apply 20261006153000_steady_targets_hip_shoulder_ankle.sql first';
  END IF;
END
$guard$;

-- B1. Scope. include_test_fixtures: false = skip public.is_test_account() users (default).
CREATE TEMP TABLE _st_scope ON COMMIT DROP AS
WITH cfg AS (SELECT false AS include_test_fixtures)
SELECT x.id AS assessment_id
FROM public.assessments x LEFT JOIN public.users u ON u.id = x.user_id CROSS JOIN cfg
WHERE (x.hip_er_l IS NOT NULL OR x.hip_er_r IS NOT NULL OR x.hip_ir_l IS NOT NULL OR x.hip_ir_r IS NOT NULL
       OR x.hip_abd_l IS NOT NULL OR x.hip_abd_r IS NOT NULL OR x.shoulder_flex_l IS NOT NULL OR x.shoulder_flex_r IS NOT NULL
       OR x.ankle_df_l IS NOT NULL OR x.ankle_df_r IS NOT NULL
       OR x.cervical_rot_l IS NOT NULL OR x.cervical_rot_r IS NOT NULL OR x.cervical_lat_l IS NOT NULL OR x.cervical_lat_r IS NOT NULL)
  AND (cfg.include_test_fixtures OR NOT coalesce(public.is_test_account(u.email), false));

-- B2. Fingerprint of every measured angle in scope (must be identical at the end).
CREATE TEMP TABLE _st_fp ON COMMIT DROP AS
SELECT md5(string_agg((to_jsonb(x) - 'worst_joints' - 'rom_total')::text, '|' ORDER BY x.id)) AS fp
FROM public.assessments x JOIN _st_scope s ON s.assessment_id = x.id;

-- B3. Backup table (service-only: RLS on, no policies, no grants to anon/authenticated). Keeps the FIRST old value.
CREATE TABLE IF NOT EXISTS public._recompute_steady_targets_20261006_backup (
  assessment_id uuid NOT NULL,
  item text NOT NULL,                 -- 'joint_score:<joint_key>' (hip_er, hip_ir, hip_abd, shoulder_flex, ankle_df, cervical_rot, cervical_lat) | 'totals'
  old_score smallint, new_score smallint,
  old_worst_joints text[], new_worst_joints text[],
  old_rom_total integer, new_rom_total integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, item));
ALTER TABLE public._recompute_steady_targets_20261006_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._recompute_steady_targets_20261006_backup FROM PUBLIC;
DO $rv$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public._recompute_steady_targets_20261006_backup FROM anon, authenticated';
  END IF;
END $rv$;

-- B4. New joint scores for the five changed joints (same CASE as compute_joint_scores, new targets).
CREATE TEMP TABLE _st_new ON COMMIT DROP AS
WITH tgt(joint_key, lcol, rcol, t) AS (VALUES
  ('hip_er','hip_er_l','hip_er_r',29::numeric), ('hip_ir','hip_ir_l','hip_ir_r',26), ('hip_abd','hip_abd_l','hip_abd_r',40),
  ('shoulder_flex','shoulder_flex_l','shoulder_flex_r',140), ('ankle_df','ankle_df_l','ankle_df_r',6),
  ('cervical_rot','cervical_rot_l','cervical_rot_r',70), ('cervical_lat','cervical_lat_l','cervical_lat_r',38)),
v AS (
  SELECT s.assessment_id, t.joint_key, t.t, (to_jsonb(x)->>t.lcol)::numeric l, (to_jsonb(x)->>t.rcol)::numeric r
  FROM _st_scope s JOIN public.assessments x ON x.id = s.assessment_id CROSS JOIN tgt t),
w AS (SELECT v.*, CASE WHEN l IS NOT NULL AND r IS NOT NULL THEN least(l, r) ELSE coalesce(l, r) END AS worse FROM v)
SELECT w.assessment_id, w.joint_key,
       (CASE WHEN worse/t >= 1.0 THEN 3 WHEN worse/t >= 0.90 THEN 2 ELSE 1 END)::smallint AS new_score,
       js.score AS old_score, (js.assessment_id IS NULL) AS missing_row
FROM w LEFT JOIN public.joint_scores js ON js.assessment_id = w.assessment_id AND js.joint_key = w.joint_key
WHERE w.worse IS NOT NULL;

INSERT INTO public._recompute_steady_targets_20261006_backup (assessment_id, item, old_score, new_score)
SELECT assessment_id, 'joint_score:' || joint_key, old_score, new_score
FROM _st_new WHERE NOT missing_row AND old_score IS DISTINCT FROM new_score
ON CONFLICT (assessment_id, item) DO NOTHING;

UPDATE public.joint_scores js SET score = n.new_score
FROM _st_new n
WHERE js.assessment_id = n.assessment_id AND js.joint_key = n.joint_key AND js.score IS DISTINCT FROM n.new_score;

-- Missing rows for these joints (none on prod at the Oct 6 dry run): let the (new) function write them.
SELECT public.compute_joint_scores(assessment_id) FROM (SELECT DISTINCT assessment_id FROM _st_new WHERE missing_row) m;

-- B5. worst_joints + rom_total (compute-tiers v39 joint_totals.ts mirror; hip_flex unscored; same key order as JOINT_TARGETS).
CREATE TEMP TABLE _st_totals ON COMMIT DROP AS
WITH jt(ord, key, t) AS (VALUES
  (1,'hip_er_l',29::numeric),(2,'hip_er_r',29),(3,'hip_ir_l',26),(4,'hip_ir_r',26),(5,'hip_abd_l',40),(6,'hip_abd_r',40),
  (9,'hip_ext_l',30),(10,'hip_ext_r',30),(11,'shoulder_er_l',90),(12,'shoulder_er_r',90),
  (13,'shoulder_flex_l',140),(14,'shoulder_flex_r',140),(15,'ankle_df_l',6),(16,'ankle_df_r',6),
  (17,'cervical_rot_l',70),(18,'cervical_rot_r',70),(19,'cervical_lat_l',38),(20,'cervical_lat_r',38),
  (21,'cervical_flex',50),(22,'cervical_ext',60),(23,'thoracic_rot_l',45),(24,'thoracic_rot_r',45),
  (25,'lumbar_flex',60),(26,'lumbar_ext',25),(27,'balance_l',30),(28,'balance_r',30)),
p AS (
  SELECT s.assessment_id, jt.ord, jt.key, greatest(0, least(1, (to_jsonb(x)->>jt.key)::numeric / jt.t)) AS pct
  FROM _st_scope s JOIN public.assessments x ON x.id = s.assessment_id CROSS JOIN jt
  WHERE (to_jsonb(x)->>jt.key) IS NOT NULL),
agg AS (
  SELECT assessment_id, (array_agg(key ORDER BY pct, ord))[1:5] AS new_worst, round(avg(pct * 100))::int AS new_rom
  FROM p GROUP BY assessment_id)
SELECT g.assessment_id, x.worst_joints AS old_worst, g.new_worst, x.rom_total AS old_rom, g.new_rom
FROM agg g JOIN public.assessments x ON x.id = g.assessment_id
WHERE x.worst_joints IS DISTINCT FROM g.new_worst OR x.rom_total IS DISTINCT FROM g.new_rom;

INSERT INTO public._recompute_steady_targets_20261006_backup (assessment_id, item, old_worst_joints, new_worst_joints, old_rom_total, new_rom_total)
SELECT assessment_id, 'totals', old_worst, new_worst, old_rom, new_rom FROM _st_totals
ON CONFLICT (assessment_id, item) DO NOTHING;

UPDATE public.assessments x SET worst_joints = t.new_worst, rom_total = t.new_rom
FROM _st_totals t WHERE x.id = t.assessment_id;

-- B6. Re-save the protocol wherever the saved one no longer matches protocol_joint_ranking() (new worst_joints and/or the
--     new ranking targets), which is what compute-tiers does after writing worst_joints. On Oct 6 every real assessment's
--     saved protocol matched the ranking (0 drift), so this only touches protocols the change moves.
CREATE TEMP TABLE _st_proto ON COMMIT DROP AS
SELECT s.assessment_id FROM _st_scope s
WHERE (SELECT coalesce(array_agg(DISTINCT p.joint_key || ':' || p.priority_rank ORDER BY p.joint_key || ':' || p.priority_rank), '{}')
       FROM public.protocols p WHERE p.assessment_id = s.assessment_id)
   IS DISTINCT FROM
      (SELECT coalesce(array_agg(r.joint_key || ':' || r.priority_rank ORDER BY r.joint_key || ':' || r.priority_rank), '{}')
       FROM public.protocol_joint_ranking(s.assessment_id) r);
SELECT public.persist_protocols_for_assessment(assessment_id) FROM _st_proto;

-- B7. Measured angles untouched, or abort.
DO $fp$
BEGIN
  IF (SELECT fp FROM _st_fp) IS DISTINCT FROM (
      SELECT md5(string_agg((to_jsonb(x) - 'worst_joints' - 'rom_total')::text, '|' ORDER BY x.id))
      FROM public.assessments x JOIN _st_scope s ON s.assessment_id = x.id) THEN
    RAISE EXCEPTION 'measured angles changed during the recompute: aborting';
  END IF;
END
$fp$;

-- B8. Summary (inspect before COMMIT; ROLLBACK instead if anything looks wrong).
SELECT
  (SELECT count(*) FROM _st_scope) AS assessments_in_scope,
  (SELECT count(*) FROM _st_new WHERE old_score IS DISTINCT FROM new_score) AS joint_scores_changed,
  (SELECT count(*) FROM _st_new WHERE new_score = 3 AND coalesce(old_score, 0) < 3) AS flips_to_steady,
  (SELECT count(*) FROM _st_totals WHERE old_worst IS DISTINCT FROM new_worst) AS worst_joints_changed,
  (SELECT count(*) FROM _st_totals WHERE old_rom IS DISTINCT FROM new_rom) AS rom_total_changed,
  (SELECT count(*) FROM _st_proto) AS protocols_resaved;

COMMIT;


-- ---------------------------------------------------------------------------------------------------------------------
-- C. ROLLBACK (only if the Oct 6 targets are reverted). First restore the old function
--    (supabase/migrations/20261006153000_steady_targets_hip_shoulder_ankle.rollback.sql.txt) and compute-tiers v38, then run this block.
-- ---------------------------------------------------------------------------------------------------------------------
-- BEGIN;
-- UPDATE public.joint_scores js SET score = b.old_score
-- FROM public._recompute_steady_targets_20261006_backup b
-- WHERE b.item LIKE 'joint_score:%' AND js.assessment_id = b.assessment_id AND js.joint_key = substr(b.item, 13);
-- UPDATE public.assessments x SET worst_joints = b.old_worst_joints, rom_total = b.old_rom_total
-- FROM public._recompute_steady_targets_20261006_backup b
-- WHERE b.item = 'totals' AND x.id = b.assessment_id;
-- SELECT public.persist_protocols_for_assessment(x.id)
-- FROM public.assessments x
-- WHERE x.id IN (SELECT DISTINCT assessment_id FROM public._recompute_steady_targets_20261006_backup)
--   AND (SELECT coalesce(array_agg(DISTINCT p.joint_key || ':' || p.priority_rank ORDER BY p.joint_key || ':' || p.priority_rank), '{}')
--        FROM public.protocols p WHERE p.assessment_id = x.id)
--       IS DISTINCT FROM
--       (SELECT coalesce(array_agg(r.joint_key || ':' || r.priority_rank ORDER BY r.joint_key || ':' || r.priority_rank), '{}')
--        FROM public.protocol_joint_ranking(x.id) r);
-- COMMIT;
-- (Then, once nobody needs it: DROP TABLE public._recompute_steady_targets_20261006_backup;)
