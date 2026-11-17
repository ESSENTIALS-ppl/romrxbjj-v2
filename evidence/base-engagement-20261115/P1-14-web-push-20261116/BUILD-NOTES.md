# P1-14 send-push-notification — BUILD NOTES (16 Nov 2026, America/New_York)

BUILD ONLY. Not deployed, not applied, not scheduled, WEB_PUSH_SEND not flipped.
Server worktree `/workspace/p1-14-web-push-20261116`. Branch off `47aad435`
(live P1-07 v4 tip). Nothing in this pack is a live secret.

## Jules `/app/sw.js` rule (do not fork)

romrx.io currently rewrites `/app/*` to `/app/dist/index.html` (`force=true`),
which would serve `/app/sw.js` as HTML. Jules is adding a `/app/sw.js` rule
ahead of that rewrite, with `Cache-Control: no-cache`, in his combined client
r3 (~8:50 PM ET, 16 Nov 2026). P1-14 uses that same `/app/sw.js` path and rule.
This pack does not add a service worker file and does not add a second redirect.

## Design

- Replaces the 2026-10-01 410 stub. The pre-audit body was not recoverable from
  `bdf72a3^` (0 lines). This is a new sender, not a resurrection of the unsafe
  unauthenticated function.
- Fail-closed `x-cron-secret`: header must be present and length >= 32, then
  `verify_webhook_secret(p_name => cron_webhook_secret)` must return exactly
  true. Same pattern as `send-conversion-drip` / `cron_call_edge`.
- `WEB_PUSH_SEND` must be exactly `on` to send. Any other value is a dry run:
  count `due`, do not `claim`, do not call web-push.
- Live send also refuses (503 `vapid_not_configured`) if VAPID public/private
  keys are missing or `VAPID_SUBJECT` is not `mailto:` / `https:`.
- Due set: `notification_preferences.push_reminders = true` with a live
  `public.push_subscriptions` row (`disabled_at` is null), falling back to
  `notification_preferences.push_subscription` jsonb (what live
  `save-push-subscription` still writes). Protocol is due when
  `reminder_time` hour matches the user's timezone hour (`America/New_York`
  fallback, same as P1-07 v4). Retest is due when
  `user_mobility_schedule.next_retest_at` is the user's local date.
- Dedupe via `public.push_sends` insert on `(user_id, dedupe_key)` with keys
  `protocol:YYYY-MM-DD` and `retest:YYYY-MM-DD`. 404/410 responses disable the
  `push_subscriptions` row.
- Responses are counts only. No user ids, emails, endpoints, or keys.
- `PUSH_COPY` lock-screen strings are placeholders and need Jim / Stacy wording.
- Cron (unapplied): `send-push-notification-hourly` at `45 * * * *` via
  `public.cron_call_edge('send-push-notification', 120000)`. Existing 13 jobs
  already use :00, :15, :17, :20, :30. Does not touch job 1
  (`send-renewal-reminders-daily`) or any other job. Rollback unschedules only
  this job name.
- Deploy later with `verify_jwt = false`. VAPID values are generated off-box
  (see `VAPID-PLAN.md` / `SECRETS.md`). No keys were generated or printed here.

## Tests

```
deno check --no-lock --node-modules-dir=none handler.ts index.ts
deno test  --no-lock --node-modules-dir=none handler.test.ts
```

15/15 passed (cron gate, exact-`on` send flag, dry-run does not claim or send,
missing VAPID is 503, claim dedupe, 410 gone, response has no endpoints or
addresses). `deno check` resolved `npm:web-push@3.6.7` for the production
`index.ts` import only; tests inject a fake `send` and never call it.

## Every hunk in the server commit

1. `supabase/functions/send-push-notification/index.ts` — one hunk, 9 lines
   deleted (410 stub + CORS) / 181 lines added. Wires `cronCallerOk`,
   `listDue`, `claim`, `liveSend` (`npm:web-push@3.6.7`), success/failure
   marks. No secrets in source.

2. `supabase/functions/send-push-notification/handler.ts` — new file, one
   hunk, 118 lines. `handle`, `sendEnabled`, `vapidReady`, `PUSH_COPY`,
   count-only JSON.

3. `supabase/functions/send-push-notification/handler.test.ts` — new file,
   one hunk, 223 lines. 15 Deno tests. Fixture endpoint is
   `https://example.com/push/device-1`. One test uses the identifier
   `user@example.com` only to assert it is **not** echoed. Allowed
   `mailto:hello@romrx.io` appears as a valid subject example, never as a
   recipient list.

4. `supabase/functions/send-push-notification/VAPID-PLAN.md` — new file, one
   hunk, 40 lines. Off-box generation, where each name lives, rotation, and
   the Jules `/app/sw.js` rule. No key values.

5. `supabase/functions/send-push-notification/SECRETS.md` — new file, one
   hunk, 19 lines. Names only: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT`, `WEB_PUSH_SEND`, plus reuse of `cron_webhook_secret`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

6. `supabase/migrations-unapplied/20261117020200_p1_14_send_push_notification_cron.sql`
   — new file, one hunk, 12 lines. `cron.schedule` at :45. Not in
   `supabase/migrations`. Live head at the time of the earlier P1-27 check
   was `20261117010702`; P1-29 used `20261117020100`; this stamp is later
   and unapplied.

7. `supabase/migrations-unapplied/20261117020200_p1_14_send_push_notification_cron.ROLLBACK.sql`
   — new file, one hunk, 4 lines. `cron.unschedule('send-push-notification-hourly')`
   only.

No Netlify, client, or service-worker hunks.

## Not in this pack

- No VAPID key generation and no values printed.
- No `WEB_PUSH_SEND` flip.
- No change to `save-push-subscription` (still writes the jsonb column only;
  the sender falls back to it).
- No client subscribe UI change (`SHOW_PUSH` remains false until a later gate).
- No cron apply / schedule.
