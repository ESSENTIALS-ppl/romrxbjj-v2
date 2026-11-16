# RECEIPT: P1-22 T10, ops.protocol_completion_days (count-by-day) + value_actions completion arm (BUILD ONLY), 2026-11-16 6:55 PM ET (Avery)

BUILD ONLY. Not applied: no apply_migration, no deploy, no Supabase writes (MCP SELECTs only), no secrets, flags or emails. The earlier T10-STOPPED-QUESTION-20261116.md (sha e85d2398…) and its SHA256SUMS are unchanged.

Authority: Grant 6:5x PM ET Nov 16, under L1031: option (1), the count-by-day view. Each user counts once per local day; no data is changed. No deletes, no new triggers, and no web deploy. Point ops.value_actions at the new view if that is clean; if not, leave it alone and say why.

## Commit
- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **fix/p1-22-t10-completions-by-day-20261116** (pushed plain, new branch).
- Commit **04905e8e41edb32076256bc4cc4a7046c6b54670**, parent **5366b22c8df6641b3418b9009e1db757ca228dbe**. The parent is origin fix/p1-22-measurement-rename-030659-20261115: it carries the live P1-22 migration under its live id 20261116030659, bytes unchanged.
- `git show --format= --patch` sha256 **a483818a3a81cfdbc297b94e12cd4a3c12f1f2227d157d3660de0dec61ea60e4**. `git patch-id --stable` e0e20cb90cee4e016438636b2455573f8fe8046a. 5 files, +304/-0, all new.
- Migration sha256: 20261116151000_p1_22_t10_completions_by_day.sql **1bd25b2ab28de131727ccfa52cdab91180c3043ac85cc6688fc563b7a1b42af6**. Rollback _rollback.sql **e24bc60be22ac760a8aec1670aa0b444b53477f438b9e2c6dc60cd31ec696f17**.

## Live head and why 5366b22c is still the base
- Live list_migrations head (read 6:50 PM ET) is **20261116144054** skip_quick_reads. After live 030659 come L1134's 20261116143732, 143905, 143959 and 144054. None of those change ops.value_actions, public.protocol_completions, ops.is_excluded_from_metrics, or the notification_preferences timezone rule (143732 only reads that timezone for next_check_at). Live ops.value_actions viewdef md5 is still **758e3d8ad5cd04297470b0a4af8e3d3b**, which is the 030659 text. The staff-list insert (L1170, SQL b152a965) is not live. So 5366b22c is not stale for this object.
- 20261116151000 sorts after live 144054 and after the unapplied checkout-dedupe id 20261116150000 (3fe9badd, also build-only on 5366b22c).
- Server: PostgreSQL 17.6 (live). Tests: PGlite 0.5.16 / PostgreSQL 18.6.
- ops.protocol_completion_days does not exist live. The earlier distinct-days commit 7c10d6fb (tagged not-for-apply) and the standalone 40400 views (e98700c) were never applied.

## Live definitions read first (read-only, 6:53:20 PM ET)
- ops.value_actions: owner postgres, reloptions **none**, ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, viewdef md5 **758e3d8ad5cd04297470b0a4af8e3d3b**, columns `user_id:uuid,at:timestamp with time zone,kind:text`. The completion arm is `SELECT user_id, completed_at, 'protocol_completion' FROM public.protocol_completions`.
- Dependents of ops.value_actions: **ops.retention_m1** only (ops.retention_daily reads retention_m1). retention_m1 viewdef md5 b57b71c6d6193e495f1c36fe651a89fb; retention_daily md5 afa10ee25c7cb523430a229fd4cc34ee.
- Timezone rule used by the new view (same as zz_pc_protocol_session and the other P1-22 views): the user's latest valid notification_preferences.timezone, else America/New_York.
- Exclusion: `NOT COALESCE(ops.is_excluded_from_metrics(user_id), false)`, the same expression as ops.v_real_assessed and as commit 3fe9badd.

## Every hunk (all 5 files are new; hunks-U0.patch, same bytes as 04905e8e.patch because every file is new)
1. supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day.sql @@ -0,0 +1,42 @@: a header, then `CREATE VIEW ops.protocol_completion_days` (user_id, local_date, tz_used, raw_rows, first_at, last_at; excluded users dropped; local date from the stored zone else America/New_York), COMMENT, REVOKE ALL FROM PUBLIC, anon, authenticated, GRANT SELECT TO service_role, postgres, then `CREATE OR REPLACE VIEW ops.value_actions` with the same session and assessment arms and the completion arm reading `SELECT user_id, last_at, 'protocol_completion' FROM ops.protocol_completion_days`. last_at (the max completed_at of that user+local day) keeps every `EXISTS (at >= X)` answer of the per-row version for non-excluded users. No OWNER or GRANT on value_actions: CREATE OR REPLACE keeps the oid, owner, ACL and reloptions, and the select list is unchanged. No trigger, no data change, no web change. retention_m3 is not added (that was the unapplied 40400 / 7c10d6fb scope; Grant asked only for the count-by-day view and, if clean, the value_actions pointer).
2. supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day_rollback.sql @@ -0,0 +1,13 @@: a header, then the live 030659 value_actions text, copied byte for byte from supabase/migrations/20261116030659_p1_22_retention_measurement.sql, then `DROP VIEW IF EXISTS ops.protocol_completion_days`.
3. scripts/p1-22-t10-completions-by-day-test/test.mjs @@ -0,0 +1,126 @@: the PGlite test. It seeds the live metrics views from the 030659 file and uses the live function definitions, synthetic rows, and an optional anonymized live replica (LIVE_ROWS).
4. scripts/p1-22-t10-completions-by-day-test/package.json @@ -0,0 +1 @@: pins @electric-sql/pglite 0.5.16.
5. scripts/p1-22-t10-completions-by-day-test/results.json @@ -0,0 +1,122 @@: the test output (16/16 PASS, including the live replica).

## Viewdef md5, before and after
- ops.value_actions before: **758e3d8ad5cd04297470b0a4af8e3d3b**. This is the live value, and PGlite reproduces it exactly from the 030659 text (T0).
- ops.value_actions after, in PGlite (PG 18.6): **16f3d342b4319c1e6df994a3ec0f65ae**. This is the expected live value after apply. Vera should re-read it live after apply, because it is engine-rendered.
- ops.protocol_completion_days after, in PGlite: **3b79c2610b598f61c3203f9fe30ee7e3**. Columns: `user_id:uuid,local_date:date,tz_used:text,raw_rows:bigint,first_at:timestamp with time zone,last_at:timestamp with time zone`. Owner postgres, ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, reloptions none.
- After the rollback: value_actions md5 758e3d8ad5cd04297470b0a4af8e3d3b, and ops.protocol_completion_days is dropped.

## value_actions result: CLEAN, so the completion arm points at the new view
The "clean" test Grant set is met:
- Same columns (`user_id uuid, at timestamptz, kind text`), owner postgres, grants `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, reloptions none, and the oid is unchanged (CREATE OR REPLACE).
- No dependent view breaks: retention_m1 and retention_daily keep their oid and viewdef md5 and still query (T7). M1 answers for non-excluded users are identical (T8), because M1 already starts from ops.v_real_assessed (which excludes the same users) and because last_at preserves `EXISTS (at >= X)`.
- The rollback restores the live value_actions viewdef byte for byte (T9, md5 758e3d8a…).

The only behavior change in the completion arm, besides collapsing same-day rows, is that excluded users no longer appear there. That is the rule Grant asked for (same as 3fe9badd). Today it does not change any live count (see below). Session and assessment arms are untouched.

## Tests: PGlite 0.5.16, 16/16 PASS (results.json), re-run 6:53 PM ET with a fresh anonymized live replica
- T0: PGlite reproduces the live value_actions viewdef md5 758e3d8a….
- T1: a session-level row plus 3 per-movement rows (and an evening-ET row) on one local day count as 1 (raw_rows = 5).
- T2: two different local days count as 2, and value_actions has 2 completion rows for that user (8 raw rows before).
- T3a: the ET day boundary is honored (01:30Z belongs to the prior ET day; a UTC count would give 2 days).
- T3b: a stored America/Los_Angeles zone is honored (Nov 20 PT has 2 rows, Nov 21 PT has 1).
- T3c: an invalid stored zone falls back to America/New_York.
- T4: fixtures are excluded (no days, no value_actions completion rows).
- T4b: ops.internal_accounts is excluded.
- T5: value_actions keeps columns, owner, grants, reloptions and oid.
- T6: the new view is granted to service_role SELECT only (+ postgres owner); no anon/authenticated.
- T7: retention_m1 and retention_daily keep oid/md5 and still query.
- T8: M1 answers are identical for non-excluded users.
- T9 / T9b: the rollback restores the live value_actions viewdef (md5 758e3d8a…), oid, columns and grants, drops ops.protocol_completion_days, and restores per-row counts.
- T10: re-applying after the rollback is clean.
- T11: the anonymized live replica (22 rows, read 6:53:20 PM ET, hashes only, no emails) gives the same completion counts as today: before 22, after 22, 22 user+local days, max raw_rows per day = 1. There are no doubles yet because the web writer 41b947e7 is not live.

## What the new view would return on live (read-only SELECT of the new view body, counts only, 6:53:20 PM ET)
- protocol_completions: **22** rows, all session-level, 0 writer rows, 0 with no session id. 22 distinct sessions; protocol_sessions has 24 rows. 4 distinct users, all with a stored America/New_York zone (0 fallbacks).
- Live ops.value_actions: 68 rows (24 protocol_session + 22 protocol_completion + 22 assessment).
- The new view body, run as a SELECT: **22** user+local days, **22** non-excluded, **0** excluded, max raw_rows per day = 1, 0 excluded completion rows. So **before and after completion counts are the same: 22**. T10 starts when 41b947e7 ships; until then the view is a no-op on today's numbers and a safety net for the writer.
- Snapshot: live-read/live-counts.json and live-read/protocol_completions-anonymized.json (md5 of user_id only, no emails).
- ops.internal_accounts has 0 rows today. Once the gated staff-list insert lands, those users are excluded here too, matching the other P1-22 views. No listed account has a completion row today.

## Rollback
1. MCP apply_migration (or execute_sql inside the gate) with 20261116151000_p1_22_t10_completions_by_day_rollback.sql. It is CREATE OR REPLACE of ops.value_actions back to the live 030659 text, then DROP VIEW of ops.protocol_completion_days. It changes no data, and no grants are needed.
2. Read back: value_actions viewdef md5 should be 758e3d8ad5cd04297470b0a4af8e3d3b, owner postgres, ACL unchanged, reloptions null, columns unchanged, 22 protocol_completion rows, and ops.protocol_completion_days should not exist.

## Apply plan (later, gated: Margot line, then Vera precheck, then Sable OK, then apply, then Vera post-check)
- MCP apply_migration with name p1_22_t10_completions_by_day and the body of the .sql file. After that, rename the repo file into supabase/migrations/ under its live id in a pure-rename commit. Do not apply the rollback file. Never re-apply 7c10d6fb or 20261116040400.
- Post-check: value_actions viewdef md5 (expect 16f3d342…; confirm live), protocol_completion_days md5 (expect 3b79c261…; confirm live), the column lists, owner, ACL and reloptions as above, completion counts still 22 until the writer ships, and M1 unchanged.
