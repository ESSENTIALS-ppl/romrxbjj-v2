# P1-25 v5 build notes (UNAPPLIED; BUILD ONLY), 2026-11-16 ET

Base: 1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae (feat/p1-25-purge-v4-20261116). Branch: feat/p1-25-purge-v5-20261116.
Grant's follow-up: erase client_feedback and product_events at completion; dry run first with recorded counts,
apply must match; the hook is the only allowed way to complete a customer deletion. No backup at completion (unchanged).
Live columns checked read-only: client_feedback.user_id uuid and product_events.user_id uuid, both FK to auth.users
ON DELETE SET NULL. Nothing applied, deployed, scheduled, or changed live. Every hunk in this commit:

1. `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup.sql` (modified, 13 hunks)
   - `@@ -1 +1,2 @@` header: v4 becomes v5 (client_feedback/product_events at completion; apply must match the dry run).
   - `@@ -15,2 +16,3 @@` header: new signature (uuid, text default 'dry_run', jsonb default null); step order adds
     DELETE client_feedback and product_events (user_id) before public.users / auth.users.
   - `@@ -19 +21,3 @@` header: dry run returns 'expected'; apply needs p_expected and stops if counts differ; ONLY allowed
     way, never the dashboard 'Delete user'.
   - `@@ -194 +198,2 @@` adds parameter `p_expected jsonb DEFAULT NULL`.
   - `@@ -203,0 +209,4 @@` declares v_plan, v_n, v_cf, v_pe.
   - `@@ -223,2 +232,17 @@` builds the plan inside the transaction (request row locked): the 5 list counts from
     p1_25_cleanup_at_completion(user, 'dry_run'), plus client_feedback, product_events (user_id), public.users, auth.users.
   - `@@ -227,2 +250,0 @@` removes the v4 dry-run-only user counts (now part of the plan).
   - `@@ -231 +253,2 @@` dry run returns emails_matched (a count) and `expected` = the plan.
   - `@@ -235 +258,22 @@` apply: refuse without p_expected; refuse if p_expected differs from the plan; cleanup in
     apply mode; DELETE client_feedback and product_events where user_id = the account, before the user deletes.
   - `@@ -241 +285,10 @@` after the deletes, the erased counts must equal the plan, else raise (whole call rolls back).
   - `@@ -246,2 +299 @@` apply returns `erased` (counts per table).
   - `@@ -256 +308 @@` and `@@ -260 +312 @@` REVOKE / GRANT on the new (uuid, text, jsonb) signature.
2. `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup_rollback.sql` (modified, 1 hunk `@@ -1,4 +1,5 @@`
   plus the drop lines): drops the v5 signature and, IF EXISTS, the v4 signature, then the other three functions.
3. `docs/p1-25/RUNBOOK-COMPLETION-v5.md` (new): only-allowed-way rule, never the dashboard 'Delete user'; dry run
   first, recorded (ET date/time, request id, counts per table); apply with the recorded counts or it stops.
4. `docs/p1-25/BUILD-NOTES-v5.md` (new): this file.
5. `scripts/p1-25-purge-deleted-accounts-test/test-v4.mjs` renamed to `test-v5.mjs` and updated: schema adds
   client_feedback and product_events (FK SET NULL, as live); seeds; helpers for dry run then apply with the
   recorded counts; new tests V1-V6; C-tests adapted to the v5 return shape; exclusion tests also check
   client_feedback/product_events unchanged.
6. `scripts/p1-25-purge-deleted-accounts-test/results-v4.json` renamed to `results-v5.json` (35/35 output).
7. `scripts/p1-25-purge-deleted-accounts-test/results.json` (modified): only the generated zz_bak_p1_25_* schema
   names from re-running the v3 suite (40/40).
The day-90 purge file `20261117010000_p1_25_purge_deleted_accounts.sql` is unchanged from v4.
