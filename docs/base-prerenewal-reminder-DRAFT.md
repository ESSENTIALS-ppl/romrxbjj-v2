# Base pre-renewal reminder (DRAFT, not deployed)
Written Oct 3, 2026. Status: design + code in a draft PR. Nothing deployed, nothing sent.

## What it does
`stripe-webhook` (v45 draft) handles `customer.subscription.trial_will_end`. For a Base free-trial subscription it emails (Resend, `hello@romrx.io`, same brand block as the 3c acknowledgment): what the plan is, price ($60/year, or Base plus sport pack prices), charge date (January 1, 2027), the cancel link `https://romrx.io/app/dashboard/settings`, the cancel steps, and the no-refund line. Copy lives in `_shared/prerenewal_copy.ts`, marked DRAFT for Stacy (subject starts with "[DRAFT] " and the HTML has a banner until `PREREMINDER_COPY_APPROVED` is set to true after her sign-off).

## Safety rules in code
- OFF for live events unless the env var `PREREMINDER_ENABLED=true` (set only after Stacy approves copy and Grant says go). Test-mode events are already limited to fixtures by the existing guard, so they send to the fixture inbox (that is the test path).
- Skips non-Base (needs metadata purpose=base and user_id), sport-pack-only subs, canceled or cancel-scheduled subs, anything not `trialing`, no trial_end, no price amounts.
- Skips live events for `is_test_account` fixtures.
- Idempotent twice: Resend `Idempotency-Key = trial_will_end-{event.id}` and a send-once claim in `public.email_sends (user_id, email_id='base_trial_will_end')` (released if Resend fails so Stripe's retry can recover).
- Skips a subscription created under 24h ago (see timing below: late signups get the event immediately, right after the acknowledgment email).
- Logs `product_events` `email_sent` with `email_id=base_trial_will_end`, `template_version`, `resend_id`, `stripe_event`, `testmode`.

## REAL SEND DATE (verified in Stripe docs, docs.stripe.com/billing/subscriptions/trials, "Events" table)
`customer.subscription.trial_will_end` is "sent according to the Trial ending events setting in the Dashboard, which defaults to 3 days before the trial ends. If the trial is shorter than the configured interval, it triggers immediately."
- Trial ends Jan 1, 2027 12:00 PM ET, so with the default 3 days the event fires about **Dec 29, 2026, 12:00 PM ET**.
- **That is outside the Dec 11-28 window (about one day late).** It lands inside the window only if the Dashboard "Trial ending events" setting is changed to 4 or more days (for example 14 days gives Dec 18). I cannot read or change that setting from here (Dashboard only) and could not verify what live is set to.
- Signups between Dec 29 and the Dec 30 12:00 ET checkout cutoff have a trial shorter than 3 days, so Stripe fires the event immediately; the code skips them (acknowledgment email just went out).
- Stripe's own hosted reminder ("7 days before a trial ends", Subscriptions and emails setting) would go out about Dec 25 if enabled in live mode; Stripe does not send it in sandbox. It is separate from this code.

## Recommended: cron-based sender that does land in Dec 11-28 (proposal, not built)
Because the webhook date depends on a Dashboard setting we cannot verify, do not rely on it alone.
- New edge function `send-base-prerenewal-reminder`, gated by `x-cron-secret` exactly like `send-conversion-drip` v12 (`verify_webhook_secret` RPC).
- pg_cron job (via `public.cron_call_edge`) daily at 12:00 UTC from Dec 11 to Dec 28. Each run selects users with `base_status='active'`, a `base_stripe_subscription_id`, Stripe status `trialing` with `trial_end` = Jan 1, 2027, not a test fixture, and no `email_sends` row for `base_trial_will_end`; sends the same `_shared/prerenewal_copy.ts` email (target day Dec 18, 14 days before; catch-up through Dec 28 for late signups or failures).
- Same `email_sends` claim as the webhook path, so the webhook and the cron can both exist and a customer still gets exactly one email.
- It would also need: a migration for the cron job (separate PR, applied only on Grant's go), and a way to read each subscription's trial_end (Stripe API call per user, about 15 to 30 users).
Alternative with no new code: set the Dashboard "Trial ending events" lead time to 14 days (the webhook path then lands Dec 18) and enable Stripe's 7-day hosted email in LIVE mode. Both are Dashboard-only settings and must be confirmed in live.

## Old `send-renewal-reminders-daily` (do NOT change; retire note)
- pg_cron job id 1, `send-renewal-reminders-daily`, `0 12 * * *`, active, calls edge function `send-renewal-reminders` (live v19; repo v4).
- It is the legacy coach/athlete function: hard-coded $149 and $349, brand copy for ROMRxBJJ/ROMRxBodybuilding, reads `users.subscription_status='active'` and `subscription_expiry`, windows 45, 30 and 2 days before expiry, link `/dashboard/settings` on the brand domain.
- It does not know Base ($60, free through Dec 31, charge Jan 1). Only 3 of 14 active Base users have a `subscription_expiry`, and `renewal_reminders` has 0 rows ever (verified Oct 3).
- Risk: if a Base user ever gets a `subscription_expiry` that falls 45, 30 or 2 days out, it would send wrong prices and wrong brand. Recommend (when Grant says go): `select cron.unschedule('send-renewal-reminders-daily');` (reversible by re-scheduling the same job), or add a Base skip. Not done here. The function itself can stay deployed (nothing calls it once unscheduled).

## Test plan (before any deploy)
1. `deno test --allow-env --allow-read --allow-write --import-map=supabase/functions/_tests/import_map.json supabase/functions/_tests/` (8 tests pass: decision rules, copy, preview HTML).
2. Stripe TEST mode with a fixture (`jim+romrx-...@romrx.io`) on a trialing Base subscription: `stripe trigger customer.subscription.trial_will_end` (or the Dashboard "send test webhook") against the test endpoint; expect one email to the fixture inbox, `product_events email_sent base_trial_will_end testmode=true`, response `{received:true, reminder:"sent"}`; resend the same event: `reminder:"already_claimed"`.
3. Negative checks in test mode: sport-unlock sub (`not_base`), canceled sub, brand-new sub (`created_under_24h_ack_just_sent`).
4. With `PREREMINDER_ENABLED` unset, a live-signed event must return `reminder:"disabled"` and send nothing.
5. Only then (Grant go + Stacy approval): set `PREREMINDER_COPY_APPROVED=true` in code, deploy, set `PREREMINDER_ENABLED=true`, confirm the Dashboard trial-ending lead time.

## Rollback
Set `PREREMINDER_ENABLED` to anything but `true` (stops all live sends immediately, no deploy needed) or redeploy the previous stripe-webhook (v44; source `ec20491:supabase/functions/stripe-webhook/index.ts`). No schema changes; the only side effect of a send is one `email_sends` row (delete the row to allow a resend).
