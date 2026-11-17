# RECEIPT: P1-22 anon revokes v2 (BUILD ONLY), 20261117020000 off origin/main

Monday Nov 16, 2026, 8:15 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied, deployed, or written to Supabase. No secrets or user emails printed. v1 files in this folder (RECEIPT-P1-22-REVOKES-20261116.md sha256 ff6e4b82…, SHA256SUMS 55e156a3…, SQL 49aa703f, rollback b2bc6a71) were not overwritten. The old branch was not rewritten or deleted.

## Why this pack exists

Margot's pin, relayed by Grant at 8:13 PM ET: 72d57ad9 sits on parent 5366b22c, which is not on main, and its version 20261116040600 is older than the live head 20261117010702. New branch off current origin/main; same statement bodies; repo filename restamped after the live head.

## Branch / commit / patch

- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **fix/p1-22-revoke-anon-execute-v2-20261116** (plain push of a new branch; `git ls-remote` MATCH 15d074fcc27bbf7fa6fd22807c87848d17f1cb20). Old branch `fix/p1-22-revoke-anon-execute-20261115` still 72d57ad97dd9efaac8bdc02f927c660318987906. origin/main still a34aa573a160c674cfdf9660cec30304161f1044 (not pushed, not re-applied).
- Commit **15d074fcc27bbf7fa6fd22807c87848d17f1cb20**, parent **a34aa573a160c674cfdf9660cec30304161f1044**.
- Patch sha256 (`git show --format= --patch`): **6a56e54032e3648d9b5afcef758265185199cca9ffbc94ca96a1a75d8a090c69**
- `git patch-id --stable`: **df15fcd5972ced479705501c6edf4757a4120204**
- SQL sha256: **1ed192abe7c92c34f0610d4b1c60ddf903f2aead4a41cd02a5abaa03d9b468f1**
- Rollback sha256: **0d839238b643b43b2c6ef97e77dcd34548b47065e19cbbae1b76f23c0fb5e363**

The SQL sha changed from 49aa703f: only version header comments were edited (restamp 20261117020000, parent origin/main, live head 20261117010702). All REVOKE and GRANT statements are byte-identical to 72d57ad9. The rollback sha changed from b2bc6a71 for the same reason (two header lines now name 20261117020000).

## Every hunk in 15d074fc

1. supabase/migrations/20261117020000_p1_22_revoke_anon_execute.rollback.sql.txt `@@ -0,0 +1,30 @@` (rollback, not applied)
2. supabase/migrations/20261117020000_p1_22_revoke_anon_execute.sql `@@ -0,0 +1,62 @@` (unapplied; repo filename 20261117020000; real id stamped at apply via MCP apply_migration, then a pure-rename commit)

What the statements do is unchanged from 72d57ad9 / L1127(1): revoke PUBLIC, anon, and unused authenticated EXECUTE on the three public P1-22 functions, repeat the same revoke idempotently on ops.is_excluded_from_metrics, and re-grant EXECUTE to service_role and postgres. No function bodies change.

## Version check

Live head 20261117010702 (p1_18_assessment_feedback), confirmed read-only at 8:14 PM ET. Max migration prefix at any git ref tip is also 20261117010702. 20261117020000 is after both. See BUILD-NOTES-v2.md for the P1-25 and obsolete P1-18 filename notes.

## Tests

PGlite 0.5.16, 11/11 PASS, exit 0, Monday Nov 16, 2026 8:15 PM ET. Same harness as v1, paths pointed at the v2 files. Log: pglite-retest-v2-20261116.txt.

## Open questions

1. A live signed-in save after apply stays NOT TESTED until someone with a real login (Jim or a beta tester) does it (L1130(2)). This pack does not use real customers or fixture 076ce453.
2. The real migration id will differ from the repo filename 20261117020000; apply must go through MCP apply_migration, then a pure-rename commit to the live id. Never re-apply 15d074fc after that rename. Never re-apply 72d57ad9.

## Not done

Nothing applied. Needs a Margot gate line on 15d074fc / 1ed192ab / 0d839238 and Vera's PASS, relayed by Grant, before any apply. 72d57ad9 is superseded for gating by this v2 sha.
