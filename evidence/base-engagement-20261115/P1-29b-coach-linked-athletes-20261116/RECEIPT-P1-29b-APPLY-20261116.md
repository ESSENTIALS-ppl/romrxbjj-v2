# RECEIPT: P1-29b coach_linked_athletes APPLIED as 20261117020743

Written Monday Nov 16, 2026, ~9:12 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. Supabase MCP `apply_migration` only (no CLI, no `db push`), exact file bytes of pin `89b0be9c37866e0ce227368c252a62b46d7dbfa8`. Success on the first call, no retries. Rollback `b1de7f7a` NOT applied. No data rows changed (0 coaches, 0 linked athletes before and after). Cron job 1 not touched. Account 7c71e421 not touched. No secrets or user emails here or in the SQL. Never re-apply this migration. Never applied SQL 81af8e0, the old delete package, or a34aa573.

## Gate
- Grant relay 9:06 PM ET: P1-29b VERIFIED by Vera (afbaea0d); Sable's OK applies. APPLY via MCP with exact pinned bytes f0558b74; cite addendum e601c0e7.
- Jim: 9:02 PM ET tap on card t2043s6428; L1031 "Do all of them."; L1229 "go on all 31 things."
- L1309 (Sable): MCP migrations are cleared, do not wait on the CLI tap; "covers P1-27, P1-29 and P1-29b"; P1-29b applies only after P1-29 (live 20261117014937, applied 8:49:37 PM ET).
- Pack receipt `RECEIPT-P1-29b-20261116.md` sha256 **7de8fee8c598348c749571d0fd1a2bade72742099b93ed75649902fcedf7e19e** (unchanged).
- Addendum `ADDENDUM-1-P1-29b-20261116.md` sha256 **e601c0e7cc838be8b3699a46819825aca77374338c0ee50292cdb456cfb938a9** (unchanged): service_role SELECT on coach_roster becomes "permission denied for function coach_linked_athletes"; 0 code readers. Confirmed live below.

## Bytes
- `git show 89b0be9c:supabase/migrations/20261117020300_p1_29b_coach_linked_athletes.sql` sha256 **f0558b7459d71dba8345fc88bed78258dc701be9378970b5617a6f58a259966b** (2075 bytes). MATCH vs pin and vs pack copy `20261117020300_p1_29b_coach_linked_athletes.sql`.
- Rollback `...rollback.sql.txt` sha256 **b1de7f7a59a20a8abcf4ca3942f7a783236d305758cf0e3e1b8267789a436066**. Ready, not applied.

## Pre-read (read-only, 9:07:31 PM ET)
- `list_migrations`: 193 rows, head **20261117014937** `p1_29_coach_roster_security_invoker` (P1-29). No p1_29b row. (`logs-apply/list_migrations-before.txt`)
- cron.job **14**, md5 **0beb8bc4976fc129be2d26c88096c252**; job 1 `send-renewal-reminders-daily` `0 12 * * *` active true, command md5 **caab15b0a3b771bccfd127f7c3db4df2**.
- `public.coach_roster` reloptions `{security_barrier=true,security_invoker=true}`; definition joined `users u` directly (u.full_name, u.belt).
- `public.coach_linked_athletes()`: **absent**.
- `public.users` policies (5): `users: linked coach reads roster athletes` (SELECT, {authenticated}), `users: school admin reads school users` (SELECT), `users: self read` (SELECT), `users: self update` (UPDATE), `users: service role full access` (ALL).
- Total pg_policies: **152**. coaches 0, linked athletes 0.
- Grants on coach_roster: authenticated DELETE/INSERT/REFERENCES/SELECT/TRIGGER/UPDATE; postgres all 7; service_role all 7. No anon.

## Apply
- Tool: Supabase MCP `apply_migration`, name `p1_29b_coach_linked_athletes`, query = exact 2075-byte file (`f0558b74`), passed by file substitution.
- Result `{success: true}`.
- Live id: **20261117020743** / `p1_29b_coach_linked_athletes` = 2026-11-17 02:07:43 UTC = **9:07:43 PM ET**. Bounded by pre-read 9:07:31 and post-read 9:07:52 PM ET.

## Post-read (read-only, 9:07:52 PM ET)
- `list_migrations`: 194 rows; the only new row is **20261117020743 p1_29b_coach_linked_athletes** (new head); the first 193 rows are identical to before. (`logs-apply/list_migrations-after.txt`)
- `coach_linked_athletes()`: SECURITY DEFINER true, STABLE, `search_path=""`, owner postgres, ACL `{postgres=X/postgres,authenticated=X/postgres}`.
  - has_function_privilege EXECUTE: authenticated **true**, anon **false**, service_role **false** (service_role stays revoked).
- `coach_roster` reloptions unchanged `{security_barrier=true,security_invoker=true}`; 4 columns (athlete_id, user_id, full_name, belt); full_name/belt now from `coach_linked_athletes() h(id, full_name, belt)`; WHERE `c.user_id = (SELECT auth.uid())`.
- Grants on coach_roster unchanged (same list as before; the SQL did not GRANT/REVOKE on the view).
- `public.users` policies (4): `users: linked coach reads roster athletes` **dropped**; the other four unchanged. Total pg_policies **151** (152 - 1).
- Addendum side effect, checked read-only (DO block, `SET LOCAL ROLE`, aborted by a final RAISE, no writes): service_role `select count(*) from public.coach_roster` → **"permission denied for function coach_linked_athletes"**. Matches e601c0e7.
- cron.job **14**, md5 **0beb8bc4976fc129be2d26c88096c252**, job 1 command md5 **caab15b0a3b771bccfd127f7c3db4df2**, unchanged (re-read again 9:10:14 PM ET after the calendar-ics deploy: same; migration head still 20261117020743).
- coaches 0, linked athletes 0.

## Rename (pure rename, no content change)
- Temp worktree `/tmp/wt-p1-29b-rename` detached at origin `89b0be9c` (explicit-refspec fetch). Shared worktree `/workspace/p1-29b-coach-linked-athletes-20261116` not used.
- Commit **bd75fc3db5ab29ac6ec0c37f6aa4e4475f84e73e** on `feat/p1-29b-coach-linked-athletes-20261116`, parent `89b0be9c`. Plain push `89b0be9..bd75fc3` (fast-forward, no force). `git ls-remote` = **bd75fc3db5ab29ac6ec0c37f6aa4e4475f84e73e** (MATCH).
- numstat 0/0, 100% renames, sha256 unchanged:
  - `supabase/migrations/20261117020300_p1_29b_coach_linked_athletes.sql` → `supabase/migrations/20261117020743_p1_29b_coach_linked_athletes.sql` (`f0558b74…`)
  - `supabase/migrations/20261117020300_p1_29b_coach_linked_athletes.rollback.sql.txt` → `supabase/migrations/20261117020743_p1_29b_coach_linked_athletes.rollback.sql.txt` (`b1de7f7a…`)
- Comments inside the SQL and `supabase/tests/p1-29b/test.mjs` still name the 020300 / P1-29 020100 paths; left unchanged (pure rename).

## Pack copies (new files, nothing overwritten)
- `APPLIED-20261117020743_p1_29b_coach_linked_athletes.sql` (`f0558b74…`), `APPLIED-20261117020743_p1_29b_coach_linked_athletes.rollback.sql.txt` (`b1de7f7a…`, standby only).

## Rollback (READY, NOT APPLIED)
`b1de7f7a` restores the P1-29 state (re-creates the linked-coach users policy, coach_roster reads users directly, drops the helper). Do not auto-rollback.

## Not done
- Vera post-check (required).
- P1-29c not applied (held: needs the 26-function addendum on disk and Vera's check).
- No CLI, no secrets, no cron edits, no emails, no account edits.
