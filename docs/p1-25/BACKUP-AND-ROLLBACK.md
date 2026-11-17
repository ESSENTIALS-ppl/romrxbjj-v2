# P1-25 backup and rollback plan

BUILD ONLY. Nothing in this file is to be run against live until a gate names the apply and, separately, any restore.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## What is kept before a purge

`public.purge_deleted_accounts('apply', interval '90 days')` creates a new schema named `zz_bak_p1_25_YYYYMMDDHHMMSS` (UTC stamp) and, for each qualifying user:

- `manifest`: `user_id`, `marked_at` (the deletion mark used), `sources`, `backed_up_at`. Ids only, no emails.
- One table per existing inventory relation, named `schema__table` (for example `public__assessments`, `auth__users`, `storage__objects`), containing the rows that are about to be deleted.

The backup stays in the database with row level security enabled. It is not copied to receipts or git. Receipts may name the schema and row counts only. `auth.users` backup rows include every column so a restore can put the login back; those columns must not be printed.

Not copied, not deleted: `ops.internal_accounts`, `public.billing_consents`, `public.consent_events`.

If apply never runs, there is no backup schema and the function-only rollback below is enough.

## How to roll back the function (no apply-mode run yet)

Apply the companion file `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts_rollback.sql` through MCP `apply_migration` only after a gate. It drops `public.purge_deleted_accounts(text, interval)`. It does not touch data or cron (cron is unscheduled).

## How to restore after an apply-mode run

Needs its own Jim yes and a gate. Outline only:

1. Identify the backup schema from the apply receipt (`backup_schema`).
2. Restore `auth.users` from `auth__users` first, then `public.users`, then the other `schema__table` copies, in foreign-key order (parents before children). Use `INSERT ... SELECT ... WHERE NOT EXISTS` so existing rows are not duplicated.
3. Restore `storage.objects` from `storage__objects` if that table is in the schema.
4. Confirm counts against `manifest`. Leave the backup schema in place; dropping it is a delete and needs its own yes.

Rows that were already gone before this function ran (for example `product_events.user_id` already set null because the auth user was deleted in the 30-day manual step) cannot be reconstructed from this backup.

## Cron

The cron file is marked `NOT_FOR_APPLY` and raises an exception if applied. There is nothing to unschedule today. A future schedule would be rolled back with `select cron.unschedule('purge-deleted-accounts-daily')`.
