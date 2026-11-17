# RECEIPT: P1-25 purge v5 — client_feedback + product_events at completion, recorded dry run, build only, 2026-11-16 7:59 PM ET (Avery)

BUILD ONLY. No apply_migration, no live writes, no deploys, no cron, no setting changes, no change to any live process. Receipts v1 (5c8ee929), v2 (af4fd317), v3 (d90583cd), v4 (c1744b6c) and SHA256SUMS through SHA256SUMS-v4 (9160b297) were not edited. This file is additive, with `SHA256SUMS-v5`. Live reads were catalog and counts only.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Identity

- Repo romrxbjj-v2, branch `feat/p1-25-purge-v5-20261116` off **1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae** (v4)
- Commits: **06c604d478ca463ca48f3d9cd9bcb958f5b15ddf** (SQL, tests, runbook, build notes) and **24508e0136c662154af8122749f75371cc98c673** (build-notes wording fix, docs only). Tip 24508e01, plain push, `git ls-remote` = 24508e01. Not applied.
- Patch sha256 (`git format-patch -2 --stdout 24508e01`, both commits; evidence copy `06c604d4-24508e01.patch`): **f872896701d6f3d0f38c36f1656ef6821ecbb9ffef6fe3a77eca6081e2a134ba**
- `git patch-id --stable` of the whole change (`git diff 1c3f1d82 24508e01`): **92af58635da789f69182e2eb8484859c494691dd**. Per commit: 06c604d4 **d9c1ab561cfca73fbcb3130ed3f10a7f73613431**; 24508e01 **867ac60beb970239eb279e306fcbf72aa13a0958**. Single-commit patch sha256 of 06c604d4 (`format-patch -1`): 254a7b2362d6ec37c37049a39583299866033361f0dee56a5a4ff0cdb25c97d6
- Hook SQL v5 (`supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup.sql`; evidence copy `…_completion_cleanup_v5.sql`): **4b437b4b0525bf6e2830d7e32b42b58e462a3cd81466a74a6c3ba7f7681e7b8c**
- Hook rollback v5 (evidence copy `…_completion_cleanup_rollback_v5.sql`): **119baaeac6ffe1d14c339639fc5924aec3f3a75705c7b3759667e81f13e034b6**
- Day-90 purge SQL: unchanged from v4, 19177ae64adee93d0c72e91bc45a08d7837302f2a5efdcbcfe1cb7ac6d3daa6c; its rollback unchanged, 8de3190b97a3f36edef6cb2087124f7898f5c71e84c423ad017e65da8f19a4f4
- Runbook v5 `docs/p1-25/RUNBOOK-COMPLETION-v5.md`: 45881e661721d89e8a2c05f5a84a4ab567458f0f4324959e04757977386b51e5 (supersedes the v4 one-liner, which is left as is)

## What changed in v5

1. `p1_25_complete_account_deletion(p_request_id uuid, p_mode text DEFAULT 'dry_run', p_expected jsonb DEFAULT NULL)`. Live columns checked read-only (7:54 PM ET): `client_feedback.user_id` and `product_events.user_id`, both uuid, FK to auth.users ON DELETE SET NULL. In the same transaction, after the 5-list cleanup and **before** `public.users` / `auth.users` are deleted, it deletes `client_feedback` and `product_events` rows where `user_id` = the account. The account's deletion-request note in client_feedback goes too; the `account_deletion_requests` row stays as the record.
2. The dry run returns `expected`: counts per table for public.leads, sport_pack_waitlist, investor_requests, partner_inquiries, yoga_testers, client_feedback, product_events, public.users, auth.users. Apply needs `p_expected` = that recorded object. It stops, erasing nothing, if p_expected is missing, if the counts now differ, or if the rows actually erased differ (checked before marking completed; the whole call rolls back). Enforcing this in the function goes slightly past "update the runbook" so the "or it stops" rule holds even if someone skips the runbook.
3. Still no backup at completion.
4. Runbook v5: the hook is the ONLY allowed way to complete a customer deletion; never the Supabase dashboard "Delete user" button. A dry run must come first and be recorded (date/time ET, request id, counts per table); the real run must match or it stops.

## When each kind of data is erased (for Stacy)

"Completion" = the privacy team finishing the request with the hook, due within 30 days of the request. **The 90-day purge does nothing until it is applied and scheduled. That is a later gated step that has not happened: the function is unapplied and the cron file is NOT_FOR_APPLY.** The completion hook is also unapplied; until it is, completion stays the manual runbook SQL.

| Data | When erased | Why / how |
|---|---|---|
| Safety copies (lumbar_null_backup_20261021_*, rescore_backup_20261021_*, fg36 pair) | At request (best effort) and before completion (runbook steps 2–3) | `erase_backup_copies_for_user`, verified by a second person |
| `leads` (user id or email) | **At completion** | Before public.users is deleted, which would null `converted_user_id` |
| `sport_pack_waitlist`, `investor_requests`, `partner_inquiries`, `yoga_testers` (email) | **At completion** | Matched while the email is still on the account |
| **`client_feedback`** (user_id), including the deletion-request note | **At completion (new in v5)** | Before auth.users is deleted, which would null `user_id` and leave them unpurgeable |
| **`product_events`** (user_id) | **At completion (new in v5)** | Same reason |
| `public.users`, `auth.users` | **At completion** | The account itself |
| Everything ON DELETE CASCADE from those (e.g. assessments, protocols, protocol_sessions, ai_conversations/messages, mood_*, body_metrics, progress_photos rows, push_*, email_sends, surveys, athletes, clients, coaches, coach_assignments, coach_notes, coach_video_feedback, consents, user_ads_consent, auth.identities, auth.sessions, auth.mfa_*) | **At completion** | FK cascade (live list in `COMPLETION-LOCATION-EVIDENCE-v4.json`) |
| Stripe customer, Resend contact, Storage files | At completion, by hand (runbook) | Outside the database |
| No-FK rows still holding the user id (e.g. stripe_checkout_claims, athlete_injuries, attendance, coach_competitors, any remaining fg36/rescore/lumbar copies, `storage.objects` metadata, the request row) | **90 days after completion**, once the purge is applied and scheduled | v3 inventory, by user id |
| Any of the 5 lists whose email is still recoverable at day 90 | **90 days after completion**, once applied and scheduled | v4 sweep, a backstop |
| Copy of what day 90 erased (`zz_bak_p1_25_<UTC>`) | Dropped by the next apply run once older than 7 days: **7 days plus the time until the next run** | Restore window; none at completion |
| `billing_consents` | **Kept** (no end date in this code) | Legal proof of billing terms |
| `consent_events` | **Kept**; user_id set to null at completion | Legal proof of consents |
| `schools` | Kept; owner link set to null | Shared gym/coach record |
| Anonymous `product_events` (no user_id) | Kept | Not linked to any account |
| 7c71e421, `ops.internal_accounts`, test fixtures | **Kept**; hook and purge refuse them | Staff and test, not customers |

**Kept by our providers** (not touched by either function):
- Supabase Auth audit and flow logs (`auth.audit_log_entries`, `auth.flow_state`)
- Supabase platform / Studio logs
- Stripe records (customers, subscriptions, invoices, payments), on Stripe's schedule
- Supabase managed backups: none on the Free plan (v2 finding)

## Tests (PGlite 0.5.16, Node v24.22.1)

- v5 suite `test-v5.mjs` (renamed from test-v4.mjs and extended): **35/35 PASS**. Added V1 dry run reports client_feedback and product_events counts; V2 apply without the recorded counts is refused, nothing erased; V3 apply after a new product event (counts differ) stops, nothing erased; V4 client_feedback (incl. the request note) and product_events erased; V5 other users' rows and anonymous events untouched; V6 forced failure at the product_events delete rolls back the lists and the client_feedback delete. C12/C13 (failures at the list cleanup and at the auth.users delete) now also confirm client_feedback/product_events unchanged; C14–C16 exclusions also leave them unchanged; C21 service_role-only on the new signature; C25 rollback drops the four functions.
- v3 suite `test.mjs` against the unchanged day-90 purge: **40/40 PASS**.
- Total **75/75**. These suites are Node/PGlite JavaScript, as in v3/v4, so no deno run or TypeScript type check applies to them.

## Live qualifying count (read-only)

**7:58 PM ET**, project cqzvqzwwevnflinxgnpp, counts only: qualifying at day 90 **0**; candidates before exclusions 0; open requests 0; request rows 0; P1-25 functions live 0. Also (7:54 PM ET): client_feedback 1 row, 0 with null user_id; product_events 9,603 rows, 1,879 with null user_id (anonymous or already unlinked).

## Open questions

1. `client_feedback` has a `feedback-to-notion` trigger. If it copies new feedback to Notion, the deletion-request note, which holds the person's email, also exists in Notion. Neither function touches Notion. Should Notion be listed as kept by a provider, or added to the manual completion steps?
2. The 1,879 product_events rows with null user_id can't be tied to any account. They're treated as anonymous and kept.
3. Requiring `p_expected` in the function itself goes past the runbook-only change asked for. Keep it, or drop it to a runbook rule?

## Times (America/New_York)

- Branch and worktree: 7:54 PM ET; live column read 7:54 PM ET
- Tests 35/35 and 40/40: 7:56 PM ET (same SQL and test bytes as committed; later commit is docs only)
- Commit 06c604d4: 7:57 PM ET; 24508e01 and plain push: 7:58 PM ET
- Live count: 7:58 PM ET
- This receipt: 7:59 PM ET

No live writes. Nothing applied, deployed or scheduled.
