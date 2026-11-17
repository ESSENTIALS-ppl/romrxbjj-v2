# RECEIPT, L1176: P1-22 checkout dedupe exclude-test APPLIED as 20261117000244

Written Mon Nov 16, 2026, 7:03 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push). View change only; no data rows written or deleted. T10 migration 20261116151000 was not applied. No secrets or user emails in this receipt or in the applied SQL. main was not touched.

## Gate
- Ledger L1031 (Jim: "Do all of them…"); L1176 (Margot gate line, MATCHED, romrxbjj-v2 3fe9badd…); Vera precheck /workspace/vera-verdicts/vera-3fe9badd-L1176-P1-22-dedupe-precheck-20261116.md sha256 82f33d8c… (8/8 content checks PASS); L1183 (Sable OK); Grant GO on L1176 relayed after L1170.
- Applied after L1170 (staff-list insert live as 20261117000045). That insert does not change this view's expected 4-to-2 drop: the 2 dropped rows are test fixtures, and none of the 5 staff-list ids had a checkout row.

## Source
- Repo ESSENTIALS-ppl/romrxbjj-v2, commit **3fe9badd6e41f75a042f7ea3d804a6ca488843af** on fix/p1-22-checkout-dedupe-exclude-test-20261116.
- File `supabase/migrations-unapplied/20261116150000_p1_22_checkout_deduped_exclude_test.sql`, recomputed sha256 **8ac4174e546ab5a97a08ac18bc3bb79426a10e3d474c610e68ebfc103bd301b1** (MATCH). 2958 bytes.
- Rollback `…/20261116150000_p1_22_checkout_deduped_exclude_test_rollback.sql`, recomputed sha256 **846c18724f640e9ee0f9f8e9217e56a7c81c4cc2c4ae235c6d9b79e71f4d6138** (MATCH). 2297 bytes. Not applied. Restores the live 20261116030659 view text.

## Pre-read (read-only execute_sql, just before apply)
- ops.checkout_completed_deduped viewdef md5 (pg_get_viewdef, pretty) = **2076aed0fd2afe662de97af68e7a48fb**.
- Live row count = **4**.
- list_migrations head: **20261117000045** p1_22_staff_list (L1170). Name p1_22_checkout_deduped_exclude_test and version 20261117000244 were not present. T10 20261116151000 was not present.

## Apply
- MCP apply_migration, name `p1_22_checkout_deduped_exclude_test`, query passed by file substitution of the exact 2958-byte file (sha 8ac4174e…).
- Started 7:02:42 PM ET (America/New_York). MCP returned success by 7:02:48 PM ET (America/New_York).
- **Applied (live) id: 20261117000244** (list_migrations new head 20261117000244 p1_22_checkout_deduped_exclude_test; one new entry after 20261117000045). The version timestamp is 2026-11-17 00:02:44 UTC = 7:02:44 PM ET.

## Read-back (read-only execute_sql, 7:02:48 PM ET)
- viewdef md5 = **ec4991f75c19cca6ffa71639821cd766** (starts with ec4991f7, MATCH).
- Live row count = **2** (pre 4, 4 to 2, MATCH).
- T10 was not applied (no 20261116151000 in list_migrations).

## Rename (repo only, pure rename)
- Branch `chore/l1176-migration-rename-20261116` from 3fe9badd6e41f75a042f7ea3d804a6ca488843af, commit **e1fc5713bd9be67ff3d213f3ee66d885b95ca550** (plain push, new branch). main not updated.
- `20261116150000_p1_22_checkout_deduped_exclude_test.sql` → `20261117000244_p1_22_checkout_deduped_exclude_test.sql`; same for the rollback file. numstat 0/0, 100% rename, sha256 unchanged (8ac4174e… and 846c1872…). Never re-apply.

## Rollback (not applied)
- Path in this folder and, after the rename, `supabase/migrations-unapplied/20261117000244_p1_22_checkout_deduped_exclude_test_rollback.sql`.
- sha256: **846c18724f640e9ee0f9f8e9217e56a7c81c4cc2c4ae235c6d9b79e71f4d6138**
- Apply only via MCP apply_migration with its own gate. Restores viewdef md5 2076aed0…; expected live count would return to 4 if the underlying events are unchanged.
