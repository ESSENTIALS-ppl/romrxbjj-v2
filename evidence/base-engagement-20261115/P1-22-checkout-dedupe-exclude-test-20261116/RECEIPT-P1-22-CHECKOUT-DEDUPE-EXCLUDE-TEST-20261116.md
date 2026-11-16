# RECEIPT: P1-22 follow-up, ops.checkout_completed_deduped excludes test fixtures (BUILD ONLY), 2026-11-16 ~10:10 AM ET (Avery)

BUILD ONLY. Not applied: no apply_migration, no deploy, no Supabase writes (MCP SELECTs only), no secrets, flags or emails.
Authority: Grant 9:59 AM ET under L1031. Finding from Reid's P1-22-STAFF-LIST.md side note: 2 of the view's 4 rows are fixtures, and the other 2 are the one real buyer.

## Commit
- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **fix/p1-22-checkout-dedupe-exclude-test-20261116** (pushed plain, new branch).
- Commit **3fe9badd6e41f75a042f7ea3d804a6ca488843af**, parent **5366b22c8df6641b3418b9009e1db757ca228dbe**. The parent is origin fix/p1-22-measurement-rename-030659-20261115: it carries the live P1-22 migration under its live id 20261116030659, bytes unchanged.
- Patch: 3fe9badd.patch sha256 9f33af1d6c5ca3de824ff400753d909d0ab021a7eea7c30864462cf90bb7404b. `git show --format= --patch` sha256 d74709a46d1e4bacc8667b44b71c88958ecdc7904698fe96fa2866f194f9e0c7. 5 files, +271/-0, all new.
- Migration sha256: 20261116150000_p1_22_checkout_deduped_exclude_test.sql 8ac4174e…01b1. The rollback _rollback.sql is 846c1872…6138.

## Live head and id
- Live list_migrations head (read 9:51 AM ET) is **20261116144054** skip_quick_reads. 20261116150000 sorts after it. 20261116030659 p1_22_retention_measurement and 030255 are live.
- Server: PostgreSQL 17.6.

## Live definitions read first (read-only)
- ops.checkout_completed_deduped: owner postgres, reloptions **none** (it is not security_invoker, unlike the field_counter views), ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, viewdef md5 **2076aed0fd2afe662de97af68e7a48fb**, comment md5 2725524897386657d812a182516d0459.
  - Columns: id bigint, user_id uuid, anon_id text, session_id text, event text, props jsonb, sport text, source text, path text, created_at timestamptz.
  - Snapshot: live-read/checkout_completed_deduped-live.json.
- How the other P1-22 views exclude: ops.v_real_assessed uses `NOT COALESCE(ops.is_excluded_from_metrics(user_id), false)`. ops.is_excluded_from_metrics (md5 d70fa4c4) is true when the user is in ops.internal_accounts OR public.is_test_account(auth email) (md5 de7d4fe0), and false for a NULL user_id. I used the same expression.

## Every hunk (all 5 files are new; hunks-U0.patch)
1. supabase/migrations-unapplied/20261116150000_p1_22_checkout_deduped_exclude_test.sql @@ -0,0 +1,53 @@: a header comment, then `CREATE OR REPLACE VIEW ops.checkout_completed_deduped` (the live 030659 text plus one line), then `COMMENT ON VIEW`. Against the live block (view-block-live-vs-new.diff, sha256 256c92ff…a1b4) there are exactly 2 changes:
   - @@ -5,6 +5,7 @@ in the `base` CTE, after `WHERE e.event = 'checkout_completed'`, adds `AND NOT COALESCE(ops.is_excluded_from_metrics(e.user_id), false)`.
   - @@ -40,4 +41,4 @@ appends this sentence to the comment: "Excludes test fixtures and ops.internal_accounts via ops.is_excluded_from_metrics(user_id), the same rule as ops.v_real_assessed (20261116150000)."
   - No GRANT, OWNER or ALTER statement is included. CREATE OR REPLACE keeps the oid, owner, ACL and reloptions, and the select list is unchanged.
2. supabase/migrations-unapplied/20261116150000_p1_22_checkout_deduped_exclude_test_rollback.sql @@ -0,0 +1,48 @@: a header, then the live 030659 view and comment, copied byte for byte from the live migration file.
3. scripts/p1-22-checkout-dedupe-test/test.mjs @@ -0,0 +1,94 @@: the PGlite test. It seeds the live view from the 030659 file and uses the live function definitions and synthetic rows.
4. scripts/p1-22-checkout-dedupe-test/package.json @@ -0,0 +1 @@: pins @electric-sql/pglite 0.5.16.
5. scripts/p1-22-checkout-dedupe-test/results.json @@ -0,0 +1,75 @@: the test output.

## Viewdef md5, before and after
- Before: **2076aed0fd2afe662de97af68e7a48fb**. This is the live value, and PGlite reproduces it exactly from the 030659 text.
- After, in PGlite (PG 18.6): **ec4991f75c19cca6ffa71639821cd766**. This is the expected live value after apply. Vera should re-read it live after apply, because it is engine-rendered.
- After the rollback: 2076aed0fd2afe662de97af68e7a48fb.

## Tests: PGlite 0.5.16, 15/15 PASS (results.json)
- T0: the live view counts fixtures today.
- T1: fixtures are excluded, with and without a session id.
- T2 and T2b: the real buyer's rows are kept and identical to the live view, with the 2-hour window, the purpose split and session-id dedupe unchanged.
- T3: an ops.internal_accounts row is excluded.
- T4: a jim+romrx-* address without the test_fixture flag is kept.
- T5: a NULL user_id row is kept.
- T6: the column list is unchanged.
- T7: owner, reloptions, ACL and oid are unchanged.
- T8: the viewdef changed only by the exclusion.
- T9: the comment is updated.
- T10: non-checkout events are ignored.
- T11 and T11b: the rollback restores the md5, comment, columns, owner, ACL and rows.
- T12: re-applying after the rollback is clean.

## What the new view would return on live (read-only SELECT of the new view body, counts only)
- Raw checkout_completed: 6 rows. Of those, 4 belong to non-excluded users.
- The live view today returns 4 rows: 2 excluded (fixtures) and 2 kept.
- **The new view would return 2 rows, from 1 user, with 0 NULL-user rows.** Its id set equals the 2 non-excluded rows of the live view exactly (same_ids 2, id_sets_equal true). So the real buyer's rows are unchanged and only the 2 fixture rows drop.
- ops.internal_accounts has 0 rows. Note: once Reid's staff list is inserted (gated), those users are excluded here too, matching the other P1-22 views. Reid says no listed account has a checkout row.
- Effect on Reid's M7 deduped number: 4 becomes 2. The Nov 2 review verified 1 real purchase (fired 4 times), and the 2-hour rule still gives 2 for that buyer. Reid's footnote should change from "4, 3 real" to "2, the one real buyer".

## Rollback
1. MCP apply_migration (or execute_sql inside the gate) with 20261116150000_p1_22_checkout_deduped_exclude_test_rollback.sql. It is CREATE OR REPLACE back to the live 030659 view and comment. It changes no data, and no grants are needed.
2. Read back: the viewdef md5 should be 2076aed0fd2afe662de97af68e7a48fb, the comment md5 2725524897386657d812a182516d0459, owner postgres, ACL unchanged, reloptions null, and 4 rows.

## Apply plan (later, gated: Margot line, then Vera precheck, then Sable OK, then apply, then Vera post-check)
- MCP apply_migration with name p1_22_checkout_deduped_exclude_test and the body of the .sql file. After that, rename the repo file into supabase/migrations/ under its live id in a pure-rename commit.
- Post-check: viewdef md5 (expect ec4991f7…; confirm live), the column list, owner, ACL and reloptions as above, and a row count of 2.
