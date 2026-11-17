# PIN REQUEST: P1-25 purge fix (storage queue), BUILD ONLY, UNAPPLIED, 2026-11-17

Built by Avery, Tue Nov 17 2026, 6:48 to about 7:05 AM ET (America/New_York). Nothing was applied or written live; only read-only SQL. Job 14 stays scheduled. No cron change.

## Pin
- romrxbjj-v2 branch fix/p1-25-purge-storage-queue-20261117, commit **e0b346259d6394bb841a7b91e42825d77620593c**. One commit on origin/main a34aa57: 2 new files, +1722/-0, 2 hunks. Plain push; ls-remote matches e0b34625. Not merged.
- Patch `git show --format= e0b34625`: 96f79b50440829da44d7f94c3517fa25a850b19cef9059991c8fd9252677960c (copy: purge-fix-20261117/p1-25-purge-fix.patch).
- SQL: supabase/migrations-unapplied/20261117120000_p1_25_purge_storage_queue.sql, **1f48a120ac25845e8e1342a9afab3b13f09ed97493fc77b44663b9f00dbe4659**.
- Rollback: supabase/migrations-unapplied/20261117120000_p1_25_purge_storage_queue_rollback.sql, **2bebef4a06aad6e21d3991ff0fc9184f56c17e032052b7302142c3f0303f1194**.
- Version 20261117120000 is a placeholder after the live head 20261117032016; apply_migration stamps the real id.
- The only address in the commit is hello@romrx.io (author and committer); the files contain none.

## Source of the function body
- Live `pg_get_functiondef('public.purge_deleted_accounts(text,interval)')`, read-only at 6:47 AM ET and again at 6:54 AM ET: md5 8cb6f2a60eaec196d1eba56c537f0c33, prosrc md5 83a038673c6f8ffbef7fddabb2b2cc9e, owner postgres, ACL {postgres=X, service_role=X}.
- Saved byte-exact as purge-fix-20261117/live-def-purge_deleted_accounts-20261117.sql (sha 6f9037b605e828cf0cf386a67957658f81ef746071e4f35edc76b4af6d78dda1).
- Diff against the repo: the live body between AS $function$ and $function$ is byte-identical to the body in romrxbjj-v2 a0ee9fc3 supabase/migrations/20261117013410_p1_25_purge_deleted_accounts.sql (file sha 19177ae6, = pinned purge).

## Design (smallest that meets the brief)
- The bug: storage.objects has protect_objects_delete, a FOR EACH STATEMENT BEFORE DELETE trigger, so any `DELETE FROM storage.objects` raises unless storage.allow_delete_query = 'true'. The purge always ran that DELETE in apply mode, so every run failed (live runid 22334).
- The fix replaces the SQL DELETE of storage.objects with a guarded INSERT of each matching object's bucket_id and name into a new table, public.p1_25_storage_delete_queue.
  - The guard: the insert runs only when this run's own storage.objects count (`v_counts->>'storage.objects'`, computed earlier in the same call with the same predicate) is above 0.
  - The match predicate (owner, owner_id, progress_photos path) is unchanged.
- Files are then deleted through the Storage API, never by SQL. storage.allow_delete_query is not set and the trigger is not bypassed.
- Why a table and not just the function result: job 14 runs from pg_cron, which keeps only "1 row" and drops the result, so a list returned only in the result would be lost.
  - The queue holds only bucket and path, with RLS on and no policies. Access: REVOKE ALL from PUBLIC, anon, authenticated; GRANT SELECT, DELETE to service_role.
  - The primary key is (bucket_id, name) with ON CONFLICT DO NOTHING, so a rerun cannot duplicate rows.
- The apply result gains 'storage_objects_queued'.
- Everything else in the body is byte-identical, including `v_hardcoded uuid := '7c71e421-929b-4691-a6bc-cc614ed2a08d'`, the backup copy (storage__objects in zz_bak_p1_25_*), and every other table.
- Function owner, comment and grants are kept by CREATE OR REPLACE.
- The rollback restores the exact live body (PGlite R1: prosrc md5 back to 83a03867). It drops the queue table only if the table is empty.

## Tests (PGlite replay, purge-fix-20261117/test-purge-fix.mjs; output test-output-full.txt; results test-purge-fix-results.json)
- Setup: the test-v5.mjs P1-25 schema, plus a storage stub with the LIVE storage.protect_delete body as a statement-level BEFORE DELETE trigger, plus public.progress_photos. Fixture emails are plain non-address strings.
- **All 11 PASS** (exit 0):
  - T1: the live body with 0 objects and 0 qualifying FAILS with "Direct deletion from storage tables is not allowed..." (reproduces runid 22334).
  - T2: the fix with 0 objects and 0 qualifying passes, queued 0.
  - T3: the fix with 1 qualifying fixture account (completed request 100 days ago) and 0 objects. The account is purged (auth row and lead gone) and nothing is queued. 7c71e421, with its own 100-day completed request, is excluded and kept (excluded.hardcoded_7c71e421 = 1). The other active account is kept.
  - T4a: the fix with exactly 1 object for the qualifying account passes. The object is queued (progress-photos, <id>/front.jpg) and still exists in storage.objects.
  - T4b: 3 objects (owner+owner_id+photo / owner only / owner_id only) are all queued and none deleted. 7c71e421's object is not queued.
  - T5: a rerun is ok, with 0 qualifying and the queue unchanged.
  - T6: the backup schema is still written.
  - T7: dry_run and count outputs are identical to the live body (marked_at masked).
  - T8: 7c71e421 alone with a 100-day completed request is excluded and kept, and its object is not queued.
  - R1: the rollback restores the live prosrc md5 and drops the empty queue.
  - R2: the rollback with queued rows keeps the queue (3 rows).
- **Mutants: 6/6 KILLED.** M1 INSERT reverted to DELETE; M2 guard >0 changed to >1; M3 hardcoded id changed; M4 owner predicate dropped; M6 owner_id predicate dropped; M5 queued count not reported.

## Live read-only checks (6:54:17 AM ET)
- cron 15 jobs, md5 aecaf67e4f55a55d557256e8cf8b9763, job 1 caab15b0a3b771bccfd127f7c3db4df2. Job 14 is purge-deleted-accounts-daily, '23 4 * * *', active, with 1 run (the failed 22334). No cron change is needed.
- The live function is still md5 8cb6f2a6. The queue table does not exist yet. storage.objects has 0 rows, in bucket progress-photos.
- The storage.objects columns include bucket_id, name, owner (uuid) and owner_id (text). Its only FK is to buckets; there is no FK to auth.users, so the auth.users delete is unaffected.

## WARNs (pre-existing, not changed; byte-identical rule)
- W1: the inventory loop deletes public.progress_photos rows BEFORE the storage block, so the progress_photos path clause matches nothing at that point (the old DELETE had the same order). Objects are still matched by owner or owner_id.
  - An object with no owner or owner_id that is referenced only by a photo path would be counted (table_counts) and backed up, but not queued.
  - storage_objects_queued < table_counts['storage.objects'] in the result would show it. Live has 0 objects today.
- W2: the backup schema name has 1-second resolution, so two apply runs in the same second collide. Daily cron never does this. The test waits 1.1 s.
- W3: the runbook has no step yet for draining the queue: deleting each queued object through the Storage API and then removing its queue row. Per Grant, v6.1a carries only the step 7 owner change, so this needs a later runbook version.

## Timing
- Not required before tonight's 11:23 PM ET run. Without the fix, that run fails the same way and harmlessly (account_deletion_requests is empty, so 0 qualifying, and nothing changes).
- The fix matters before the first account qualifies, which is 90 days after the first completed deletion; none exist yet.
- Landing it before 11:23 PM ET stops the nightly failure. Grant's aim is before tonight.

## Hunks (exact)
- The commit adds two whole files, so there are 2 hunks: @@ -0,0 +1,878 @@ (migration) and @@ -0,0 +1,844 @@ (rollback).
- Byte checks: migration = the header and DDL below + the fixed function definition + ";\n". Rollback = the header below + the live function definition (byte-identical to live-def-purge_deleted_accounts-20261117.sql) + the tail below.
- The full patch is purge-fix-20261117/p1-25-purge-fix.patch (sha above).
- Function body changes vs live (4 hunks, purge-fix-20261117/body-diff-live-vs-fix.diff):

````diff
--- live-def-purge_deleted_accounts-20261117.sql	2026-11-17 06:50:30.120122266 -0500
+++ /tmp/pfix/new-def.sql	2026-11-17 06:49:07.724203147 -0500
@@ -28,6 +28,7 @@
   v_comment text;
   v_has_uid boolean;
   v_has_email boolean;
+  v_storage_queued bigint := 0;
 BEGIN
   v_mode := lower(btrim(coalesce(p_mode, '')));
   IF v_mode = 'count_only' THEN v_mode := 'count'; END IF;
@@ -776,10 +777,14 @@
     EXECUTE v_sql;
   END LOOP;
 
-  IF to_regclass('storage.objects') IS NOT NULL THEN
+  -- Storage files are never deleted with SQL (storage.protect_delete blocks it; files go through the Storage API).
+  -- Only when the run found matching objects, queue each object's bucket and path in
+  -- public.p1_25_storage_delete_queue for deletion through the Storage API (runbook). Otherwise nothing runs here.
+  IF to_regclass('storage.objects') IS NOT NULL AND coalesce((v_counts ->> 'storage.objects')::bigint, 0) > 0 THEN
     IF to_regclass('public.progress_photos') IS NOT NULL THEN
       v_sql := $q$
-        DELETE FROM storage.objects o
+        INSERT INTO public.p1_25_storage_delete_queue (bucket_id, name)
+        SELECT o.bucket_id, o.name FROM storage.objects o
         WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
            OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
            OR o.name IN (
@@ -787,15 +792,19 @@
              WHERE p.user_id IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
                AND p.storage_path IS NOT NULL
            )
+        ON CONFLICT (bucket_id, name) DO NOTHING
       $q$;
     ELSE
       v_sql := $q$
-        DELETE FROM storage.objects o
+        INSERT INTO public.p1_25_storage_delete_queue (bucket_id, name)
+        SELECT o.bucket_id, o.name FROM storage.objects o
         WHERE o.owner IN (SELECT user_id FROM _classed WHERE class = 'qualifying')
            OR o.owner_id IN (SELECT user_id::text FROM _classed WHERE class = 'qualifying')
+        ON CONFLICT (bucket_id, name) DO NOTHING
       $q$;
     END IF;
     EXECUTE v_sql;
+    GET DIAGNOSTICS v_storage_queued = ROW_COUNT;
   END IF;
 
   -- Final: remove the auth row when it is still present. Cascades public.users and ON DELETE CASCADE children
@@ -825,7 +834,8 @@
     'backup_schema', v_bak_schema,
     'backup_created_at', v_bak_created,
     'backup_keep_for', '7 days',
-    'dropped_backup_schemas', v_dropped
+    'dropped_backup_schemas', v_dropped,
+    'storage_objects_queued', v_storage_queued
   );
 END;
 $function$
````

Migration lines before the function definition (verbatim):

````sql
-- 20261117120000_p1_25_purge_storage_queue (UNAPPLIED; BUILD ONLY). P1-25 purge fix, 2026-11-17.
-- Placeholder version; apply_migration stamps the real id. Apply via MCP apply_migration only, after its own pin,
-- Vera precheck and GO. Rollback: 20261117120000_p1_25_purge_storage_queue_rollback.sql (restores the exact live body).
--
-- Why: job 14 (purge-deleted-accounts-daily) failed its first run (runid 22334, Mon Nov 16 11:23 PM ET) with
-- "Direct deletion from storage tables is not allowed. Use the Storage API instead." storage.objects has the
-- statement-level BEFORE DELETE trigger protect_objects_delete (storage.protect_delete), so the purge's
-- DELETE FROM storage.objects raises on every apply run, even when it matches 0 rows, and the whole run rolls back.
--
-- Fix (smallest): the function body is the LIVE pg_get_functiondef of public.purge_deleted_accounts(text, interval)
-- (md5 8cb6f2a60eaec196d1eba56c537f0c33, = repo 20261117013410 body) with exactly three changes:
--   1) one new local variable v_storage_queued;
--   2) the storage.objects DELETE is replaced by an INSERT of each matching object's bucket_id and name into
--      public.p1_25_storage_delete_queue, guarded so it runs only when this run's own storage.objects count
--      (v_counts 'storage.objects', same predicate) is above 0. Same match predicate as before. Files are then
--      deleted through the Storage API by the runbook, never by SQL. storage.allow_delete_query is NOT set and
--      the trigger is not bypassed;
--   3) the apply result adds 'storage_objects_queued'.
-- Everything else is byte-identical, including the hardcoded 7c71e421-929b-4691-a6bc-cc614ed2a08d exclusion.
-- Why a table and not only the function result: job 14 runs from pg_cron, which discards the result, so a list
-- returned only in the result would be lost. The queue holds only bucket and path; rows are removed after the
-- Storage API delete. The backup schema copy (storage__objects) is unchanged.
-- Owner, comment and grants of the function are kept by CREATE OR REPLACE. No cron change (job 14 stays).

CREATE TABLE IF NOT EXISTS public.p1_25_storage_delete_queue (
  bucket_id text NOT NULL,
  name text NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_id, name)
);
ALTER TABLE public.p1_25_storage_delete_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.p1_25_storage_delete_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.p1_25_storage_delete_queue TO service_role;
COMMENT ON TABLE public.p1_25_storage_delete_queue IS
  'P1-25: Storage objects of purged accounts, queued by purge_deleted_accounts(apply) for deletion through the Storage API (never SQL). Bucket and path only. Remove a row after its object is deleted.';

````

Rollback lines before the restored live definition (verbatim):

````sql
-- ROLLBACK for 20261117120000_p1_25_purge_storage_queue (UNAPPLIED). Restores the exact live body of
-- public.purge_deleted_accounts(text, interval) as read on 2026-11-17 (pg_get_functiondef md5 8cb6f2a60eaec196d1eba56c537f0c33).
-- Note: the restored body fails every apply run on storage.protect_delete (the original bug). Owner, comment and grants are kept.
-- The queue table is dropped only if it is empty; if it holds rows, it is left in place so no queued path is lost.
````

Rollback lines after the restored live definition (verbatim):

````sql
;

DO $$
BEGIN
  IF to_regclass('public.p1_25_storage_delete_queue') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.p1_25_storage_delete_queue) THEN
    DROP TABLE public.p1_25_storage_delete_queue;
  END IF;
END $$;
````
