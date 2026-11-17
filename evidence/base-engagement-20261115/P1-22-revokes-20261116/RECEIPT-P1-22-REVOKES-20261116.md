# RECEIPT: P1-22 anon revokes 72d57ad9 SQL + rollback (BUILD ONLY, 2026-11-16 confirmation)

Monday Nov 16, 2026, 8:06 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied, deployed, or written to Supabase. No secrets or user emails printed. Nov 15 rebuilt files in P1-22-revokes-20261115/ were not overwritten.

## Stopped-run check

origin ls-remote refs/heads/fix/p1-22-revoke-anon-execute-20261115 = 72d57ad97dd9efaac8bdc02f927c660318987906 at the start of this run (unchanged). No 20261116 pack was on disk. Live ACLs still pre-apply. Continued by packaging the existing commit and re-testing; no new repo commit.

## Branch / commit / patch

- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **fix/p1-22-revoke-anon-execute-20261115** (already on origin; plain push from Nov 15; ls-remote MATCH tonight).
- Commit **72d57ad97dd9efaac8bdc02f927c660318987906**, parent **5366b22c8df6641b3418b9009e1db757ca228dbe**.
- Patch sha256 (`git show --format= --patch`): **81bd42bc770eefc943a151a88a2a57bea497c3f3060b0e2e742fa1a0b368b7d3**
- `git patch-id --stable`: **9af429968a0704569fcb51d8c9b9ededcdfcd4b9**
- SQL sha256: **49aa703fb7be7cdd8a12c37ccd92caf1c18113e6cbf0117df510405e915cf95f**
- Rollback sha256: **b2bc6a71a04f02b7448118cbda125766ca0a8424f103b039bdec27406bb3b1ff**

## Every hunk in 72d57ad9

1. supabase/migrations/20261116040600_p1_22_revoke_anon_execute.rollback.sql.txt `@@ -0,0 +1,30 @@` (rollback, not applied)
2. supabase/migrations/20261116040600_p1_22_revoke_anon_execute.sql `@@ -0,0 +1,55 @@` (unapplied; repo filename 20261116040600; real id stamped at apply via MCP apply_migration)

What it does is unchanged from the Nov 15 receipt: revoke PUBLIC, anon, and unused authenticated EXECUTE on the three public P1-22 functions, repeat the same revoke idempotently on ops.is_excluded_from_metrics, and re-grant EXECUTE to service_role and postgres. Trigger fire on a session insert does not need caller EXECUTE on the trigger function. No function bodies change. This closes Vera's L1127(1) WARN; it still needs its own gate line (L1127, L1130(2)).

## Live read-only, 8:02 PM ET, project cqzvqzwwevnflinxgnpp

schema_migrations head 20261117001014. No 20261116040600 / p1_22_revoke_anon_execute row. proacl and prosecdef MATCH the 72d57ad9 header (see BUILD-NOTES.md). Still unapplied.

## Tests

PGlite 0.5.16, 11/11 PASS, exit 0, Monday Nov 16, 2026 8:04 PM ET. Same coverage as the Nov 15 harness (T0 live grant shape through T8 reapply and trigger fire). Log: pglite-retest-20261116.txt.

## Open questions

1. A live signed-in save after apply stays NOT TESTED until someone with a real login (Jim or a beta tester) does it (L1130(2)). This pack does not use real customers or fixture 076ce453.
2. The real migration id will differ from the repo filename 20261116040600; apply must go through MCP apply_migration, then a pure-rename commit to the live id. Never re-apply 72d57ad9 after that rename.
3. The local worktree /workspace/p1-22-revoke-anon-execute-20261115 is still on the parent with untracked matching files. Harmless; do not commit from that dirty worktree.

## Not done

Nothing applied. Needs a Margot gate line on 72d57ad9 / 49aa703f / b2bc6a71 and Vera's PASS, relayed by Grant, before any apply.
