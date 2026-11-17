# BUILD-NOTES-v2: P1-22 anon revokes 20261117020000 (off origin/main)

Monday Nov 16, 2026, 8:15 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied or deployed. New branch only. The old branch fix/p1-22-revoke-anon-execute-20261115 @ 72d57ad9 was not rewritten, deleted, or force-pushed (ls-remote still 72d57ad97dd9efaac8bdc02f927c660318987906). v1 pack files (RECEIPT-P1-22-REVOKES-20261116.md, SHA256SUMS, 20261116040600_*.sql, 72d57ad9.patch) were not overwritten.

## Why v2

Margot's pin, relayed by Grant at 8:13 PM ET: 72d57ad9 sits on parent 5366b22c, which is not on main, and its version 20261116040600 is older than the live head 20261117010702.

## Version check (repo filename 20261117020000)

- Live schema_migrations head, read-only execute_sql, project cqzvqzwwevnflinxgnpp, 8:14 PM ET: 20261117010702 p1_18_assessment_feedback (prior: 20261117010651 p1_18_session_feedback).
- Max migration prefix at any git ref tip (heads + origin/*): 20261117010702 (feat/p1-18-session-feedback-20261117 after rename ddefff93).
- Unapplied P1-25 repo filenames 20261117010000 / 20261117010100 / 20261117010200 are earlier than 20261117020000.
- Obsolete pre-rename P1-18 process-pack names 20261117120000 / 20261117120100 are not at any ref tip (renamed to 20261117010651 / 20261117010702). 20261117020000 is after every current repo-tip and live migration.

## Commit

- Repo ESSENTIALS-ppl/romrxbjj-v2, branch fix/p1-22-revoke-anon-execute-v2-20261116 (plain push of a new branch; ls-remote MATCH).
- sha: 15d074fcc27bbf7fa6fd22807c87848d17f1cb20
- parent: a34aa573a160c674cfdf9660cec30304161f1044 (origin/main). Nothing from a34aa573 was re-applied.
- `git show --format= --patch` sha256 6a56e54032e3648d9b5afcef758265185199cca9ffbc94ca96a1a75d8a090c69
- `git patch-id --stable` df15fcd5972ced479705501c6edf4757a4120204
- 2 files, +92 / -0

### Hunk 1 of 2 — supabase/migrations/20261117020000_p1_22_revoke_anon_execute.rollback.sql.txt

`@@ -0,0 +1,30 @@` (new file). Content sha256 0d839238b643b43b2c6ef97e77dcd34548b47065e19cbbae1b76f23c0fb5e363. Rollback only. Statement body is byte-identical to the 72d57ad9 rollback (b2bc6a71). The sha changed only because two header comments now name 20261117020000 instead of 20261116040600. Restores the exact live EXECUTE grants recorded in the header (live read Nov 15, 10:21 PM ET). Clears privileges first, then re-grants so the ACL text matches. Does not drop the functions or change bodies.

### Hunk 2 of 2 — supabase/migrations/20261117020000_p1_22_revoke_anon_execute.sql

`@@ -0,0 +1,62 @@` (new file). Content sha256 1ed192abe7c92c34f0610d4b1c60ddf903f2aead4a41cd02a5abaa03d9b468f1. This is not 49aa703f: the sha changed only because of version header comments (restamp onto origin/main, live head 20261117010702, repo filename 20261117020000). All REVOKE and GRANT statements are byte-identical to 72d57ad9 (49aa703f). Repo filename 20261117020000 only; the real id is stamped at apply via MCP apply_migration, then a pure-rename commit. REVOKE ALL FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role, postgres on:

- public.product_event_kind(text)
- public.record_protocol_completions(uuid, uuid, text, uuid[])
- public.tg_protocol_session_completion()
- ops.is_excluded_from_metrics(uuid) (already in the target shape on live; revoke is idempotent)

## Tests

PGlite 0.5.16, same harness as v1 (test.mjs not modified). MIG_PATH / RB_PATH pointed at the v2 files. 11/11 PASS, exit 0, 8:15 PM ET. Log: pglite-retest-v2-20261116.txt.

## Not changed

Old branch 72d57ad9, function bodies, measurement 030659, webhook, renewal path, no apply, no deploy, no force-push, no branch deletion. /workspace/SHA256SUMS and v1 SHA256SUMS left alone.
