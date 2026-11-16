# PREP RECEIPT, Step 2a: migration 20261116030000_user_mobility_schedule (P1-07 v4). PREP ONLY, NOT APPLIED.

Written Mon Nov 16, 2026, about 9:00 AM ET by Avery. Apply first of the four, alone.

## Source
- Tree: `47aad4358c73f333e34f25e53002fcef432a78a1` (parent 832056dd40bd192a29a176b55dc167ff642dc91f), origin `feat/p1-06-v5-on-p1-07-v4-20261115`.
- File: `supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql`, blob e165bd4291f395afe162440fb83d312b1d6c1495, **sha256 `faa485cfcf85ec76e4fb880df3c20a73958de5ccced81dab9e0a78d7cfbc9088`**, 7704 bytes, 113 lines. Last changed in 1fae96b8 (P1-07 v4, Chicago→New York at lines 15, 60, 73). Gated earlier as L1107/L1088 (dbc6bed3, v2 bytes). These v4 bytes need their own Margot line.
- Copy: `migrations-47aad435/20261116030000_user_mobility_schedule.sql`.

## What it does (one apply)
Creates `public.user_mobility_schedule` (FK user_id → users ON DELETE CASCADE, last_assessment_id → assessments ON DELETE SET NULL), with RLS on, policy schedule_own_read (authenticated selects own), revokes from public/anon/authenticated, grants select to authenticated and all to service_role/postgres, plus 3 indexes. It creates `roll_next_check_at(timestamptz)` (SECURITY DEFINER, execute for service_role/postgres only), backfills one row per user from the latest full assessment, runs the roll once, and **adds cron `roll-next-check-at-hourly` at `20 * * * *` (:20 past each hour)**. It does not touch jobs 1 to 12 (renewal job 1 included).

## Vs live (diff)
Additive. Live has no `user_mobility_schedule` (to_regclass null) and no `roll_next_check_at` (0) (pre-apply snapshot, 8:45 AM ET). Diff vs live = the whole file (sha above).

## Pre-apply schema snapshot (read-only, `schema-snapshots-20261116/pre-apply-snapshot.json`)
179 migrations, head 20261116030659. cron.job has 12 jobs, ids 1 to 12, with command md5 recorded. assessments: 22 rows, 19 users with assessed_at. users 47. notification_preferences 48 rows, with a timezone column. Expected backfill: at most 19 rows (one per user with a full assessment and a users row).

## Rollback
`20261116030000_user_mobility_schedule_rollback.sql` sha256 `023f9ee96534f8897147f83d605b709fc1ddec648f6a1688a764caa8aa13f98b` (832 bytes). It unschedules only roll-next-check-at-hourly, then drops the function, 3 indexes and the table (backfilled rows go with it). It would be applied via MCP apply_migration only with its own gate. If 031000 to 031200 are applied, roll those back first (they don't depend on this table, but submit-assessment 47aad435 and client 8bf3d601 read it; both are fail-soft).

## Apply command form
MCP `apply_migration`: project_id cqzvqzwwevnflinxgnpp, name `user_mobility_schedule`, query = exact file bytes (file substitution, not retyped; sha256 faa485cf…). Never a CLI db push.

## Rename after apply (pure-rename commit, repo only)
After apply, read the real version from `list_migrations`. Then, in /workspace/romrxbjj-v2, on a new branch from 47aad435, `git mv` the file and its rollback companion to `<REAL>_<same name>` in the same folder (`supabase/migrations-unapplied/`, the 5366b22c / 551643f pattern). Bytes unchanged. Confirm with `git show --name-status -M` = R100 for both. Plain push, no force. That commit records an apply that already happened and must never be re-applied. Byte check (L1085): the file sha256 must equal the applied bytes.

## Post-check plan (read-only)
1. `list_migrations`: 180, new head = the real version, name user_mobility_schedule.
2. `select to_regclass('public.user_mobility_schedule'), (select relrowsecurity from pg_class where oid='public.user_mobility_schedule'::regclass), (select count(*) from public.user_mobility_schedule), (select count(*) from public.user_mobility_schedule where next_check_at = next_retest_at) as rolled;` Expect the table, RLS true, rows ≤ 19.
3. `select jobid, jobname, schedule, active, md5(command) from cron.job order by jobid;` Expect jobs 1 to 12 md5-identical to the snapshot, plus one new job `roll-next-check-at-hourly`, `20 * * * *`, active.
4. `select grantee, privilege_type from information_schema.role_table_grants where table_name='user_mobility_schedule';` Expect authenticated SELECT only, plus service_role/postgres. `select has_function_privilege('anon','public.roll_next_check_at(timestamptz)','execute');` Expect false.
5. After the first :20 run: `select status, return_message from cron.job_run_details where jobid = (select jobid from cron.job where jobname='roll-next-check-at-hourly') order by start_time desc limit 1;` Expect succeeded. A second run updates 0 (idempotent).
