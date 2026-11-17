# BUILD-NOTES: P1-22 anon revokes 72d57ad9 SQL + rollback (2026-11-16 confirmation pack)

Monday Nov 16, 2026, 8:06 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied or deployed. Nov 15 rebuilt receipts in P1-22-revokes-20261115/ were not overwritten.

A previous run of this work was stopped by a rate limit. Checked first: origin/fix/p1-22-revoke-anon-execute-20261115 still 72d57ad97dd9efaac8bdc02f927c660318987906 (git ls-remote); SQL 49aa703f and rollback b2bc6a71 unchanged; live proacl still the pre-apply shape; no 20261116 pack on disk. Continued from that baseline. No new romrxbjj-v2 commit.

## Commit already on origin (unchanged)

- Branch: fix/p1-22-revoke-anon-execute-20261115
- sha: 72d57ad97dd9efaac8bdc02f927c660318987906
- parent: 5366b22c8df6641b3418b9009e1db757ca228dbe
- `git show --format= --patch` sha256 81bd42bc770eefc943a151a88a2a57bea497c3f3060b0e2e742fa1a0b368b7d3
- `git patch-id --stable` 9af429968a0704569fcb51d8c9b9ededcdfcd4b9
- 2 files, +85 / -0

### Hunk 1 of 2 — supabase/migrations/20261116040600_p1_22_revoke_anon_execute.rollback.sql.txt

`@@ -0,0 +1,30 @@` (new file in 72d57ad9). Content sha256 b2bc6a71a04f02b7448118cbda125766ca0a8424f103b039bdec27406bb3b1ff. Rollback only. Restores the exact live EXECUTE grants recorded in the header (live read Nov 15, 10:21 PM ET). Clears privileges first, then re-grants so the ACL text matches, not just the privilege set. Does not drop the functions or change bodies.

### Hunk 2 of 2 — supabase/migrations/20261116040600_p1_22_revoke_anon_execute.sql

`@@ -0,0 +1,55 @@` (new file in 72d57ad9). Content sha256 49aa703fb7be7cdd8a12c37ccd92caf1c18113e6cbf0117df510405e915cf95f. Repo filename 20261116040600 only; the real id is stamped at apply via MCP apply_migration. REVOKE ALL FROM PUBLIC, anon, authenticated and GRANT EXECUTE TO service_role, postgres on:

- public.product_event_kind(text)
- public.record_protocol_completions(uuid, uuid, text, uuid[])
- public.tg_protocol_session_completion()
- ops.is_excluded_from_metrics(uuid) (already in the target shape on live; revoke is idempotent)

## This 20261116 pack (new files; not a repo commit)

Copies of those two SQL files (byte-identical to 72d57ad9), 72d57ad9.patch (sha256 81bd42bc…), patch-id file, PGlite retest log, this note, the receipt, and SHA256SUMS. Local worktree /workspace/p1-22-revoke-anon-execute-20261115 remains on parent 5366b22c with the two files untracked and byte-identical to the commit; it was not used as a source and was not changed.

## Live proacl at this confirmation (read-only execute_sql, 8:02 PM ET)

Same as the 72d57ad9 header and the Nov 15 10:46 PM ET rebuild read. Migration 20261116040600 is still unapplied (schema_migrations head 20261117001014; no p1_22_revoke_anon_execute row). A different, older row 20260915163315 p1_revoke_anon_execute_definer_rpcs exists and is not this item.

- ops.is_excluded_from_metrics(p_user_id uuid): {postgres=X/postgres,service_role=X/postgres}, prosecdef true
- public.product_event_kind(p_event text): {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}, prosecdef false
- public.record_protocol_completions(p_session_id uuid, p_assessment_id uuid, p_joint text, p_exercise_ids uuid[]): {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}, prosecdef false
- public.tg_protocol_session_completion(): {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}, prosecdef true

## Tests

PGlite 0.5.16, scratch /tmp/p122-revoke-retest-20261116, SQL/rollback from this pack (bytes 49aa703f / b2bc6a71). Command: node test.mjs with MIG_PATH and RB_PATH set. 11/11 PASS, exit 0. Log: pglite-retest-20261116.txt. The Nov 15 test/ folder was not modified.

## Not changed

Function bodies, measurement 030659, webhook, renewal path, no apply, no deploy, no force-push. /workspace/SHA256SUMS left alone.
