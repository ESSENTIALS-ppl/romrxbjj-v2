# RECEIPT: P1-18 session_feedback and P1-18b assessment_feedback (BUILD ONLY), 2026-11-16 7:19 PM ET (America/New_York)

Written by Avery. BUILD ONLY. Not applied: no apply_migration, no deploy, no Supabase writes, no flag changes. EXPORT_MY_DATA stays off. main was not touched. No secrets or user emails in this receipt (tests use user@example.com only).

Authority: Grant, under L1031, for P1-18 and P1-18b (results survey). Specs: JULES-P1-18-SESSION-FEEDBACK-SPEC-20261116.md sha256 272c95a3b7a57586e2c17412223b5acb39724bd514c610405b62064dcebceeec (starts with 272c95a3, MATCH); JULES-P1-18B-ASSESSMENT-FEEDBACK-SPEC-20261116.md sha256 7b42dd84b0f2549b7dfbf248f22721503279d8f3df6c6f49f0146a1efb36bbff (starts with 7b42dd84, MATCH). Stacy privacy conditions (Grant steering, 7:12 PM ET and 7:16 PM ET) are proven below for both tables.

## Commit
- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **feat/p1-18-session-feedback-20261117** (plain push, new branch; origin ls-remote MATCH).
- Commit **93c6f56298f5bae2f804da52be6f13fdf3e7cf5d**, parent **a34aa573a160c674cfdf9660cec30304161f1044** (origin/main). Nothing from a34aa573 was re-applied.
- `git show --format= --patch` sha256 **1ac366357c9d7c80f28e852d15a6f63b6774e12c9984679fb3332ce69d3113ae**. `git patch-id --stable` **7974cf3f065146d3add72d098a84feb19c69f126**. 10 files, +1015/-0, all new.

## Every hunk (all 10 files are new)
1. supabase/migrations-unapplied/20261117120000_p1_18_session_feedback.sql @@ -0,0 +1,104 @@ sha256 **925052e8c26a1a06c150ab24739f4917fca1095bdca45c2d0e561f95263be2a7**. Creates public.session_feedback exactly per the P1-18 spec: columns id, user_id, session_id, session_date, feel, clear, length_fit, note, sport, source, created_at, with the listed CHECKs, UNIQUE session_id (session_feedback_session_id_key), index session_feedback_user_created_idx, user_id REFERENCES auth.users(id) ON DELETE CASCADE (same as protocol_sessions.user_id), session_id REFERENCES protocol_sessions(id) ON DELETE CASCADE. RLS: insert own (auth.uid() = user_id and the session belongs to the caller with a matching session_date); select own; no update or delete policy; no anon. Grants SELECT, INSERT to authenticated only. AFTER INSERT trigger trg_pe_session_feedback / tg_pe_session_feedback writes product_events event session_feedback_submitted with props {id, session_id, created_at} only (Stacy: no answers, no note). This is stricter than the Jules props {feel, has_survey}.
2. supabase/migrations-unapplied/20261117120000_p1_18_session_feedback_rollback.sql @@ -0,0 +1,9 @@ sha256 **436245f8efc14d5ee45ad7f181d9a819605e0eb6cd4c6a4011e8dc0a0ee06dde**. Drops the session_feedback trigger, function, and table only.
3. supabase/migrations-unapplied/20261117120100_p1_18_assessment_feedback.sql @@ -0,0 +1,105 @@ sha256 **356bc285997111091ea2c3543cae27db6baf901d3f09cad946f6d61d4baa573d**. Creates public.assessment_feedback exactly per the P1-18b spec (no free-text column): id, user_id, assessment_id, ease, results_clear, check_again, survey_version, sport, source, created_at, with the listed CHECKs (survey_version = 'p1-18b-card1-2026-11-16'), UNIQUE assessment_id, index assessment_feedback_user_created_idx. user_id REFERENCES public.users(id) ON DELETE CASCADE (same as assessments.user_id; public.users.id itself references auth.users(id) ON DELETE CASCADE). assessment_id REFERENCES assessments(id) ON DELETE CASCADE. RLS: insert own only when the assessment is the caller's and check_kind = 'full'; select own; no update or delete; no anon. This is stricter than the Jules draft (`check_kind IS DISTINCT FROM 'quick'`): after live L1134 031000 (20261116143905) check_kind is NOT NULL and only 'full' or 'quick'; requiring equality to 'full' also rejects a non-full kind such as 'partial'. Timestamp 20261117120100 is after the session_feedback file 20261117120000 and after live 031000 20261116143905. The SQL reads assessments.check_kind; do not apply before 031000. Event trigger trg_pe_assessment_feedback writes assessment_feedback_submitted with props {id, assessment_id, created_at} only (Stacy: no answers). This is stricter than the Jules props {ease, results_clear, check_again, survey_version}.
4. supabase/migrations-unapplied/20261117120100_p1_18_assessment_feedback_rollback.sql @@ -0,0 +1,9 @@ sha256 **d5c30dfb9f17d668738e3450e6efd8bc36ab75946bcdf6301607a2dfb55d7c59**. Drops the assessment_feedback trigger, function, and table only.
5. supabase/migrations-unapplied/20261117120100_p1_18_feedback_tables_rollback.sql @@ -0,0 +1,14 @@ sha256 **0b9876a19808fc73726aebcd7d80b0518d201fc6257405d49475df74975fe970**. Combined rollback for both tables: drops assessment_feedback first, then session_feedback. This is the exact-restore file used in the test.
6. supabase/functions/export-my-data/index.ts @@ -0,0 +1,12 @@ sha256 **d2d4cc2dde9a95c40a3f282838ebcfb26e5ae630ba5985bb44a04f57ed80ce45**. Byte-for-byte the live export-my-data v2 index (ezbr 0de35f2b…, also P1-23 42a044d). flagOn(Deno.env.get("EXPORT_MY_DATA")) is unchanged; the flag stays off unless it is exactly "on". The function is not on origin/main; it is added here so the coverage lives in the function code. This is not a deploy.
7. supabase/functions/export-my-data/handler.ts @@ -0,0 +1,237 @@ sha256 **0f665af7f27e512e313ac6113b4bbe74c4ba4f1e4c099d22381d0650db2facd5**. Live v2 handler (sha 19387b5c…, 19862 bytes) plus two TABLES rows, keyed on user_id, all columns: session_feedback (id, user_id, session_id, session_date, feel, clear, length_fit, note, sport, source, created_at) and assessment_feedback (id, user_id, assessment_id, ease, results_clear, check_again, survey_version, sport, source, created_at). flagOn is still `v === "on"`. No other handler logic changed.
8. scripts/p1-18-session-feedback-test/package.json @@ -0,0 +1,1 @@ sha256 **3f563c22a45c71e10c3cfb4274455039e324230d0e72ae1ac4ecfc66a045a7a0**. Pins @electric-sql/pglite 0.5.16.
9. scripts/p1-18-session-feedback-test/test.mjs @@ -0,0 +1,348 @@ sha256 **0460e630283ea33b80e4024b9c4dbbf8198c6b0e1a707e15af0668e1b282bd50**. PGlite and source-grep tests.
10. scripts/p1-18-session-feedback-test/results.json @@ -0,0 +1,176 @@ sha256 **7335f3e99dee0d486d82198ece2f80db9b2f41870684813b275ccc16efb8e4b0**. Test output, 33/33 PASS.

## Tests: PGlite 0.5.16, 33/33 PASS (results.json), re-run after both migrations were in the tree
- Existing objects (protocol_sessions, assessments, users, product_events, client_feedback, log_product_event) are unchanged after both applies.
- session_feedback: own insert and select OK; other user's rows denied; other user cannot insert onto someone else's session; anon denied; write-once (no update or delete).
- assessment_feedback: own insert on a FULL assessment OK; own select OK; other user's rows denied; other user's FULL assessment rejected; a second user cannot insert onto the first user's FULL assessment; own QUICK assessment rejected; own PARTIAL assessment rejected; anon denied; write-once.
- Event rows: session_feedback_submitted props are only id, session_id, created_at (no feel, no note, no has_survey; the note text is not in the event row). assessment_feedback_submitted props are only id, assessment_id, created_at (no ease, results_clear, check_again, or survey_version).
- Deleting the account (DELETE FROM auth.users) removes both tables' rows for that user via ON DELETE CASCADE; the other user's rows remain.
- Combined rollback is an exact restore: both tables and trigger functions are dropped; existing objects match the pre-apply snapshot. Re-applying both migrations after the rollback is clean.
- export-my-data TABLES includes both tables with all columns, keyed on user_id. EXPORT_MY_DATA stays off.

## Stacy privacy conditions, proven for both tables

### (1) Rows never reach OpenAI or ROMBot / ai-chat context
- Grep of on-branch ai-chat, embed-knowledge, rombot_context migrations, search_rombot_knowledge / sport_aware_rag SQL, and the unapplied rombot-checkin tree at 11803fee (24 files): no occurrence of session_feedback or assessment_feedback (0 leak hits).
- On-branch ai-chat `.from()` tables are a fixed allow-list: user_ai_preferences, users, coaches, athletes, rombot_context, ai_messages, ai_conversations (live v96 also reads assessments for history). No generic table pull. Live v96 CONTEXT_SELECT is user_id, full_name, latest_assessment_id, rom_total, worst_joints, joint_scores, technique_summary, red/green/yellow_techniques, protocol, saved_game_plans; allowListContext rebuilds only those fields. Live rombot_context columns do not include either feedback table.
- embed-knowledge only reads and writes rombot_knowledge. rombot-checkin `.from()` list has client_feedback (deletion-request metadata only) and does not include session_feedback or assessment_feedback.
- This build does not add either table to ai-chat, rombot_context, embed-knowledge, or rombot-checkin.

### (2) Nothing goes to Meta beyond a no-answers event; no third-party other than Notion gets the data
- This build adds no Pixel, CAPI, or Notion hook, and no submit-feedback call.
- Live Meta CAPI and the pixel allow-list are only PageView, Lead, and CompleteRegistration. custom_data allow-list is content_name only. Jules client builds b66fc810 / 434f131 (session) and 1d8edd9 (assessment) insert only into the new tables via the Supabase client; they do not call track(), fbq, meta-capi, submit-feedback, or Notion. Both flags (SHOW_SESSION_FEEDBACK, SHOW_RESULTS_SURVEY) stay false.
- Live database webhooks (read-only): feedback-to-notion fires AFTER INSERT on public.client_feedback only; also assessments, auth.users (welcome), investor_requests and partner_inquiries (inbound lead). A new table does not inherit those hooks. Notion still receives only client_feedback, not these survey tables.

### (3) Rows are deleted with the account
- session_feedback.user_id REFERENCES auth.users(id) ON DELETE CASCADE (same as protocol_sessions.user_id).
- assessment_feedback.user_id REFERENCES public.users(id) ON DELETE CASCADE (same as assessments.user_id). public.users.id REFERENCES auth.users(id) ON DELETE CASCADE. assessment_id also REFERENCES assessments(id) ON DELETE CASCADE.
- PGlite test: DELETE FROM auth.users for one account removes that user's rows from both tables; the other user's rows remain.

### (4) Event triggers carry no answers and no note
- session_feedback_submitted props: {id, session_id, created_at}. Tested: no feel, clear, length_fit, has_survey, or note, and the note text is absent from the event row.
- assessment_feedback_submitted props: {id, assessment_id, created_at}. Tested: no ease, results_clear, check_again, or survey_version.
- The event name is on the event column; user_id is the event row's user_id; source is the log_product_event default 'server'; sport is left null. Payload props are only ids and timestamps.

## Rollback (not applied)
- Combined file (exact restore of both): supabase/migrations-unapplied/20261117120100_p1_18_feedback_tables_rollback.sql, sha256 0b9876a1….
- Per-table companions are also in the tree if only one migration has been applied.
- Apply a rollback only via MCP apply_migration with its own gate. After the combined rollback, neither table nor trigger function should exist; protocol_sessions, assessments, users, product_events, and log_product_event should be unchanged.

## Apply plan (later, gated; not done)
- 031000 (live 20261116143905 assessment_check_kind) must already be live before assessment_feedback. It is live today.
- MCP apply_migration for p1_18_session_feedback, then p1_18_assessment_feedback, letting MCP assign ids (do not force 20261117120000 or 20261117120100). Then pure-rename each repo file to its live id. Do not apply a rollback. Do not deploy export-my-data as part of this build; a later export deploy, with the flag still off until its own gate, would pick up the TABLES rows.
- Post-check: both tables, RLS, grants, event props, M1 and other existing objects unchanged, EXPORT_MY_DATA still not "on".
