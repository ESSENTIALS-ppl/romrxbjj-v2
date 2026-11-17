# P1-25 v5 build notes (UNAPPLIED; BUILD ONLY), 2026-11-16 ET

Base: 1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae (feat/p1-25-purge-v4-20261116). Branch: feat/p1-25-purge-v5-20261116.
Grant's follow-up: erase client_feedback and product_events at completion; dry run first with recorded counts,
apply must match; the hook is the only allowed way to complete a customer deletion. No backup at completion (unchanged).
Live columns checked read-only: client_feedback.user_id uuid and product_events.user_id uuid, both FK to auth.users
ON DELETE SET NULL. Nothing applied, deployed, scheduled, or changed live. Every hunk in commits 06c604d4 and its build-notes follow-up (this file only):

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
2. `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup_rollback.sql` (modified, exactly 1 hunk
   `@@ -1,4 +1,5 @@`): the 4 comment lines are reworded for v5 and one line is added,
   `DROP FUNCTION IF EXISTS public.p1_25_complete_account_deletion(uuid, text, jsonb);`. The existing drops of the v4
   signature (uuid, text) and the other three functions are unchanged.
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


# P1-25 v5.1 follow-up (UNAPPLIED; BUILD ONLY), 2026-11-16 ET

Same branch feat/p1-25-purge-v5-20261116, off the v5 tip 24508e0136c662154af8122749f75371cc98c673.
Grant's 8:01 PM ET calls (final): keep the dry-run-count guard, signature (uuid, text, jsonb), no hook or trigger code change;
add a MANUAL runbook step for feedback-to-notion page deletion after the function runs; write the unapplied daily
pg_cron schedule for the 90-day purge. Stacy's cleared Privacy Policy sentence (STACY-P1-25-PURGE-PRIVACY-LINE-v2-20261116-2001.md,
sha256 94fd190ef930d5673e089442940682e170ac2de09989427bebb603bdcdf93bcc) is applied in romrx-io-web, not this repo,
because legal.html lives there. N = 8 (daily run: 7-day zz_bak window plus the max wait until the next run).
Nothing applied, deployed, scheduled, or changed live. Every hunk in this commit:

1. `docs/p1-25/RUNBOOK-COMPLETION-v5.md` (modified, exactly 1 hunk `@@ -8,3 +8,4 @@`): adds step 7, a MANUAL
   completion step after the hook runs. Find and delete the feedback-to-notion Notion page(s) for that user's
   client_feedback rows, and record the page ids deleted (or 'none found') in the completion record. Identify
   page ids at dry run while the rows still exist, if needed; delete only after a successful apply. No trigger
   or code change.
2. `supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron.sql` (new, exactly 1 hunk
   `@@ -0,0 +1,38 @@`): unapplied pg_cron schedule for `purge-deleted-accounts-daily` at `23 4 * * *`
   (04:23 UTC = 11:23 PM ET standard time), command `select public.purge_deleted_accounts('apply', interval '90 days');`.
   Name and time checked against the live 13 jobs (md5 a96d2036959f1dc2697d23e7665cb490, unchanged); no collision;
   renewal cron not touched. The file unschedules only this job name if it already exists, then schedules it.
   Do not apply until a gate names this file's sha256, and only after the function file is applied and a
   count-only then dry_run live run has been reviewed. Supersedes the unchanged NOT_FOR_APPLY sibling.
3. `supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron_rollback.sql` (new, exactly
   1 hunk `@@ -0,0 +1,10 @@`): unschedules `purge-deleted-accounts-daily` by name only, if it exists. Does not
   touch any other job.
4. `docs/p1-25/BUILD-NOTES-v5.md` (modified, exactly 1 hunk `@@ -38,3 +38,40 @@`): this v5.1 section.

No change to `20261117010100_p1_25_completion_cleanup.sql`, its rollback, the day-90 purge SQL, tests, or the
NOT_FOR_APPLY cron file. The dry-run-count guard and (uuid, text, jsonb) signature stay as in v5.

Privacy sentence (romrx-io-web, branch feat/p1-25-purge-privacy-line-20261116, base 29eb4fa66f920450d71c44e6edbad123cfd38596):
`legal.html` only, exactly 1 hunk `@@ -112,7 +112,7 @@`. Replaces the one sentence in Privacy section 4 "Your rights"
with Stacy's v2 AFTER text, `{N}` filled as 8. No literal `{N}` remains. Last-updated lines are unchanged (set on
the ship day). This edit must ship in the same release that applies the completion hook AND applies and schedules
the 90-day purge, never separately.
