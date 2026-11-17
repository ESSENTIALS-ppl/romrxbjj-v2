# RECEIPT, L1170: P1-22 staff-list insert APPLIED as 20261117000045

Written Mon Nov 16, 2026, 7:01 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push). No deletes. No other tables written. Account 7c71e421 touched only as its reference row in this insert. Family id f6fc91d5 was not inserted. No secrets or user emails in this receipt or in the applied SQL.

## Gate
- Ledger L1031 (Jim: "Do all of them…"); L1170 (Margot gate line, MATCHED, SQL block sha b152a965…); L1177 (Sable OK, conditional on the rollback pin); L1179 (Margot pin of rollback sha f8c32fa6…, which activated the L1177 OK); Grant GO relayed at 6:56 PM ET (America/New_York).
- Applied bytes are the SQL fence body in /workspace/research/base-comp-20261115/reid/P1-22-STAFF-LIST.md (file sha f6b4835261dc0fb1477ca5085b543c4beb14d83f2717c508c1d66db79aa3022d), also saved as P1-22-STAFF-LIST-INSERT-b152a965.sql in this folder. Recomputed sha256 of those exact bytes: **b152a965d8b283d3abc5280b0e85e18e6d0096e4a9e77719df3ff2b99f949a14** (MATCH). 703 bytes, trailing newline included.
- Content check before apply: one transaction inserting exactly these 5 user_ids into ops.internal_accounts (user_id, note), ON CONFLICT (user_id) DO NOTHING, and nothing else: 3a024218…, 7c71e421…, c414e503…, 9b89b8c3…, 2ecf5946…. f6fc91d5 is not in the file.
- Rollback /workspace/research/base-comp-20261115/reid/P1-22-STAFF-LIST-ROLLBACK.sql (copy in this folder) recomputed sha256 **f8c32fa688921240aa2bd1efbf91bec5c5331526b908fdaa416d98dc7cc63ba0** (MATCH, L1179). One DELETE of exactly those 5 ids; nothing else. Not applied.

## Pre-read (read-only execute_sql, just before apply)
- ops.internal_accounts total_rows = **0**. already_present_of_5 = **0**. Prefix read-back of the 5 ids: empty.
- list_migrations head: **20261116144054** skip_quick_reads (L1134 step 2d). Name p1_22_staff_list and version 20261117000045 were not present.

## Apply
- MCP apply_migration, name `p1_22_staff_list`, query passed by file substitution of the exact 703-byte file (sha b152a965…).
- Started 7:00:43 PM ET (America/New_York). MCP returned success by 7:00:47 PM ET (America/New_York).
- **Applied (live) id: 20261117000045** (list_migrations new head 20261117000045 p1_22_staff_list; one new entry after 20261116144054). The version timestamp is 2026-11-17 00:00:45 UTC = 7:00:45 PM ET.

## Read-back (read-only execute_sql, 7:00:47 PM ET)
- ops.internal_accounts total_rows = **5** (pre 0, delta **+5**).
- present_of_5 = **5**. Rows inserted = **5**.
- Read-back of the 5 id prefixes (ordered): **2ecf5946**, **3a024218**, **7c71e421**, **9b89b8c3**, **c414e503**. All five expected prefixes are present; total row count is 5, so no other rows were added.

## Rename (repo)
- No repo migration file was found in /workspace/romrxbjj-v2 (all branches and worktrees, including supabase/migrations-unapplied) whose bytes hash to b152a965, and no staff-list or internal_accounts insert file exists in that repo. The pinned source is the SQL fence in Reid's P1-22-STAFF-LIST.md, not a repo unapplied migration.
- Therefore no pure-rename commit was made, and nothing was pushed to a chore/l1170-migration-rename-20261116 branch. main was not touched. Rename commit sha: none.

## Rollback (not applied)
- Path: /workspace/research/base-comp-20261115/reid/P1-22-STAFF-LIST-ROLLBACK.sql
- sha256: **f8c32fa688921240aa2bd1efbf91bec5c5331526b908fdaa416d98dc7cc63ba0**
- Apply only via MCP apply_migration with its own gate. Expect DELETE 5, then count 0.
