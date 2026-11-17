# RECEIPT, L1231/L1234: P1-18/18b session_feedback and assessment_feedback APPLIED as 20261117010651 / 20261117010702

Written Mon Nov 16, 2026, 8:09 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP apply_migration only (no CLI db push), then export-my-data deploy from the pinned 93c6f562 files. No data rows written or deleted. Combined rollback 0b9876a1 was not applied and is the standby. No secrets or user emails in this receipt or in the applied SQL. main was not touched. Account 7c71e421 was not touched. EXPORT_MY_DATA was not changed. The renewal cron (job 1) was not touched. Never re-apply these migrations.

## Gate (verified 8:06 PM ET, before any apply)
- Ledger L1031 (Jim: "Do all of them…"); L1229 (Jim, 7:54 PM ET: "I said go on all 31 things"); L1230 (Sable standing OK after a Vera precheck that passes on content); L1231 PIN of romrxbjj-v2 **93c6f56298f5bae2f804da52be6f13fdf3e7cf5d** on origin feat/p1-18-session-feedback-20261117, parent a34aa573, tree 6cbe9552, migrations-unapplied 20261117120000_p1_18_session_feedback.sql **925052e8**, 20261117120100_p1_18_assessment_feedback.sql **356bc285**, combined rollback 20261117120100_p1_18_feedback_tables_rollback.sql **0b9876a1**, export-my-data handler.ts **0f665af7**, index.ts **d2d4cc2d**.
- L1234 PRECHECK VERIFIED + APPLY OK GIVEN (8:05 PM ET): Vera /workspace/vera-verdicts/vera-93c6f562-P1-18-18b-server-precheck-20261116.md **dc87a82d**, 10 PASS, 2 WARN, G1 PASS on L1229. Sable: standby rollback is combined 0b9876a1; export-my-data 0f665af7 deploys after the migrations (build receipt 52bfca1e said do not deploy; superseded by this ruling). Grant relayed the apply at 8:04 PM ET, citing L1231 and dc87a82d.
- On-disk in worktree /workspace/p1-18-session-feedback-20261117, immediately before apply (all MATCH L1231):
  - `git rev-parse` of feat/p1-18-session-feedback-20261117 = **93c6f56298f5bae2f804da52be6f13fdf3e7cf5d**; tree 6cbe95528ed5140b12b24de4051cb094525c7814.
  - sha256 20261117120000_p1_18_session_feedback.sql = **925052e8c26a1a06c150ab24739f4917fca1095bdca45c2d0e561f95263be2a7** (4823 bytes).
  - sha256 20261117120100_p1_18_assessment_feedback.sql = **356bc285997111091ea2c3543cae27db6baf901d3f09cad946f6d61d4baa573d** (5444 bytes).
  - sha256 combined rollback = **0b9876a19808fc73726aebcd7d80b0518d201fc6257405d49475df74975fe970**.
  - sha256 export-my-data/handler.ts = **0f665af7f27e512e313ac6113b4bbe74c4ba4f1e4c099d22381d0650db2facd5** (20280 bytes).
  - sha256 export-my-data/index.ts = **d2d4cc2dde9a95c40a3f282838ebcfb26e5ae630ba5985bb44a04f57ed80ce45** (541 bytes).

## Pre-snapshot (read-only, 8:06:32 PM ET)
- list_migrations: 186 entries; head **20261117001014** p1_22_t10_completions_by_day. No p1_18_session_feedback, p1_18_assessment_feedback, 20261117120000, or 20261117120100.
- public.session_feedback and public.assessment_feedback: **do not exist** (pg_class query returned 0 rows).
- export-my-data: version **2**, verify_jwt **true**, ezbr_sha256 **0de35f2bf74278900d329a35a66fccf29fc7d146eeb22eb808e8a7d27b86e7e1**, files index.ts and handler.ts only, id c41ec7a7-9ebf-4c6f-bf1d-ebd035a746c0.
- Cron: 13 jobs, jobids 1-13, md5(jobid|schedule|command|active) **a96d2036959f1dc2697d23e7665cb490**. Job 1 send-renewal-reminders-daily, schedule `0 12 * * *`, active true, command md5 caab15b0 (unchanged). Job 11 lifecycle-emails-hourly command md5 a40ec369 (unchanged).

## Apply (MCP apply_migration only, exact file substitution of the pinned bytes)
1. name `p1_18_session_feedback`, 4823-byte file sha 925052e8…, success. Live id **20261117010651** p1_18_session_feedback (8:06:51 PM ET; version timestamp 2026-11-17 01:06:51 UTC).
2. name `p1_18_assessment_feedback`, 5444-byte file sha 356bc285…, success. Live id **20261117010702** p1_18_assessment_feedback (8:07:02 PM ET; version timestamp 2026-11-17 01:07:02 UTC).
- Order was 120000 then 120100 as required. MCP assigned the ids; 20261117120000 and 20261117120100 were not forced.

## (1) Standby rollback (not applied)
- Combined rollback **0b9876a19808fc73726aebcd7d80b0518d201fc6257405d49475df74975fe970** is the standby (L1234 ruling). After the rename it lives at `supabase/migrations/20261117010702_p1_18_feedback_tables_rollback.sql`. Per-file rollbacks 436245f8 (session) and d5c30dfb (assessment) are also in the tree and were not applied. Apply a rollback only via MCP apply_migration with its own gate.

## (2) export-my-data deploy
- **Yes, deployed** after both migrations, from the 93c6f562 files only (handler 0f665af7, 20280 bytes; index d2d4cc2d, 541 bytes). Live v2 had those two files only; no other files were uploaded. verify_jwt passed explicitly as **true** (equal to live v2). No env or secret changes. EXPORT_MY_DATA was not read and was not written; the flag is unchanged (still on only for the exact string "on").
- Deploy completed 8:07:09 PM ET. Read-back (list_edge_functions and get_edge_function): version **3** (was 2), verify_jwt **true**, ezbr_sha256 **45dd9300cc48c01ae31d9e76685fbff27de8b96125e57312d97efe08d38030f7**, same function id, entrypoint index.ts, import_map false.
- get_edge_function read-back of index.ts sha256 **d2d4cc2dde9a95c40a3f282838ebcfb26e5ae630ba5985bb44a04f57ed80ce45** (MATCH). The handler.ts body in the get_edge_function tool payload was truncated (5249 of 20280 bytes), so a full handler sha could not be recomputed from that read-back. The deploy call itself substituted the exact pinned 20280-byte handler (sha 0f665af7…) and 541-byte index (sha d2d4cc2d…).

## (3) New migration head
- list_migrations after both applies: 188 entries (exactly two new). Head **20261117010702** p1_18_assessment_feedback, immediately after **20261117010651** p1_18_session_feedback, immediately after the previous head 20261117001014 p1_22_t10_completions_by_day.

## (4) Tables, RLS, policies, grants (read-only post-check)
- Both tables exist in public, relkind r, **relrowsecurity true**, relforcerowsecurity false. Row counts at 8:07:53 PM ET: session_feedback **0**, assessment_feedback **0**.
- Policies (all PERMISSIVE, roles `{authenticated}`):
  - session_feedback_insert_own, INSERT, using null, with check: `((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1 FROM protocol_sessions ps WHERE ((ps.id = session_feedback.session_id) AND (ps.user_id = ( SELECT auth.uid() AS uid)) AND (ps.session_date = session_feedback.session_date)))))`
  - session_feedback_select_own, SELECT, using `(( SELECT auth.uid() AS uid) = user_id)`, with check null.
  - assessment_feedback_insert_own, INSERT, using null, with check: `((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1 FROM assessments a WHERE ((a.id = assessment_feedback.assessment_id) AND (a.user_id = ( SELECT auth.uid() AS uid)) AND (a.check_kind = 'full'::text)))))`
  - assessment_feedback_select_own, SELECT, using `(( SELECT auth.uid() AS uid) = user_id)`, with check null.
- Grants: authenticated has SELECT and INSERT only on both tables (is_grantable NO). anon has none. postgres has the default owner privileges (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER; is_grantable YES). service_role has the default table privileges (same seven; is_grantable NO). No UPDATE or DELETE grant to authenticated.

## Cron and flag (post-check)
- Cron unchanged: 13 jobs, jobids 1-13, md5 **a96d2036959f1dc2697d23e7665cb490**. Renewal job 1 not touched.
- EXPORT_MY_DATA unchanged: no secrets or env tools were called; the deploy did not pass any env updates.

## Rename (repo only, pure rename)
- On feat/p1-18-session-feedback-20261117, commit **ddefff930f06ab9349c03fa690a36a6146716e28** (plain push; origin ls-remote MATCH at 8:08:27 PM ET). Parent 93c6f562. main not updated. numstat 0/0, 100% rename, sha256 unchanged for all five files:
  - `supabase/migrations-unapplied/20261117120000_p1_18_session_feedback.sql` → `supabase/migrations/20261117010651_p1_18_session_feedback.sql` (925052e8…)
  - `…/20261117120000_p1_18_session_feedback_rollback.sql` → `supabase/migrations/20261117010651_p1_18_session_feedback_rollback.sql` (436245f8…)
  - `…/20261117120100_p1_18_assessment_feedback.sql` → `supabase/migrations/20261117010702_p1_18_assessment_feedback.sql` (356bc285…)
  - `…/20261117120100_p1_18_assessment_feedback_rollback.sql` → `supabase/migrations/20261117010702_p1_18_assessment_feedback_rollback.sql` (d5c30dfb…)
  - `…/20261117120100_p1_18_feedback_tables_rollback.sql` → `supabase/migrations/20261117010702_p1_18_feedback_tables_rollback.sql` (0b9876a1…, standby)
- Never re-apply.

## Not done
- EXPORT_MY_DATA was not flipped. Client pin 434f1316 / 1d8edd9e is not in this apply (comes with P1-26). Combined rollback was not applied. No test submit, no emails sent, no accounts created, no deletes.
