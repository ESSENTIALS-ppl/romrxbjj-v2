# RECEIPT: P1-25 deleted-account purge at 90 days (BUILD ONLY), 2026-11-16 7:11 PM ET (Avery)

BUILD ONLY. Not applied: no apply_migration, no deploy, no cron schedule, no emails, no data changes. MCP SELECTs and catalog reads only. No secrets and no user emails are in this folder.

## Authority and Jim's words

Ledger L1004, 2026-11-03 7:07 PM ET (6:07 PM CT), Jim, verbatim: **"Purge deleted accounts after 90 days."**

This package is scoped only to that sentence: a function that hard-deletes remaining data for accounts already marked deleted, once that mark is more than 90 days old. It does not change the 30-day manual completion of a deletion request, and it does not treat an open request (`requested` / `in_progress`) as a deleted account. A prior Nov 3 package that only scheduled `purge_account_deletion_requests` (log rows) was a team reading and is not this work; that function is unchanged and still unscheduled.

## Commit

- Repo ESSENTIALS-ppl/romrxbjj-v2, branch **feat/p1-25-deleted-purge-90d-20261116** (plain push, new branch, not main).
- Commit **1607d0c3d2ec4208d358449ed785b7334bc62f85**, parent **a34aa573a160c674cfdf9660cec30304161f1044** (origin/main, L1078 rename; already applied, do not re-apply).
- `git show --format= --patch` sha256 **8f64320f615cae2bd7778b8ba790f535911acebde387f300262ac4eaf932e316**. `git patch-id --stable` ebeb975554ea960af67c97a0a0d048b442276918. 11 files, +1093/-0, all new.

## How deletion is marked today (live read, project cqzvqzwwevnflinxgnpp)

- `request-account-deletion` v11 (`verify_jwt` true, ezbr d662e9b8…) files `public.account_deletion_requests` (status default `requested`; allowed `requested`, `in_progress`, `completed`, `failed`) and erases safety-copy rows. It does not delete the account or live data. The privacy team completes deletion manually within 30 days.
- `completed_at` is set when status becomes `completed`. `auth.users.deleted_at` exists (GoTrue soft-delete) but is unused: 0 rows.
- `public.purge_account_deletion_requests(interval)` already deletes completed request-log rows only (md5 681bf417…, refuses retention under 30 days). It is not in `cron.job`. Unchanged by this package.
- Most user tables are `ON DELETE CASCADE` from `auth.users` or `public.users`. Survivors after an auth-user delete include SET NULL columns (`client_feedback`, `product_events`, `consent_events`, `leads.converted_user_id`, `schools.admin_id`) and no-FK tables (`billing_consents`, `stripe_checkout_claims`, the 20261021 backup tables, `fg36_rescore_*`, `account_deletion_requests`). `ops.internal_accounts` is never written by this function.

## What this package adds (unapplied)

- `public.purge_deleted_accounts(p_mode text default 'dry_run', p_retention interval default interval '90 days')` returns jsonb. Default dry-run counts and lists user ids and writes nothing. `count` / `count_only` returns counts only (no ids). `apply` is opt-in: copies qualifying rows into a new schema `zz_bak_p1_25_YYYYMMDDHHMMSS`, then hard-deletes remaining account data. Retention below 90 days is refused.
- An account qualifies only if it is already marked deleted and that mark is older than the retention: (a) `account_deletion_requests.status = 'completed'` and `completed_at < now() - retention`, and/or (b) `auth.users.deleted_at < now() - retention`.
- Never purged: `7c71e421-929b-4691-a6bc-cc614ed2a08d`, every `ops.internal_accounts` id (the staff table itself is not written), and test fixtures (`raw_app_meta_data.test_fixture = true`, or `public.is_test_account(email)` when that function exists).
- Leave-alone (not copied, not deleted): `ops.internal_accounts`, `public.billing_consents`, `public.consent_events`. L1004 does not amend a separate consent-retention rule. If the auth user was already deleted in the 30-day manual step, SET NULL leftovers may no longer be attributable by `user_id`; the function still removes no-FK rows that still carry the id (claims, backup copies, the ADR row).
- Cron stays unscheduled. `20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql` raises if applied. The first live runs, once gated, should be `count`, then `dry_run`. Switching the command to `apply` needs its own gate.
- Migration id `20261117010000` sorts after live list_migrations head **20261117000244** (`p1_22_checkout_deduped_exclude_test`).

File sha256:

- function SQL **de9996d717ab4aafc030cf91d0e4eb9e1dabd458d8272588b36c83a50e447552**
- rollback (drops the function) **8d8a643d98715f6b38b4ceaa5c431cf0c24f9fa5849090e66f0d01d794985691**
- cron NOT_FOR_APPLY **d6d51b5d7605093957fc582a4434dd440e9094232f6281b4a66117e5bb46b043**

## Tests

25/25 PASS, PGlite 0.5.16 (`scripts/p1-25-purge-deleted-accounts-test`, `results.json` sha256 **f1863714024f8db18e8ac58729a5440ad9c0fa00a313790d1b73ebf74335f31f**). Covers: under 90 days excluded; over 90 days included (completed ADR and `deleted_at`); requested-but-not-completed excluded; dry-run writes nothing; count-only lists no ids; retention below 90 days refused; apply deletes only qualifying rows and writes a backup schema; restore from that backup; never touches `7c71e421`, `ops.internal_accounts`, or fixtures; leave-alone billing/consent_events; function rollback; cron file refused.

## Live qualifying count (read-only, counts only, no emails)

Read the evening of 2026-11-16, America/New_York:

- qualifying accounts now: **0**
- candidates before exclusions: 0
- completed ADR rows (any age): 0
- soft-deleted auth users (any age): 0
- open requests older than 90 days: 0

## Rollback

- Before any apply-mode run: `20261117010000_p1_25_purge_deleted_accounts_rollback.sql` drops the function.
- After an apply-mode run: restore from the `zz_bak_p1_25_*` schema named in the apply receipt, per `docs/p1-25/BACKUP-AND-ROLLBACK.md`. The backup schema is kept; dropping it is a delete and needs its own yes.
- Cron: nothing to unschedule.

## Public timeline line (draft for Stacy to word)

> Data from deleted accounts is permanently erased 90 days after deletion.

Must keep "90 days" to match Jim's words. Not for publish from this file. See `PUBLIC-TIMELINE-LINE-FOR-STACY.md`.

## Not done / not covered

- Applying the function or scheduling the cron.
- Changing the 30-day manual completion process, in-app copy, or the privacy email.
- Purging `billing_consents` or `consent_events`.
- Any privacy-page edit in the web app (Stacy words the line first).
