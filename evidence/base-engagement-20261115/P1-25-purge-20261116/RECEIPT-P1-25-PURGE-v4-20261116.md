# RECEIPT: P1-25 purge v4 — completion hook + day-90 sweep, build only, 2026-11-16 7:51 PM ET (Avery)

BUILD ONLY. No apply_migration, no live writes, no deploys, no cron, no setting changes, no change to any live process. Receipts v1 (**5c8ee929**), v2 (**af4fd317**), v3 (**d90583cd**), `SHA256SUMS`, `SHA256SUMS-v2`, `SHA256SUMS-v3` were not edited. This file is additive, with `SHA256SUMS-v4`.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days." Grant's call (a): no stored email hash; clear the email-matched lists at completion.

## Identity

- Repo: romrxbjj-v2. Branch `feat/p1-25-purge-v4-20261116` off **d535149e6966b6a1a443428aa2956aa4fcb5187b**
- Commit: **1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae** (plain push; `git ls-remote` tip = 1c3f1d82). Not applied.
- Patch sha256 (`git format-patch -1 --stdout`, same method as v3): **09bff7cefbb871fe4eb4518016557c7f702718f7ea8154cb76e54ff6d3cd7532**
- `git patch-id --stable`: **66cafb2de8e943544550f8917c280a6299346d61**
- New hook SQL `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup.sql`: **b1013ee4b72c825d6955cc3adf436a9f4ff22f1f638ab2fce4430adbb0661a5a**
- Hook rollback `20261117010100_p1_25_completion_cleanup_rollback.sql`: **96b0ffebfac3c2d5206868aa633b713f3866b2896157b0d8a954c7826e93b1e9**
- Day-90 purge SQL, v4 bytes (same repo path `20261117010000_p1_25_purge_deleted_accounts.sql`; evidence copy `_v4.sql`): **19177ae64adee93d0c72e91bc45a08d7837302f2a5efdcbcfe1cb7ac6d3daa6c**
- Day-90 purge rollback: unchanged from v3, **8de3190b97a3f36edef6cb2087124f7898f5c71e84c423ad017e65da8f19a4f4**
- Runbook entry `docs/p1-25/RUNBOOK-COMPLETION-v4.md` (one line): **8993a36c79e9e954110d1558b6c3a03d315a84fd003c859aaf0ce8ca432aa6e4**
- Cron file: unchanged, still `NOT_FOR_APPLY`. Default modes stay `dry_run`.
- Migration ids in file names are placeholders; MCP assigns the live id at apply, then a pure-rename commit.

## 1. Where completion happens today (evidence)

**Manual SQL by the privacy team.** No live code sets `account_deletion_requests.status = 'completed'` or deletes `auth.users` / `public.users`. Full read in `COMPLETION-LOCATION-EVIDENCE-v4.json` (read 7:40–7:50 PM ET).

- Runbook `/workspace/process/batches/staged/docs/PRIVACY-DELETION-EXPORT-RUNBOOK.md`: section A steps 2–3 (lines 24–109) erase and verify the safety copies; line 110, step 4: "ONLY now remove the live data or the account"; line 118: "The table status goes `in_progress` when step 2 starts and `completed` after step 4." P1-23 contract line 87: "The privacy team completes the request within 30 days."
- Live edge functions (40): none named delete-account or account-deletion. `request-account-deletion` **v11** (ezbr `d662e9b8…`, verify_jwt true) only inserts the request (`record.ts` line 9 in repo: `insert({ user_id })`), inserts a `client_feedback` note, and calls `erase_backup_copies_for_user`; 0 occurrences of `completed`, `deleteUser`, `auth.admin`, `.update(` or `.delete(`. `lifecycle-emails` v4 `source/deletion.ts` line 10 only reads open requests.
- pg_proc: only `public.account_deletion_requests_touch` (BEFORE UPDATE trigger; stamps `completed_at` when status becomes completed; md5 `10740bac…`) and `public.purge_account_deletion_requests` (deletes completed request-log rows only; unscheduled; md5 `681bf417…`). 0 functions `DELETE FROM auth.users` or `public.users`; 0 auth-schema functions reference the table.
- cron.job: 13 jobs; none mentions deletion or purge.
- `account_deletion_requests` live rows: 0 (so the manual path has never run).

## 2. Hook design (manual-SQL case)

New unapplied migration adds four SECURITY DEFINER functions (`search_path pg_catalog, pg_temp`; EXECUTE service_role only):

- `p1_25_complete_account_deletion(p_request_id uuid, p_mode text DEFAULT 'dry_run')` — **one call = one transaction**:
  1. lock the request row `FOR UPDATE`; refuse unless `requested` or `in_progress`;
  2. refuse excluded accounts (7c71e421, `ops.internal_accounts`, fixtures by `test_fixture` or `is_test_account`);
  3. `p1_25_cleanup_at_completion(user, mode)`: `leads` where `converted_user_id = user` OR `lower(btrim(email))` matches; `sport_pack_waitlist`, `investor_requests`, `partner_inquiries`, `yoga_testers` where `lower(btrim(email))` matches;
  4. `DELETE FROM public.users`, then `DELETE FROM auth.users` (the existing manual deletes; FK cascades go with them);
  5. `UPDATE … SET status = 'completed'` (the trigger stamps `completed_at`).
  Any error in any step raises and aborts the whole call: the request stays open and nothing is erased. `dry_run` returns counts only and writes nothing. Return values hold counts only, never emails.
- `p1_25_account_emails(user)` — emails still linked to the user id: auth.users, public.users, auth.identities, athletes, clients, leads (by converted_user_id). Any email that still belongs to **another** account (auth.users or public.users with a different id) is dropped, so other people's rows are untouched.
- `p1_25_exclusion_class(user)` — null, or the exclusion reason.
- No backup is made at completion (the user asked for deletion; see open question 2).
- Still manual and BEFORE the call (runbook unchanged): safety-copy erase + Vera/Grant verify, Stripe (cancel, remove customer), Resend contact, Storage files. One-line entry: `RUNBOOK-COMPLETION-v4.md`.

Day-90 purge (`purge_deleted_accounts`, v3) is kept for everything else; v4 adds 52 lines: the day-90 sweep of the 5 lists now also takes emails still recoverable from auth.identities, athletes, clients and leads (converted_user_id), and the same other-account guard.

## 3. When each kind of data is erased (for Stacy)

"Completion" = the privacy team finishing the request, due within 30 days of the request. "Day 90" = 90 days after completion, by `purge_deleted_accounts('apply')` — **only once it is applied and scheduled; today it is unapplied and the cron file is NOT_FOR_APPLY.**

| Data | When | Why / how |
|---|---|---|
| Safety copies (lumbar_null_backup_20261021_*, rescore_backup_20261021_*, fg36 pair) | At request (best effort, request-account-deletion) and again before completion (runbook steps 2–3) | `erase_backup_copies_for_user`; verified by a second person |
| Leads (`leads`, by user id or email) | **At completion** (v4 hook) | Before `public.users` is deleted, which would null `converted_user_id` |
| Pre-account lists: `sport_pack_waitlist`, `investor_requests`, `partner_inquiries`, `yoga_testers` (email) | **At completion** (v4 hook) | Matched while the email is still on the account |
| Account: `public.users`, `auth.users` | **At completion** | Existing manual delete, now inside the hook |
| Everything ON DELETE CASCADE from those (e.g. assessments, protocols, protocol_sessions, ai_conversations/messages, mood_*, body_metrics, progress_photos rows, push_*, email_sends, surveys, athletes, clients, coaches, coach_assignments, coach_notes, coach_video_feedback, consents, user_ads_consent, auth.identities, auth.sessions, auth.mfa_*) | **At completion** | Postgres FK cascade (live list in `COMPLETION-LOCATION-EVIDENCE-v4.json`) |
| Stripe customer, Resend contact, Storage files | At completion, manual (runbook) | Outside the database |
| Rows with no FK still holding the user id (e.g. stripe_checkout_claims, athlete_injuries, attendance, coach_competitors, fg36/rescore/lumbar copies if any remain, `storage.objects` metadata, the request row itself) | **Day 90** | v3 inventory, matched by user id |
| Any of the 5 lists whose email is still recoverable at day 90 | **Day 90** (v4 sweep) | Backstop if a completion was done without the hook |
| Backup of what day 90 erased, schema `zz_bak_p1_25_<UTC>` | Dropped by the next apply-mode run once older than **7 days** | Restore window. Its age is only checked when an apply run happens, so it lasts 7 days plus the time to the next run |
| `billing_consents` | **Kept** (no end date in this code) | Legal proof of billing terms |
| `consent_events` | **Kept**; `user_id` set to null when auth.users is deleted | Legal proof of consents |
| `client_feedback`, `product_events` | **Kept, unlinked**: `user_id` is set to null at completion (FK SET NULL), so the day-90 purge can no longer find them | See open question 1 |
| `schools` | Kept; owner link set to null (FK SET NULL) | Shared coach/gym record |
| 7c71e421, `ops.internal_accounts`, test fixtures | **Kept**; the hook and purge refuse them | Staff and test, not customers |
| Auth audit and flow logs (`auth.audit_log_entries`, `auth.flow_state`) | **Kept by our provider** (Supabase Auth); not touched | Provider-managed |
| Platform / Studio logs | **Kept by our provider** (Supabase) | Outside the database functions |
| Stripe records (customers, subscriptions, invoices, payments) | **Kept by our provider** (Stripe), on Stripe's schedule | Neither function calls Stripe |
| Supabase managed backups | None on the Free plan (v2 finding) | — |

## Tests (PGlite 0.5.16, Node v24.22.1, `node <file>`)

- v4 suite `test-v4.mjs`: **29/29 PASS**. C1 dry-run default writes nothing; C3–C5 completion clears all 5 lists, by user id (lead with another address) and by email (cased, padded, and an athletes-sourced address), deletes public.users/auth.users, marks completed with completed_at; C6 other users' rows untouched; C7 cascades; C8 consent tables kept; C2/C9 no emails in return values; C10 completion with no list rows works; C11 an email owned by another account is never matched; C12 forced cleanup failure (yoga_testers trigger) rolls back the completion; C13 a failure at the auth.users delete rolls back the already-run cleanup; C14–C16 7c71e421, internal account, fixture refused in apply and dry_run with nothing changed; C17 internal_accounts never written; C18–C20 refusals; C21 service_role-only EXECUTE; C22–C24 purge defaults unchanged (dry_run, 90 days, <90 refused, fresh completions don't qualify); C25 hook rollback drops only the four functions; S1–S4 day-90 sweep clears the lists from recoverable emails, honors the other-account guard, still writes the 7-day backup.
- v3 suite `test.mjs` against the v4 purge bytes: **40/40 PASS** (`results-v3-suite-on-v4.json`).
- Total **69/69**. These suites are Node/PGlite JavaScript, as in v3, so no deno run or TypeScript type check applies to them.

## Live qualifying count (read-only)

Read **7:49 PM ET (America/New_York)**, project `cqzvqzwwevnflinxgnpp`, MCP `execute_sql`, counts only: qualifying at day 90 under v4 rules **0**; candidates before exclusions 0; open requests that would use the completion hook 0; completed requests 0; request rows total 0; P1-25 functions live 0.

## Open questions

1. `client_feedback` and `product_events` are FK `ON DELETE SET NULL` to auth.users, so completion unlinks them and day 90 cannot purge them. `client_feedback` can hold free text. Clear them in the hook at completion, or keep them as unlinked records and say so?
2. The hook makes no backup of the 5 lists or the account at completion. Is a 7-day copy wanted there, or is "erased at completion, nothing kept" right?
3. The runbook's step 4 could also be done with the Studio "Delete user" button, which skips the hook. The runbook entry replaces the manual deletes with the function, but Stacy/Grant should confirm the hook is the only allowed way to complete.

## Times (America/New_York)

- Read receipt v3 and started the search: 7:41 PM ET
- Live read-only checks (functions, pg_proc, cron, catalog): 7:42–7:50 PM ET
- Worktree and branch: 7:45 PM ET
- v4 tests 29/29 and v3 tests 40/40: 7:47–7:48 PM ET
- Commit `1c3f1d82` and plain push: 7:49 PM ET
- Live count: 7:49 PM ET
- This receipt: 7:51 PM ET

No live writes. Nothing applied, deployed or scheduled.
