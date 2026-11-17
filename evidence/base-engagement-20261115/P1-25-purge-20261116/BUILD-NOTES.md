# P1-25 BUILD-NOTES — deleted-account purge at 90 days (BUILD ONLY)

Started: Mon Nov 16, 2026, 7:06 PM ET (America/New_York). Finished: same evening. Nothing applied, deployed, scheduled, or emailed.

Branch: romrxbjj-v2 `feat/p1-25-deleted-purge-90d-20261116` off origin/main (`a34aa573`). Parent is the L1078 rename commit; do not re-apply it.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Hunks (every changed path; all new files)

1. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts.sql` — new, unapplied. Adds `public.purge_deleted_accounts(text, interval)` (default `dry_run`, minimum 90 days). Security definer, execute for postgres and service_role only. No cron.
2. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_rollback.sql` — new, unapplied. Drops the function. Does not restore purged rows (see item 4).
3. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql` — new, unapplied, hard-guarded. Raises if applied. Cron stays unscheduled. Intended future job is documented in comments only.
4. `docs/p1-25/BACKUP-AND-ROLLBACK.md` — new. What apply-mode keeps (`zz_bak_p1_25_*` schema + manifest + per-table copies) and how to restore.
5. `docs/p1-25/PUBLIC-TIMELINE-LINE-FOR-STACY.md` — new. Draft public line for Stacy to word: "Data from deleted accounts is permanently erased 90 days after deletion."
6. `docs/p1-25/BUILD-NOTES.md` — this file.
7. `scripts/p1-25-purge-deleted-accounts-test/package.json` — PGlite 0.5.16 harness.
8. `scripts/p1-25-purge-deleted-accounts-test/package-lock.json` — lockfile from `npm i`.
9. `scripts/p1-25-purge-deleted-accounts-test/test.mjs` — 25 PGlite tests (emails only `user@example.com`).
10. `scripts/p1-25-purge-deleted-accounts-test/results.json` — 25/25 PASS.
11. `scripts/p1-25-purge-deleted-accounts-test/.gitignore` — ignores `node_modules`.

No other paths. No live function, no migration under `supabase/migrations/`, no edge function, no web app, no SHA256SUMS in the repo root, no change to `purge_account_deletion_requests`, and no touch of account `7c71e421`.

## Tests

25/25 PASS (`node test.mjs` after `npm i`). Covers: under 90 days excluded; over 90 days included (ADR completed and `auth.users.deleted_at`); requested-but-not-completed excluded; dry-run writes nothing; count-only lists no ids; retention below 90 days refused; apply deletes only qualifying rows and writes a backup schema; restore from backup; never touches `7c71e421`, `ops.internal_accounts`, or fixtures; leave-alone `billing_consents` / `consent_events`; function rollback; cron file refused.

## Live read-only count (2026-11-16, evening ET)

Qualifying accounts now: **0**. Candidates before exclusions: 0. Completed ADR rows: 0. Soft-deleted auth users: 0. Open requests older than 90 days: 0. No emails were selected.
