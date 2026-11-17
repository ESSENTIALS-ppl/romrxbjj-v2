# RECEIPT: P1-29 coach_roster security_invoker APPLIED as 20261117014937

Written Monday Nov 16, 2026, 8:50 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP `apply_migration` only (no CLI, no `db push`), exact file bytes of origin pin `ae58b91f316ca757d130a612a30c05a620e6fee3`. The apply returned success on the first call; no retries. Never applied SQL 81af8e0, the old delete package, or a34aa573. Rollback `3ff0affb` NOT applied. No data rows changed (0 coaches, 0 linked athletes, 0 `coach_roster` rows before and after). Renewal cron job 1 not touched. Account 7c71e421 not touched. No secrets or user emails in this receipt or in the applied SQL. Never re-apply this migration. `feature_flags` was not touched.

## Gate (verified before any apply)

- L1031 = ledger file line **1210** (2026-11-15 8:47 PM ET): Jim, verbatim: "Do all of them. Anything I need to do I'll do tomorrow. After velvet ops gets back do it." Sable reading: all 31 Base engagement items in the L1029 project.
- L1229 = ledger file line **1580** (2026-11-16 7:56 PM ET): Jim, verbatim: "I said go on all 31 things." Covers all 31 Base engagement items in L1029/L1031.
- P1-29 is item **29** of those 31 (P1-01 through P1-31). LIVE-TRACKER line **630**: "P1-29 | Fix coach_roster security definer view, the only security ERROR; coach-facing, not Base (B11)". Released from HOLD by L1229 / L1294; the "not Base" tag does not take it out of the 31 numbered items.
- L1282 = ledger file line **1685** (2026-11-16 8:29 PM ET): PIN (P1-29 coach_roster security_invoker). Bytes: `ae58b91f`, SQL `b4861884`, rollback `3ff0affb`, receipt `5fca17c9`, SUMS `1aaaef82`, evidence `e8c7e40c`. Authority cited: L1031, L1229.
- L1292 = ledger file line **1705** (2026-11-16 8:32 PM ET): Vera precheck VERIFIED with 1 WARN (column scope; not a stop). File `/workspace/vera-verdicts/vera-ae58b91f-P1-29-precheck-20261116.md`, sha256 **464244fa9d9143ea2afefd61ad7bdb4e5b2abe7655746ef6be314d755295e277**. G1 PASS on L1031 and L1229.
- L1294 = ledger file line **1709** (2026-11-16 8:32 PM ET): RELEASE. "APPLY MAY PROCEED ON L1282 BYTES; VERA POST-CHECK AFTER."
- L1309 = ledger file line **1730** (2026-11-16 8:44 PM ET): Sable ruling: MCP migrations are cleared and do not wait on Jim's CLI tap. "Jim's go on all 31 covers P1-27, P1-29 and P1-29b, and they stay on MCP." Authority: L1031 and L1229 plus this ruling. Per-item gates under L881 still apply. P1-29b applies only after P1-29.
- L1230 (ledger file line **1582**): Sable standing OK covers apply after a Vera precheck that passes on content, under Jim's L1229 line.
- Grant relayed GO NOW for this MCP apply (P1-29b still waits on Vera's delta PASS).
- Commit `ae58b91f316ca757d130a612a30c05a620e6fee3` on `origin/feat/p1-29-coach-roster-security-invoker-20261116`, parent `a34aa573` (origin/main). SQL at that commit:

  - `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.sql` sha256 **b4861884e9b69c0fb06680a12801c50a91b10020204c1dd128221f42b19d16d9** (1228 bytes). MATCH vs worktree and pack.
  - Rollback `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.rollback.sql.txt` sha256 **3ff0affbb6fd10569d7105fe53eae7238e5986fd593cc5f0f6357cdf3e56c164** (390 bytes). MATCH. Ready, not applied.

## Pre-read (read-only, 8:49:27.423231 PM ET)

- `list_migrations`: head **20261117013428** `p1_25_purge_deleted_accounts_cron`. No `p1_29` / `coach_roster` migration. Not already applied. Tail before apply:

  - 20261117000045 `p1_22_staff_list`
  - 20261117000244 `p1_22_checkout_deduped_exclude_test`
  - 20261117001014 `p1_22_t10_completions_by_day`
  - 20261117010651 `p1_18_session_feedback`
  - 20261117010702 `p1_18_assessment_feedback`
  - 20261117012431 `p1_22_revoke_anon_execute`
  - 20261117013401 `p1_25_completion_cleanup`
  - 20261117013410 `p1_25_purge_deleted_accounts`
  - 20261117013428 `p1_25_purge_deleted_accounts_cron`

- `public.coach_roster`: exists, relkind `v`, owner `postgres`, reloptions **`{security_barrier=true}`** only (no `security_invoker`).
- Policy `"users: linked coach reads roster athletes"`: **absent**.
- `public.users` policies before (4):

  | policyname | cmd | roles | qual | with_check |
  |---|---|---|---|---|
  | users: school admin reads school users | SELECT | {public} | `(EXISTS ( SELECT 1 FROM schools s WHERE ((s.admin_id = ( SELECT auth.uid() AS uid)) AND (s.id = users.school_id))))` | null |
  | users: self read | SELECT | {public} | `(( SELECT auth.uid() AS uid) = id)` | null |
  | users: self update | UPDATE | {public} | `(( SELECT auth.uid() AS uid) = id)` | null |
  | users: service role full access | ALL | {public} | `(current_setting('role'::text) = 'service_role'::text)` | null |

- cron.job: **14** jobs. md5(string_agg(jobid\|schedule\|command\|active, E'\n' ORDER BY jobid)) = **0beb8bc4976fc129be2d26c88096c252** (expected). Job 1 `send-renewal-reminders-daily`, schedule `0 12 * * *`, active true, command md5 **caab15b0a3b771bccfd127f7c3db4df2**.
- Counts (no names): coaches **0**, linked athletes (`athletes.coach_id IS NOT NULL`) **0**.

## Apply (MCP apply_migration, exact file bytes)

- Tool: Supabase MCP `apply_migration` only. Name: `p1_29_coach_roster_security_invoker` (file stem after the timestamp). Query: exact 1228-byte file from `ae58b91f` (sha256 `b4861884…`), passed by file substitution. No `--yes`, no CLI, no `db push`.
- Result: `{success: true}` on the first call.
- Live migration id: **20261117014937** / `p1_29_coach_roster_security_invoker`.
- Time: **8:49:37 PM ET** (America/New_York). The MCP version `20261117014937` is 2026-11-17 01:49:37 UTC, which is 8:49:37 PM ET. Bounded by the pre-read at 8:49:27.423231 PM ET and the post-read at 8:49:41.575345 PM ET.

## Post-read (read-only, 8:49:41.575345 PM ET)

- `list_migrations`: new head **20261117014937** `p1_29_coach_roster_security_invoker`. Only this row was added. Prior head 20261117013428 remains immediately before it. Do not re-apply.
- `public.coach_roster` reloptions: **`{security_barrier=true, security_invoker=true}`**. `security_invoker` is on; `security_barrier` is kept. Owner still `postgres`.
- Policy `"users: linked coach reads roster athletes"`: **present**. SELECT, roles `{authenticated}`, with_check null, qual:

  `(EXISTS ( SELECT 1 FROM (athletes a JOIN coaches c ON ((c.id = a.coach_id))) WHERE ((a.user_id = users.id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))`

- `public.users` policies after (5): the four before-policies are unchanged (same names, cmd, roles, qual, with_check). The new linked-coach SELECT policy is the only addition.
- cron.job: **14** jobs, md5 still **0beb8bc4976fc129be2d26c88096c252**. Job 1 name, schedule, active flag, and command md5 **caab15b0a3b771bccfd127f7c3db4df2** unchanged. Renewal cron job 1 was not touched.
- Counts (no names): coaches **0**, linked athletes **0**, `select count(*) from public.coach_roster` **0**. No data changed.
- Grants on `public.coach_roster` (SQL did not GRANT or REVOKE; recorded after apply): no `anon` grant. `authenticated`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE (not TRUNCATE; is_grantable NO). `postgres`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (is_grantable YES). `service_role`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (is_grantable NO).
- `public.feature_flags` reloptions still null (untouched; out of scope).

## Rollback (READY, NOT APPLIED)

- Path in the pin (commit `ae58b91f`): `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.rollback.sql.txt`
- Path after the rename commit: `supabase/migrations/20261117014937_p1_29_coach_roster_security_invoker.rollback.sql.txt`
- Pack copies (bytes identical): `20261117020100_p1_29_coach_roster_security_invoker.rollback.sql.txt` and `APPLIED-20261117014937_p1_29_coach_roster_security_invoker.rollback.sql.txt`
- sha256 **3ff0affbb6fd10569d7105fe53eae7238e5986fd593cc5f0f6357cdf3e56c164**
- Drops the new users policy and `ALTER VIEW public.coach_roster RESET (security_invoker)`; leaves `security_barrier=true`. Not applied. Do not auto-rollback.

## Pack copies of the applied bytes

- `APPLIED-20261117014937_p1_29_coach_roster_security_invoker.sql` — sha256 `b4861884…`, byte-identical to the pin file and to `20261117020100_p1_29_coach_roster_security_invoker.sql` already in this pack.
- `APPLIED-20261117014937_p1_29_coach_roster_security_invoker.rollback.sql.txt` — sha256 `3ff0affb…`, standby only.

## Rename (pure rename, no content change)

- Temp worktree `/tmp/wt-p1-29-rename` (detached at `ae58b91f`). The shared worktree `/workspace/p1-29-coach-roster-20261116` was not used.
- Commit **b231c55d29ada2b7f0acb0368fdb8a394843707d** on `origin/feat/p1-29-coach-roster-security-invoker-20261116`. Parent `ae58b91f316ca757d130a612a30c05a620e6fee3`. Fetch, no rebase needed (origin still `ae58b91f`), plain push (no force). `git ls-remote origin refs/heads/feat/p1-29-coach-roster-security-invoker-20261116` = **b231c55d29ada2b7f0acb0368fdb8a394843707d** (MATCH).
- numstat 0/0, 100% rename, sha256 unchanged for both files:

  - `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.sql` → `supabase/migrations/20261117014937_p1_29_coach_roster_security_invoker.sql` (`b4861884…`)
  - `supabase/migrations/20261117020100_p1_29_coach_roster_security_invoker.rollback.sql.txt` → `supabase/migrations/20261117014937_p1_29_coach_roster_security_invoker.rollback.sql.txt` (`3ff0affb…`)

- `scripts/p1-29-coach-roster-test/test.mjs` still points at the old `20261117020100` path. Left unchanged (pure rename of the migration files only).
- Never re-apply.

## 29b / 29c filename notes (not updated)

Per instruction, those trees were not edited. They still mention `20261117020100_p1_29_coach_roster_security_invoker`:

- P1-29b SQL/rollback comments and `tests/test.mjs` (`P129_PATH`) on `feat/p1-29b-coach-linked-athletes-20261116` (pin `89b0be9c`). The P1-29b receipt already says live ids will be MCP-assigned and that P1-29b must be applied after P1-29 in wall-clock order. The PGlite test replays P1-29 from commit `ae58b91f`, where the old filename still exists, so that test path remains valid against `ae58b91f`.
- P1-29c SQL comment and `tests/test.mjs` (`P129.p`) likewise pin the `ae58b91f` path and sha `b4861884…`.

P1-29b (20261117020300 / f0558b74) still sorts after the live id 20261117014937 and must wait on Vera's delta PASS, then apply after this one. Rollback of this apply stays ready at `3ff0affb`.

## Not done

- Vera post-check (required under L881 / L1294).
- P1-29b not applied (waits on Vera's delta PASS).
- Rollback not applied.
- No CLI steps. No secrets, switches, or function deploys.
- Cron not changed. No emails sent. No accounts edited.
