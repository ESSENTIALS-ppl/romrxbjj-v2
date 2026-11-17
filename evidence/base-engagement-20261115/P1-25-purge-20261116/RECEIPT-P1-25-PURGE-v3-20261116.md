# RECEIPT: P1-25 purge v3 — build only, 2026-11-16 7:32 PM ET (Avery)

BUILD ONLY. No writes to live, no setting changes, no apply_migration, no deploy, no cron, no emails. The original receipt `RECEIPT-P1-25-PURGE-20261116.md` (sha256 starts with **5c8ee929**), the v2 receipt `RECEIPT-P1-25-PURGE-v2-20261116.md` (starts with **af4fd317**), `SHA256SUMS`, and `SHA256SUMS-v2` were not edited. This file is additive, with `SHA256SUMS-v3`.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Identity

- Repo: romrxbjj-v2
- Branch: `feat/p1-25-purge-v3-20261116` off **1607d0c3** (`feat/p1-25-deleted-purge-90d-20261116`)
- Commit: **d535149e6966b6a1a443428aa2956aa4fcb5187b** (plain push to origin; not applied)
- Patch sha256: **9913eb03ccb9865cdf90ddba6de1b6fe40ddec7871a1dddf8068e3107c4e1b15**
- `git patch-id --stable`: **f2b5b8861f929cc6ff1a5190f1abe901144fdb53**
- Function SQL (`supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts.sql`, same path as v1, v3 bytes): **99578b6c50c52a62810aa812d258449e63423b557cb3e8ecdd69d25f58e6728b**
- Rollback SQL (`supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_rollback.sql`, v3 comments, same DROP): **8de3190b97a3f36edef6cb2087124f7898f5c71e84c423ad017e65da8f19a4f4**
- Cron file: unchanged, still `NOT_FOR_APPLY`, still raises if applied.
- Default mode remains `dry_run`. Retention below 90 days is refused.
- Function remains unapplied. Do not apply this commit.

## Qualifier (v3)

An account qualifies ONLY with a completed `public.account_deletion_requests` row whose `completed_at` is more than 90 days old (`status = 'completed'` and `completed_at < now() - retention`). Path 2 (`auth.users.deleted_at` without a completed request) was removed and does not qualify. An open request (`requested` or `in_progress`) and a completed request younger than 90 days do not qualify.

Hard exclusions still apply even when a completed request is older than 90 days: `7c71e421-929b-4691-a6bc-cc614ed2a08d`, every `ops.internal_accounts.user_id`, and test fixtures (`raw_app_meta_data.test_fixture = true`, or `public.is_test_account` when that function exists). Those are staff and test, not customers.

The account email is captured from `auth.users.email`, then `public.users.email` if that column exists, before any `auth.users` delete. Matches on email are case-insensitive and trimmed. `account_deletion_requests` has no email column.

## What is erased (each table and match key)

Apply-mode copies matching rows into `zz_bak_p1_25_*`, then deletes them. A table that is absent, or is missing the named column, is skipped; column names are not guessed.

**v3 additions (live catalog 2026-11-16, project cqzvqzwwevnflinxgnpp):**

- `public.leads` — `converted_user_id` OR `email` (all of the account's matching rows)
- `public.sport_pack_waitlist` — `email` only (no user-id column)
- `public.investor_requests` — `email` only (no user-id column)
- `public.partner_inquiries` — `email` only (no user-id column)
- `public.yoga_testers` — `email` only (no user-id column; email is the primary key)
- `public.athlete_injuries` — `athlete_user_id` only (no email column; no FK to users)
- `public.attendance` — `athlete_user_id` only (no email column; no FK to users)
- `public.coach_competitors` — `athlete_user_id` only (no email column; no FK to users)

**Existing inventory, still erased when the named key matches a qualifying user id:**

- `public.users` — `id`
- `public.assessments` — `user_id`
- `public.assessment_drafts` — `user_id`
- `public.joint_scores` — `assessment_id` of a qualifying user's assessments
- `public.protocols`, `protocol_completions`, `protocol_sessions` — `user_id`
- `public.notification_preferences`, `mood_entries`, `mood_settings` — `user_id`
- `public.sport_entitlements`, `user_mobility_schedule`, `body_metrics`, `progress_photos` — `user_id`
- `public.push_subscriptions`, `push_sends`, `email_sends` — `user_id`
- `public.ai_conversations`, `ai_messages`, `user_ai_preferences` — `user_id`
- `public.athletes`, `clients`, `coaches` — `user_id`
- `public.drill_sessions`, `fuel_logs`, `game_plans`, `mesocycles`, `pr_records`, `surveys` — `user_id`
- `public.technique_eligibility`, `user_technique_competency`, `workouts`, `workout_sets` — `user_id`
- `public.renewal_reminders` — `user_id`
- `public.alert_dismissals` — `athlete_id`
- `public.coach_assignments`, `coach_video_feedback` — `athlete_user_id`
- `public.coach_notes` — `athlete_id`
- `public.product_events`, `client_feedback`, `stripe_checkout_claims` — `user_id`
- `public.account_deletion_requests` — `user_id`
- `public.fg36_rescore_log` — `user_id`; `public.fg36_rescore_backup` — `user_id` or `run_id` via that log
- `public.lumbar_null_backup_20261021_protocols` — `user_id`
- `public.lumbar_null_backup_20261021_assessments` — `id` of a qualifying assessment
- `public.lumbar_null_backup_20261021_joint_scores` — `assessment_id` of a qualifying assessment
- `public.rescore_backup_20261021_assessments`, `rescore_backup_20261021_protocols` — `user_id`
- `public.rescore_backup_20261021_joint_scores` — `assessment_id` of a qualifying assessment
- `storage.objects` — `owner` / `owner_id` equals a qualifying id, or `name` equals a qualifying `progress_photos.storage_path`
- `auth.users` — `id` (deleted last; cascades identities, sessions, and other ON DELETE CASCADE auth children)

## What we keep, and why

- `public.billing_consents` — legal proof of billing terms. Not copied, not deleted. No end date in this code.
- `public.consent_events` — legal proof of consents given or withdrawn (for example reminder opt-ins). Not copied, not deleted. No end date in this code. Live FK is ON DELETE SET NULL, so a later auth delete may null `user_id` but the row stays.
- Exclusions for `7c71e421-929b-4691-a6bc-cc614ed2a08d`, `ops.internal_accounts` ids, and test fixtures — staff and test, not customers. Their rows are not purged even with a completed request older than 90 days. The `ops.internal_accounts` table itself is never written.

## What is kept by our providers

- Auth audit and flow logs (`auth.audit_log_entries`, `auth.flow_state`) — not in the inventory, not copied, not deleted.
- Platform / Studio logs — outside this database function, not touched.
- Stripe — this function never calls Stripe. Stripe-side customers, subscriptions, invoices, and payment methods remain. (In-database `public.stripe_checkout_claims` rows are erased when `user_id` still matches, as listed above. `billing_consents` still holds Stripe ids on kept rows.)

## Backup window

- After an apply-mode run, a copy of what was just erased is kept in schema `zz_bak_p1_25_YYYYMMDDHH24MISS`. Creation time is recorded in the UTC stamp in the name, a schema comment `p1_25_backup created_at=<ISO Z>`, and table `_p1_25_backup_meta.created_at` (read in that order: meta, comment, name).
- Each apply-mode run drops any `zz_bak_p1_25_*` schema older than 7 days. The run's own backup is dropped by a later apply-mode run once it is older than 7 days. Dry-run and count modes do not create or drop backups.
- Supabase Free has no managed backups or PITR, per the v2 sources (`get_organization` plan `free` / `tier_free`; official backups and PITR docs). Official published paid-plan daily/PITR windows are all under 90 days.
- Manual or off-site dumps are unknown.

## Tests

40/40 PASS (PGlite 0.5.16, `node test.mjs`; existing suite updated for v3 and extended). Coverage: only a completed request older than 90 days qualifies; path 2 no longer qualifies; an open request and one under 90 days do not qualify; dry-run writes nothing and does not drop backups; apply deletes only qualifying rows and writes a backup with meta; restore from backup; never touches `7c71e421`, `ops.internal_accounts`, or fixtures; `billing_consents` and `consent_events` survive; each v3 table is purged on a user-id match and/or an email match as the columns allow, and is untouched for another user and for excluded / under-90 / open / path-2 accounts; a backup older than 7 days is dropped and one younger than 7 days is kept; a later apply drops the run's own backup once aged past 7 days; function rollback drops the function; cron file is refused.

## Live qualifying count (read-only)

Read at **7:28 PM ET (America/New_York)** on 2026-11-16, project `cqzvqzwwevnflinxgnpp`, via MCP `execute_sql`. Counts only; no emails, names, or row contents were selected.

- Qualifying under v3 rules: **0**
- Candidates before exclusions: 0
- Completed ADR rows, any age: 0
- Completed ADR under 90 days: 0
- Open requests older than 90 days: 0
- Soft-deleted auth users (path 2, unused in v3): 0

## Column gaps

- Pre-account lists (`sport_pack_waitlist`, `investor_requests`, `partner_inquiries`, `yoga_testers`) have an `email` column and no user-id column. They are matched on email only.
- Coach/athlete tables (`athlete_injuries`, `attendance`, `coach_competitors`) have `athlete_user_id` and no email column. They are matched on user id only.
- If both `auth.users` and `public.users` rows are already gone when the 90-day run starts (the 30-day completion step can delete them), the email cannot be captured (`account_deletion_requests` has no email). Email-only tables then cannot be matched for that account. User-id matches still run where the id column is still populated. `leads.converted_user_id` is ON DELETE SET NULL to `public.users`, so a prior users delete also unlinks those lead rows.

## Times (America/New_York)

- Build started: 7:25 PM ET, 2026-11-16
- Live count read: 7:28 PM ET
- Tests 40/40: 7:31 PM ET
- Commit `d535149e` and plain push: 7:31–7:32 PM ET
- This receipt: 7:32 PM ET

No live writes. Function remains unapplied.
