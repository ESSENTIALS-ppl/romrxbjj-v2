# P1-14 secrets required at deploy (values not listed)

This file lists names only. Presence was not checked this turn. Values must
never be printed, committed, or pasted into receipts.

## New or confirm on the `send-push-notification` function

1. `VAPID_PUBLIC_KEY` — generated off-box. Also mirrored on the web app as `VITE_VAPID_PUBLIC_KEY` (public).
2. `VAPID_PRIVATE_KEY` — generated off-box. Function only.
3. `VAPID_SUBJECT` — `mailto:hello@romrx.io` or `https://romrx.io`.
4. `WEB_PUSH_SEND` — leave unset or anything other than exact `on` for dry run. Flip to `on` only after the checklist in `VAPID-PLAN.md`.

## Already expected (reuse, do not duplicate)

5. Vault `cron_webhook_secret` — `cron_call_edge` sends it as `x-cron-secret`; the function verifies with `verify_webhook_secret(p_name => cron_webhook_secret)`. Fail-closed if the header is missing, shorter than 32 characters, or verification is not exactly true.
6. `SUPABASE_URL`
7. `SUPABASE_SERVICE_ROLE_KEY`

Deploy the function with `verify_jwt = false` (pg_cron, no user JWT), same as the other cron senders. The unapplied cron SQL does not embed a secret; it calls `public.cron_call_edge('send-push-notification', 120000)`.
