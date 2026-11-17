# RECEIPT: P1-25 v5.2 SERVER APPLY (hook, purge, cron) APPLIED as 20261117013401 / 20261117013410 / 20261117013428

Written Monday Nov 16, 2026, 8:37 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push), exact file bytes of origin tip 82597b57, in the order hook, purge, cron. Each apply returned success on the first call; no retries. Never applied SQL 81af8e0, the old delete package, or a34aa573. Never applied the sibling 20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql (d6d51b5d, left in migrations-unapplied). Rollback 4ca72fee NOT applied. No data rows deleted (purge qualifies 0 accounts; it has not run yet). Renewal cron job 1 not touched. Account 7c71e421 not touched. No secrets or user emails in this receipt or in the applied SQL. Never re-apply these migrations.

Resume note: an earlier pass of this task was cut off by a rate limit after the gates and before any apply. On resume, read-only state was re-checked first (list_migrations head 20261117012431, no p1_25 migration present; cron.job 13 jobs, ids 1-13, no purge-deleted-accounts-daily). All three applies were therefore missing, and were run once each in order.

## Gate (verified before any apply)

- Ledger L1031 (Jim: "Do all of them", the 31 Base items).
- L1264 = ledger line **1649** (2026-11-16 8:22 PM ET): SABLE ORDER, "the P1-25 server apply (hook, purge and cron) goes first ...". This apply is step 1 of L1264.
- L1286 = ledger line **1693** (2026-11-16 8:29 PM ET): Vera precheck file /workspace/vera-verdicts/vera-82597b57-39b79d69-P1-25-v5.2-precheck-20261116.md (**baacd207**). SERVER APPLY (hook, purge, cron): PASS on content (tip 82597b57, hook 4b437b4b, purge 19177ae6, cron 03823f26 at '23 4 * * *' with no literal secret, rollback 4ca72fee). Her two WARNs are answered below (CASCADE; Notion step is manual). Her PRIVACY LINE FAIL is about the r5 client wording, not this server apply.
- Grant relayed GO (step 1 of L1264, Vera PASS baacd207, Sable GO).
- romrxbjj-v2 fetched; `git ls-remote origin refs/heads/feat/p1-25-purge-v5-20261116` = **82597b573d8c697351f8e6b2fc5e28605e6ec378** (exact match).
- sha256 at 82597b57 (supabase/migrations-unapplied/), all MATCH:
  - hook 20261117010100_p1_25_completion_cleanup.sql = **4b437b4b0525bf6e2830d7e32b42b58e462a3cd81466a74a6c3ba7f7681e7b8c** (15203 bytes). Guard signature kept: `p1_25_complete_account_deletion(uuid, text, jsonb)` (REVOKE line 308, GRANT line 312).
  - purge 20261117010000_p1_25_purge_deleted_accounts.sql = **19177ae64adee93d0c72e91bc45a08d7837302f2a5efdcbcfe1cb7ac6d3daa6c** (39646 bytes).
  - cron 20261117010200_p1_25_purge_deleted_accounts_cron.sql = **03823f26a07beb63c0a0d3cca3cf39020f618540af86d11768fe40782d0346ca** (2083 bytes). Schedule `'23 4 * * *'`; command `select public.purge_deleted_accounts('apply', interval '90 days');`. No literal secret: `rg -i "secret|bearer|apikey|service_role_key|eyJ|sk_|password|vault"` over all four files returned 0 matches.
  - rollback 20261117010200_p1_25_purge_deleted_accounts_cron_rollback.sql = **4ca72fee802c439ba6cf13f9557ad0e2a2946f40c9c90fcf5bdd06ac9321fad7** (433 bytes).

## Pre-read (read-only, 8:33 PM ET)

- list_migrations: 189 rows, head **20261117012431** p1_22_revoke_anon_execute (as expected). No p1_25 migration.
- cron.job: **13** jobs, ids 1-13. md5(string_agg(jobid|schedule|command|active, E'\n' ORDER BY jobid)) = **a96d2036959f1dc2697d23e7665cb490** (as expected); alt formula with jobname = 37af0c31c6436476b08ebd3743f0bdad. Job 1 (send-renewal-reminders-daily, 0 12 * * *) command md5 **caab15b0a3b771bccfd127f7c3db4df2**. No job named purge-deleted-accounts-daily; no job at 23 4 * * *.
- Pending deletion (counts only): account_deletion_requests total **0**, open (status <> 'completed') **0**, completed **0**, completed older than 90 days **0**. P1-25 functions live before apply: 0.
- After the purge function was applied and before the cron was applied, `select public.purge_deleted_accounts('count', interval '90 days')` (count mode, writes nothing): ok=true, written=false, **qualifying_count 0**, exclusions 0/0/0, every table_count 0. So the first run would purge **0** accounts.

## Apply (MCP apply_migration, exact file bytes via file substitution)

| Order | File (repo) | MCP name | MCP id (version) | Applied (ET) |
|---|---|---|---|---|
| 1 hook | 20261117010100_p1_25_completion_cleanup.sql (4b437b4b) | p1_25_completion_cleanup | **20261117013401** | 2026-11-16 8:34:01 PM ET |
| 2 purge | 20261117010000_p1_25_purge_deleted_accounts.sql (19177ae6) | p1_25_purge_deleted_accounts | **20261117013410** | 2026-11-16 8:34:10 PM ET |
| 3 cron | 20261117010200_p1_25_purge_deleted_accounts_cron.sql (03823f26) | p1_25_purge_deleted_accounts_cron | **20261117013428** | 2026-11-16 8:34:28 PM ET |

Times are the MCP-assigned versions (UTC 01:34:01, 01:34:10, 01:34:28 on Nov 17) converted to ET. Each returned {"success":true}; each was confirmed in schema_migrations before the next was applied.

## Post-read (read-only, 8:34-8:35 PM ET)

- list_migrations head: **20261117013428** p1_25_purge_deleted_accounts_cron, then 20261117013410 p1_25_purge_deleted_accounts, 20261117013401 p1_25_completion_cleanup, 20261117012431 p1_22_revoke_anon_execute.
- cron.job: **14** jobs. md5_main (same formula) = **0beb8bc4976fc129be2d26c88096c252**; alt with jobname = 72ce247c10179b8a635d0ee33f947e9d. md5_main over jobs 1-13 only = **a96d2036959f1dc2697d23e7665cb490** (unchanged, so job 1 and the other 12 are untouched). Job 1 command md5 still **caab15b0a3b771bccfd127f7c3db4df2**.
- New job: jobid **14**, `purge-deleted-accounts-daily`, schedule **'23 4 * * *'**, command `select public.purge_deleted_accounts('apply', interval '90 days');`, active true. cron.job_run_details for job 14: 0 runs.
- Grants (pg_proc.proacl and has_function_privilege). All five are owner postgres and SECURITY DEFINER:

| function | proacl | anon | authenticated | PUBLIC | service_role |
|---|---|---|---|---|---|
| p1_25_exclusion_class(p_user uuid) | {postgres=X/postgres,service_role=X/postgres} | false | false | false | true |
| p1_25_account_emails(p_user uuid) | {postgres=X/postgres,service_role=X/postgres} | false | false | false | true |
| p1_25_cleanup_at_completion(p_user uuid, p_mode text) | {postgres=X/postgres,service_role=X/postgres} | false | false | false | true |
| p1_25_complete_account_deletion(p_request_id uuid, p_mode text, p_expected jsonb) | {postgres=X/postgres,service_role=X/postgres} | false | false | false | true |
| purge_deleted_accounts(p_mode text, p_retention interval) | {postgres=X/postgres,service_role=X/postgres} | false | false | false | true |

  EXECUTE is service_role only among API roles (postgres is the owner; pg_cron runs job 14 as postgres).
- CASCADE proof (pg_constraint, contype 'f'):
  - session_feedback.session_feedback_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` (confdeltype c).
  - assessment_feedback.assessment_feedback_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` (public.users; confdeltype c).
  - Also session_feedback_session_id_fkey -> protocol_sessions(id) ON DELETE CASCADE and assessment_feedback_assessment_id_fkey -> assessments(id) ON DELETE CASCADE.
  - So session_feedback and assessment_feedback rows are removed by CASCADE when p1_25_complete_account_deletion deletes public.users and auth.users at completion (and by the purge's auth.users delete). They are not on the 90-day table list (the count-mode table_counts do not name them); CASCADE is the mechanism.
- First firing: 04:23 UTC Tue Nov 17 = **11:23 PM ET Mon Nov 16** (computed in the database from now() = 01:34:50 UTC).

## Rollback (READY, NOT APPLIED)

- Cron rollback 4ca72fee: unschedules purge-deleted-accounts-daily by name only, if it exists; touches no other job. Path after rename: romrxbjj-v2 `supabase/migrations/20261117013428_p1_25_purge_deleted_accounts_cron_rollback.sql` (was supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron_rollback.sql). Pack copy: this folder, APPLIED-20261117013428_p1_25_purge_deleted_accounts_cron_rollback.sql (same bytes as 20261117010200_p1_25_purge_deleted_accounts_cron_rollback.sql here).
- Function rollbacks (renamed alongside, not applied): 20261117013410_p1_25_purge_deleted_accounts_rollback.sql (8de3190b), 20261117013401_p1_25_completion_cleanup_rollback.sql (119baaea).

## Pack copies of the applied bytes

This folder now holds the exact applied bytes, copied from a0ee9fc supabase/migrations/: APPLIED-20261117013401_p1_25_completion_cleanup.sql (4b437b4b), APPLIED-20261117013410_p1_25_purge_deleted_accounts.sql (19177ae6), APPLIED-20261117013428_p1_25_purge_deleted_accounts_cron.sql (03823f26), APPLIED-20261117013428_p1_25_purge_deleted_accounts_cron_rollback.sql (4ca72fee). The older pack files 20261117010100_p1_25_completion_cleanup.sql and 20261117010000_p1_25_purge_deleted_accounts.sql in this folder are earlier versions and were NOT applied.

## Rename (pure rename, no content change)

- romrxbjj-v2 feat/p1-25-purge-v5-20261116: commit **a0ee9fc3b6e2956f88f979d1016b5c65a9d16491** on parent 82597b57. Six R100 renames, 0 insertions / 0 deletions, from supabase/migrations-unapplied/ to supabase/migrations/:
  - 20261117010100_p1_25_completion_cleanup(.sql, _rollback.sql) -> 20261117013401_p1_25_completion_cleanup(...)
  - 20261117010000_p1_25_purge_deleted_accounts(.sql, _rollback.sql) -> 20261117013410_p1_25_purge_deleted_accounts(...)
  - 20261117010200_p1_25_purge_deleted_accounts_cron(.sql, _rollback.sql) -> 20261117013428_p1_25_purge_deleted_accounts_cron(...)
- Fetched, rebased (no upstream change), plain push 82597b5..a0ee9fc, ls-remote = a0ee9fc3b6e2956f88f979d1016b5c65a9d16491. No force push.

## Notion copy (MANUAL)

Deleting the Notion copy is NOT done by code. It is a manual runbook step: RUNBOOK-COMPLETION-v5 (faf23da2, docs/p1-25/RUNBOOK-COMPLETION-v5.md, same bytes as this folder's RUNBOOK-COMPLETION-v5.2.md), **step 7**: "After the function runs (MANUAL). Find and delete the feedback-to-notion Notion page(s) for that user's client_feedback rows, and record the page ids deleted (or 'none found') in the completion record." **The runbook names no owner for performing step 7.** It says only "Stacy will word the customer-facing part of this step." (Elsewhere it names "Vera or Grant" as verifiers for steps 2 and 4, not as owners of step 7.) An owner still needs to be assigned.

## TIMING

- The cron first fires at **11:23 PM ET tonight** (04:23 UTC Tue Nov 17). Originally the privacy words (r5 client) had to be live before then, with Grant deciding at 11:00 PM ET whether to unschedule.
- **Update: Sable CANCELLED the 11:00 PM ET timing guard**, because Vera found the purge matches 0 rows, so the 11:23 PM ET run deletes nothing. Read-only pending-deletion count at apply time: account_deletion_requests total 0 (open 0, completed 0, completed older than 90 days 0), and purge count mode qualifying_count **0**. purge-deleted-accounts-daily stays scheduled. Avery did not and will not unschedule it.
