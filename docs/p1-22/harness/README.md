# P1-22 scratch-DB harness (for Reid)

Local write-path checks only. This is not production and it does not connect to Supabase project cqzvqzwwevnflinxgnpp.

## What it covers

- Event split: `ops.user_actions` vs `product_event_kind`.
- checkout_completed: prefer stripe_checkout_session_id; historic fallback is user + purpose + a 2-hour timestamp window (gaps-and-islands). Unique index on the session id for new rows.
- protocol_completions: RPC writer and the fallback trigger + backfill.
- Exclusions: `is_test_account` (jim+romrx- pattern AND test_fixture) and the empty `ops.internal_accounts` hook.

## Run (PGlite)

```bash
cd harness
npm install
node test.mjs
```

The test loads `@electric-sql/pglite/contrib/pgcrypto` so `gen_random_uuid()` works. The schema stub also creates the `anon`, `authenticated`, and `service_role` roles the live migration GRANTs to. Do not commit `node_modules`.

The test creates an in-memory PGlite database, loads `schema-stub.sql` (a small copy of the live tables this item uses), applies `p1_22_migration.sql` (the UNAPPLIED migration, with a couple of trigger-syntax adjustments for PGlite), and runs the assertions in `test.mjs`.

A local Postgres works too: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f schema-stub.sql -f p1_22_migration.sql`, then run the same assertions as `test.mjs`.

No secrets, no live credentials, no user emails (only obviously fake fixture addresses in the test).
