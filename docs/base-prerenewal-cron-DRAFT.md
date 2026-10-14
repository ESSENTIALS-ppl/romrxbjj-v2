# Base pre-renewal reminder: Dec 18 cron sender (DRAFT, stacked on #76 / #75)

Nothing here is deployed, scheduled, or sent. Copy stays marked DRAFT until Stacy approves the words.

## What it does
- Edge function `send-base-prerenewal-reminder` (new, v1 DRAFT), logic in `_shared/prerenewal_cron.ts`.
- Called daily by pg_cron through `public.cron_call_edge` (x-cron-secret vs Vault `cron_webhook_secret`, fail-closed, same gate as `send-conversion-drip`).
- OFF unless the function env var `PREREMINDER_CRON_ENABLED=true` (separate from the webhook flag `PREREMINDER_ENABLED`).
- Window (America/New_York dates): sends from the target date (default `2026-12-18`, override with `PREREMINDER_CRON_TARGET_DATE`, must lie in Dec 11-28) through Dec 28 inclusive. Late signups or a failed run catch up on later days. After Dec 28 it does nothing (Stripe's own `trial_will_end`, about Dec 29 12:00 ET, is handled by the stripe-webhook path from #76).
- Candidates: `users.base_status='active'` with a `base_stripe_subscription_id`. Then per user:
  1. skip DB-side cancel state (`base_cancel_at_period_end`, `base_cancel_at`, `base_canceled_at`)
  2. skip test fixtures (`public.is_test_account(email)`)
  3. skip if an `email_sends` row `base_trial_will_end` already exists (no Stripe call)
  4. fetch the Stripe subscription; `decideReminder()` from #76 skips non-Base (`metadata.purpose != base`), status not `trialing`, cancel scheduled/canceled, accounts under 24h old, no price
  5. require `trial_end` within 24h of 1798822800 (Jan 1, 2027 12:00 ET; last free day Dec 31, 2026)
  6. claim `email_sends (user_id, 'base_trial_will_end')`; if the insert fails (webhook or an earlier run got there first) skip; on a Resend failure the claim is deleted so tomorrow retries
- Same copy builder as #76 (`reminderSubject/Html/Text`), same sender as the webhook handler (`ROMRx <hello@romrx.io>`), Resend `Idempotency-Key: base_trial_will_end-<userId>`.
- Not skipped for `marketing_opt_out`: it is a transactional renewal/charge notice (same as the webhook path).
- `{"dry_run": true}` in the POST body lists would-send counts without claiming or sending (manual call only; cron posts `{}`).

## Never both
The webhook handler (#76) and this sender use the same `email_sends` claim (`base_trial_will_end`). Whichever runs first wins; the other skips (`already_claimed` / `already_sent`).

## Cron job (file only)
`supabase/migrations_draft/20261003120000_cron_base_prerenewal_reminder.sql` (deliberately NOT under `supabase/migrations/`). Schedule `0 15 18-28 12 *` (UTC) = 10:00 ET on Dec 18-28.
The existing `send-renewal-reminders-daily` job is not touched here; see the runbook for the exact unschedule and re-schedule SQL.

## Tests
`supabase/functions/_tests/prerenewal_cron_test.ts` (window, target match, flag off, skips, dry run, never-both, failure releases the claim).

## Go-live order (Grant)
Stacy OKs copy -> flip `PREREMINDER_COPY_APPROVED` -> Reid retests with fixtures (Stripe test mode, dry_run first) -> deploy function -> set `PREREMINDER_CRON_ENABLED=true` -> move the SQL into `supabase/migrations/` and apply. Tell Grant before and after.
Rollback: unset `PREREMINDER_CRON_ENABLED` (stops sends immediately), `select cron.unschedule('base-prerenewal-reminder-daily');`, delete the function. A sent email leaves one `email_sends` row (delete it to allow a resend).
