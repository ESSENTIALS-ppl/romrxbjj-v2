# P1-25 v4 build notes (UNAPPLIED; BUILD ONLY), 2026-11-16 ET

Base: d535149e6966b6a1a443428aa2956aa4fcb5187b (feat/p1-25-purge-v3-20261116). Branch: feat/p1-25-purge-v4-20261116.
Grant's call (a): no stored email hash; clear the email-matched lists AT COMPLETION. L1004: "Purge deleted accounts after 90 days."
Nothing applied, deployed, scheduled, or changed live. Every hunk in this commit:

1. `supabase/migrations-unapplied/20261117010000_p1_25_purge_deleted_accounts.sql` (modified, 2 hunks)
   - `@@ -1 +1 @@` header line: "v3." becomes "v4 (v3 plus the day-90 email sweep sources and the other-account email guard)."
   - `@@ -217,0 +218,52 @@` inserted after the public.users email capture and before the `_rels` inventory:
     (a) day-90 sweep: adds emails still recoverable for qualifying accounts from auth.identities.email (user_id),
     public.athletes.email (user_id), public.clients.email (user_id), public.leads.email (converted_user_id), each
     skipped if the table or column is absent; (b) guard: removes from the match set any email that still belongs
     to a non-qualifying auth.users or public.users row (covers 7c71e421, internal accounts, fixtures and every
     other live account). Nothing else in the function changed (qualifier, exclusions, inventory, 7-day backup,
     dry_run default, 90-day floor).
2. `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup.sql` (new, 260 lines): four SECURITY
   DEFINER functions, EXECUTE service_role only: p1_25_exclusion_class(uuid), p1_25_account_emails(uuid),
   p1_25_cleanup_at_completion(uuid, text default 'dry_run'), p1_25_complete_account_deletion(uuid request id,
   text default 'dry_run'). Completion = one call = one transaction: lock request (must be requested/in_progress),
   refuse exclusions, cleanup of leads (converted_user_id or email) + sport_pack_waitlist, investor_requests,
   partner_inquiries, yoga_testers (email, lower/btrim), DELETE public.users, DELETE auth.users, status='completed'.
3. `supabase/migrations-unapplied/20261117010100_p1_25_completion_cleanup_rollback.sql` (new, 8 lines): drops the four functions.
4. `docs/p1-25/RUNBOOK-COMPLETION-v4.md` (new, 1 line): the one-line runbook entry.
5. `docs/p1-25/BUILD-NOTES-v4.md` (new): this file.
6. `scripts/p1-25-purge-deleted-accounts-test/test-v4.mjs` (new, 295 lines): PGlite tests C1-C25, S1-S4.
7. `scripts/p1-25-purge-deleted-accounts-test/results-v4.json` (new): v4 test output, 29/29.
8. `scripts/p1-25-purge-deleted-accounts-test/results.json` (modified, 5 one-line hunks at lines 109, 141, 156,
   262, 264): only the generated zz_bak_p1_25_* schema names (run timestamps) from re-running the v3 suite, 40/40.
