# P1-14 VAPID key plan (no keys in this file)

This branch does not generate, store, or print VAPID key material. Do not paste
public or private keys into git, tickets, chat, receipts, or build notes.

## Generate off-box

On a trusted machine that is not this repo (for example Sable or a logged-in
operator laptop), generate a new pair with the official `web-push` tool:

```
npx web-push generate-vapid-keys
```

Record the pair in the operator's secret store only. Never commit the output.
Never echo the values into a shell history that lands in a ticket or this tree.

## Where each value lives

- `VAPID_PRIVATE_KEY` — Supabase Edge Function secrets for `send-push-notification` only. Never in the web app, Netlify env, git, or client bundles.
- `VAPID_PUBLIC_KEY` — the same function secret, plus a public copy as `VITE_VAPID_PUBLIC_KEY` on the web app (already read by `app/src/lib/pushSubscribe.ts`). The public key is not a secret, but do not casually paste it into tickets.
- `VAPID_SUBJECT` — function secret. Must be a `mailto:` or `https:` URI. Preferred values: `mailto:hello@romrx.io` or `https://romrx.io` (allowed addresses only). The function refuses to send if the subject is missing or not one of those schemes.
- `WEB_PUSH_SEND` — function secret. Sends only when the value is exactly `on`. Any other value, including `ON`, `true`, or unset, is a dry run (count due, do not claim, do not call web-push).
- Existing Vault secret `cron_webhook_secret` — already used by `public.cron_call_edge` / `verify_webhook_secret`. Reuse it. Do not mint a second cron secret for this function.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — already present on the Edge runtime. Not added by this pack.

Do not set `WEB_PUSH_SEND=on` until (a) VAPID secrets are in place, (b) Jim / Stacy have cleared lock-screen wording (`PUSH_COPY` in `handler.ts` is a placeholder), (c) the function is deployed with `verify_jwt = false`, and (d) a dry-run cron pass has been reviewed.

## Rotation

Generate a new pair off-box, update the three VAPID function secrets and `VITE_VAPID_PUBLIC_KEY`, then ask opted-in clients to re-subscribe (old endpoint keys will fail until they do). Retire the old private key from the function secrets after re-subscribe completes. Do not commit either generation.

## Service worker path

This pack does not add a service worker and does not add a Netlify redirect.
romrx.io currently rewrites `/app/*` to the SPA document, which would serve
`/app/sw.js` as HTML. Jules is adding a `/app/sw.js` rule ahead of that rewrite,
with `Cache-Control: no-cache`, in his combined client r3 (~8:50 PM ET, 16 Nov 2026).
P1-14 uses that same `/app/sw.js` path and rule. Do not add a competing worker
path or a second redirect rule.
