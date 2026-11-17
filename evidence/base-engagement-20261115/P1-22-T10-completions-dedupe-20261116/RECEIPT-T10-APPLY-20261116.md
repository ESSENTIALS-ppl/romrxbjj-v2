# RECEIPT, L1184: P1-22 T10 completions-by-day APPLIED as 20261117001014

Written Mon Nov 16, 2026, 7:11 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push). View change only; no data rows written or deleted. Rollback e24bc60b was not applied. No secrets or user emails in this receipt or in the applied SQL. main was not touched. Account 7c71e421 data was not altered (the new view excludes it from metrics; stored protocol_completions rows are unchanged).

## Gate
- Ledger L1031 (Jim: "Do all of them…"); L1178 (Jim: "Let's finish all this stuff that was supposed to get done"); L1184 (Margot gate line, MATCHED, romrxbjj-v2 04905e8e…, migration 1bd25b2a…, rollback e24bc60b…); Vera precheck /workspace/vera-verdicts/vera-04905e8e-P1-22-T10-completions-by-day-precheck-20261116.md sha8 1036c989; L1191 (Sable OK, conditional); Grant GO on T10 04905e8e under L1031, relayed after the L1170 and L1176 applies.
- L1191 conditions, done in order: (1) receipt 700f12db was not edited; CORRECTION-T10-COUNTS-20261116.md was added first (sha256 302aee2c31c38d907b3c63f5cd94b43d04bf77f3659cb73a9ae591772f1eb99e, SHA256SUMS-CORRECTION in this folder). Live numbers were re-read read-only at 7:09 PM ET and matched the correction (15 user-days; M1 1:7/4/3, 7:7/2/2, 14:7/2/2, 30:6/1/1; the claim that no listed account has a completion row is struck). (2) MCP assigned the id; 20261116151000 was not forced. Live head before apply was 20261117000244 p1_22_checkout_deduped_exclude_test.

## Source
- Repo ESSENTIALS-ppl/romrxbjj-v2, commit **04905e8e41edb32076256bc4cc4a7046c6b54670** on fix/p1-22-t10-completions-by-day-20261116 (ls-remote MATCH).
- File `supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day.sql`, recomputed sha256 **1bd25b2ab28de131727ccfa52cdab91180c3043ac85cc6688fc563b7a1b42af6** (MATCH) immediately before apply. 2865 bytes.
- Rollback `…/20261116151000_p1_22_t10_completions_by_day_rollback.sql`, recomputed sha256 **e24bc60be22ac760a8aec1670aa0b444b53477f438b9e2c6dc60cd31ec696f17** (MATCH). Not applied. Restores the live-before-apply value_actions text (viewdef md5 758e3d8a…) and drops ops.protocol_completion_days.

## Pre-read (read-only execute_sql, 7:09 PM ET, also recorded in the correction)
- ops.value_actions viewdef md5 (pg_get_viewdef, pretty) = **758e3d8ad5cd04297470b0a4af8e3d3b**. Columns `user_id:uuid,at:timestamp with time zone,kind:text`, owner postgres, ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, reloptions none.
- Live ops.value_actions protocol_completion rows = **22**. public.protocol_completions = **22**.
- ops.protocol_completion_days did not exist. SELECT of the exact new view body returned **15** user-days (max raw_rows 1).
- ops.internal_accounts count = **5** (prefixes 2ecf5946, 3a024218, 7c71e421, 9b89b8c3, c414e503). Account 7c71e421 has 7 completion rows; no other listed account has a completion row.
- M1 (ops.retention_m1): **1:7/4/3, 7:7/2/2, 14:7/2/2, 30:6/1/1**.
- list_migrations head: **20261117000244** p1_22_checkout_deduped_exclude_test. Name p1_22_t10_completions_by_day and version 20261117001014 were not present. Version 20261116151000 was not present.

## Apply
- MCP apply_migration, name `p1_22_t10_completions_by_day`, query passed by file substitution of the exact 2865-byte file (sha 1bd25b2a…).
- Started 7:10:10 PM ET (America/New_York). MCP returned success by 7:10:16 PM ET (America/New_York).
- **Applied (live) id: 20261117001014** (list_migrations new head 20261117001014 p1_22_t10_completions_by_day; one new entry after 20261117000244). The version timestamp is 2026-11-17 00:10:14 UTC = 7:10:14 PM ET.

## Read-back (read-only execute_sql, 7:10:16 PM ET)
- ops.protocol_completion_days viewdef md5 = **3b79c2610b598f61c3203f9fe30ee7e3** (starts with 3b79c261, MATCH). Columns `user_id:uuid,local_date:date,tz_used:text,raw_rows:bigint,first_at:timestamp with time zone,last_at:timestamp with time zone`, owner postgres, ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, reloptions none. Row count = **15** (MATCH).
- ops.value_actions viewdef md5 = **16f3d342b4319c1e6df994a3ec0f65ae** (matches the PGlite expected value in receipt 700f12db). Columns, owner, ACL and reloptions **unchanged** from the pre-read. protocol_completion rows = **15** (pre 22). protocol_session rows = 24 (unchanged). assessment rows = 22 (unchanged).
- public.protocol_completions is still **22** (no stored rows written or deleted). ops.internal_accounts is still **5**.
- M1 after: **1:7/4/3, 7:7/2/2, 14:7/2/2, 30:6/1/1** (unchanged from the pre-read, MATCH).
- Rollback was not applied.

## Rename (repo only, pure rename)
- Branch `chore/t10-migration-rename-20261117` from 04905e8e41edb32076256bc4cc4a7046c6b54670, commit **a373a08f45e3c8438a48ab4537843323b5074c24** (plain push, new branch; origin ls-remote MATCH). main not updated.
- `supabase/migrations-unapplied/20261116151000_p1_22_t10_completions_by_day.sql` → `supabase/migrations/20261117001014_p1_22_t10_completions_by_day.sql`; same for the rollback file. numstat 0/0, 100% rename, sha256 unchanged (1bd25b2a… and e24bc60b…). Never re-apply.

## Rollback (not applied)
- Path in this folder and, after the rename, `supabase/migrations/20261117001014_p1_22_t10_completions_by_day_rollback.sql`.
- sha256: **e24bc60be22ac760a8aec1670aa0b444b53477f438b9e2c6dc60cd31ec696f17**
- Apply only via MCP apply_migration with its own gate. Restores value_actions viewdef md5 758e3d8ad5cd04297470b0a4af8e3d3b and drops ops.protocol_completion_days. Expected value_actions protocol_completion rows would return to 22 if the underlying completions are unchanged. M1 should remain 1:7/4/3, 7:7/2/2, 14:7/2/2, 30:6/1/1, because M1 already excludes the same accounts.

## Correction file
- /workspace/process/batches/base-engagement-20261115/P1-22-T10-completions-dedupe-20261116/CORRECTION-T10-COUNTS-20261116.md
- sha256: **302aee2c31c38d907b3c63f5cd94b43d04bf77f3659cb73a9ae591772f1eb99e**
- Written 7:09 PM ET, before this apply. Receipt 700f12db was not edited.
