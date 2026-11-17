# RECEIPT: P1-14 send-push-notification (BUILD ONLY)

Monday Nov 16, 2026, 8:25 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied, deployed, flipped, or scheduled. No VAPID keys generated or printed. No secrets or user emails printed. `/workspace/SHA256SUMS` was not touched.

## Branch / commit
- Repo: `ESSENTIALS-ppl/romrxbjj-v2`
- Branch: `feat/p1-14-send-push-notification-20261116`
- Commit: `0c283d8dac37b6b3a42012911ce71ffceaa5380d` (parent `47aad4358c73f333e34f25e53002fcef432a78a1`, live P1-07 v4)
- Patch sha256: `c50b7a3eb516ec3632977a3c50a81c962a733e1af41bda627cb015d187657893`
- `git patch-id --stable`: `7a7fc2208d22c5eb1244ece164813c51f63c4ab4`
- Cron SQL sha256 (`20261117020200_p1_14_send_push_notification_cron.sql`): `4cc2618f4f20386820a4d62014f4e6872191f4fcf836bf857fe560a560d14c5d`
- Rollback sha256: `332d01a12d9f1720bdde41adb9cd6a802d4302487c51f45628907789e7613f8d`
- `git ls-remote origin refs/heads/feat/p1-14-send-push-notification-20261116` = `0c283d8dac37b6b3a42012911ce71ffceaa5380d`

## Tests
`deno check --no-lock --node-modules-dir=none` clean on `handler.ts` and `index.ts`. `deno test --no-lock --node-modules-dir=none handler.test.ts`: **15/15 ALL PASS** (cron fail-closed, exact-`on` send flag, dry-run does not claim or send, missing VAPID is 503, claim dedupe, 410 gone, response has no endpoints or addresses).

## Secrets (names only, values not present and not printed)
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:hello@romrx.io` or `https://romrx.io`), `WEB_PUSH_SEND` (exact `on` to send). Reuse existing Vault `cron_webhook_secret` plus runtime `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. See `function/VAPID-PLAN.md` and `function/SECRETS.md`.

## Service worker
This pack does not add a service worker or a Netlify redirect. P1-14 uses Jules's `/app/sw.js` rule ahead of the `/app/*` SPA rewrite, with `Cache-Control: no-cache` (combined client r3, ~8:50 PM ET, 16 Nov 2026).

## Open questions
1. Needs its own gate line and Vera precheck. Not deployed, not scheduled, `WEB_PUSH_SEND` not flipped.
2. Lock-screen `PUSH_COPY` in `handler.ts` is a placeholder and needs Jim / Stacy wording before any send flip.
3. Live `save-push-subscription` still writes only `notification_preferences.push_subscription`. The sender falls back to that jsonb and prefers `public.push_subscriptions` when present. Updating save-push to also upsert the FG-12 table is out of this pack.
4. Client `SHOW_PUSH` remains false until a later gate. No subscribe-UI change here.
5. Deploy with `verify_jwt = false`. Unapplied cron is `20261117020200` only; never apply a34aa573; never touch job 1 `send-renewal-reminders-daily`.

## Not done
Not deployed. Not scheduled. No VAPID generation. No `WEB_PUSH_SEND` flip. No Netlify or service-worker change.
