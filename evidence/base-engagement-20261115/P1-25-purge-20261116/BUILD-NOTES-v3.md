# P1-25 BUILD-NOTES — deleted-account purge at 90 days, v3 (BUILD ONLY)

Started: Mon Nov 16, 2026, 7:25 PM ET (America/New_York). Finished: same evening. Nothing applied, deployed, scheduled, or emailed.

Branch: romrxbjj-v2 `feat/p1-25-purge-v3-20261116` off `1607d0c3` (`feat/p1-25-deleted-purge-90d-20261116`). Parent is the v1 unapplied function commit; do not apply that commit or this one.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

Grant v3 spec (relayed): drop path 2; time-limit the `zz_bak_p1_25_*` backup to 7 days; also purge leads, pre-account email lists, and no-FK coach/athlete rows; keep exclusions, consents, and provider-held logs/Stripe.

## Hunks (every changed path)

1. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts.sql` — v3 of the unapplied function (same filename, CREATE OR REPLACE). Qualifier is only a completed `account_deletion_requests` row whose `completed_at` is older than retention; the `auth.users.deleted_at`-only path is removed. Apply-mode drops any `zz_bak_p1_25_*` schema older than 7 days (age from `_p1_25_backup_meta.created_at`, else the schema comment, else the UTC stamp in the name parsed as ISO-Z). The run's own backup records creation time in the name, a schema comment, and `_p1_25_backup_meta`, and is dropped by a later apply-mode run once older than 7 days. After classifying, the function captures the account email from `auth.users` then `public.users` (before any `auth.users` delete) and also purges: `leads` (match `converted_user_id` OR email, case-insensitive, trimmed); `sport_pack_waitlist`, `investor_requests`, `partner_inquiries`, `yoga_testers` (email only; no user-id column); `athlete_injuries`, `attendance`, `coach_competitors` ( `athlete_user_id` only; no email column). Exclusions, leave-alones, dry-run default, 90-day minimum, and cron-not-in-this-file are unchanged. Return JSON on apply also includes `backup_created_at`, `backup_keep_for` (`7 days`), and `dropped_backup_schemas`.
2. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_rollback.sql` — v3 companion rollback. Still `DROP FUNCTION IF EXISTS public.purge_deleted_accounts(text, interval)`. Comments now say it does not restore purged rows and does not undo a 7-day backup drop.
3. `docs/p1-25/BACKUP-AND-ROLLBACK.md` — documents the 7-day backup window, the three creation-time records, v3 inventory tables on restore, and the email-capture gap if both auth and public user rows are already gone.
4. `docs/p1-25/BUILD-NOTES.md` — this file (v3).
5. `docs/p1-25/PUBLIC-TIMELINE-LINE-FOR-STACY.md` — v3 facts for Stacy (word against the v3 receipt; do not publish from this file).
6. `scripts/p1-25-purge-deleted-accounts-test/test.mjs` — PGlite suite updated and extended (40 tests). Path 2 no longer qualifies; new cases for each added table (user-id and/or email match, other user, excluded / under-90 / open request / path-2 untouched); dry-run writes nothing and does not drop backups; apply drops backups older than 7 days and keeps one younger than 7 days; a later apply drops the run's own backup once aged past 7 days; consents survive; function rollback and cron refuse unchanged.
7. `scripts/p1-25-purge-deleted-accounts-test/results.json` — 40/40 PASS.

Unchanged: `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql` (still raises; not scheduled). No file under `supabase/migrations/`. No edge function, no web app, no SHA256SUMS in the repo root, no change to `purge_account_deletion_requests`, and no touch of account `7c71e421` beyond its exclusion. Fixture `076ce453` was not used.

## Tests

40/40 PASS (`node test.mjs` with PGlite 0.5.16, after `npm i` / existing lockfile). Existing suite kept and updated for v3 rules; new cases as in hunk 6. Emails in the test file are example.com addresses only.

## Live read-only count (2026-11-16, 7:28 PM ET, America/New_York)

Qualifying accounts under v3 rules: **0**. Candidates before exclusions: 0. Completed ADR rows (any age): 0. Completed ADR under 90 days: 0. Open requests older than 90 days: 0. Soft-deleted auth users (path 2, unused in v3): 0. Counts only; no emails or row contents were selected. Project `cqzvqzwwevnflinxgnpp`.
