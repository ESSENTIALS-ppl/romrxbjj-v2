# ADDENDUM: P1-14 VAPID keypair (BUILD ONLY, NOT SET), 2026-11-17

Built Tue Nov 17 2026, about 6:52 AM ET (America/New_York, UTC-5). Nothing was set, deployed, invoked, or applied. The private key is not in this file, not in SUMS, not in git, and was not printed.

This addendum pins a VAPID pair for a later secrets set. It does not run that set.

## v27 source (dee41530 / live send-push-notification ezbr 96dfc872)

`index.ts` `liveSend` and the handler deps read three Edge Function secrets by these exact names:

- `VAPID_PUBLIC_KEY` — `Deno.env.get("VAPID_PUBLIC_KEY")`
- `VAPID_PRIVATE_KEY` — `Deno.env.get("VAPID_PRIVATE_KEY")`
- `VAPID_SUBJECT` — `Deno.env.get("VAPID_SUBJECT")`

They are passed to `webpush.setVapidDetails(subject, pub, priv)` from `npm:web-push@3.6.7`. `vapidReady` is true only when all three are non-empty and `vapidSubjectOk` is true: the subject must start with `mailto:` or `https:`. If `WEB_PUSH_SEND` is exactly `on` and VAPID is not ready, the function returns 503 `vapid_not_configured` and sends nothing. Dry-run does not check VAPID.

web-push requires the keys as URL-safe base64 (base64url) **without `=` padding**. Decoded, the public key is a 65-byte uncompressed P-256 point (leading `0x04`); the private key is 32 bytes. That is the format `web-push generate-vapid-keys` / `generateVAPIDKeys()` emits, and it is what this pair uses.

Subject for this pair, as specified: `mailto:hello@romrx.io` (allowed address; `vapidSubjectOk` accepts it).

## Generation and storage

Generated on this box at 6:51 AM ET with the official `web-push` `generateVAPIDKeys()` (same path as `npx web-push generate-vapid-keys --json`). No network, no real push endpoint.

- Public key (may be shown; also the value Jules needs as `VITE_VAPID_PUBLIC_KEY`):

  `BHNvIdd3jZ1KyJyyJ2hq9yhaPpbfhlddXOCGpSED6g4Z2h6pwTdmxYFwKiqYuU7_mLANRnaTeqF2JMx0HsyxnYs`

  87 characters, URL-safe base64, no padding. sha256 of the value (no newline): `8dcb59b6616252dded0b8a676ad1c26d52d72eb9dfe4571f97c7379c6105145e`

- Subject: `mailto:hello@romrx.io`. sha256 of the value (no newline): `5a8b650bd2ba80c94c16b0535da08e755de50939446ca025b1dc4060d6478707`

- Private key: not printed. sha256 of the value (no newline): `7ebfe089744bbf0cb30e6fcf88eb7736ab76099aaed14692ac2a01d3847ae854` (43 characters, URL-safe base64, no padding).

Stored only at:

`/home/box/.romrx-secrets/vapid-20261117.env`

Mode `600`, parent directory mode `700`. Not inside any git work tree, not under `/workspace`, and not in an evidence folder. File contents are the three `NAME=value` lines (public, private, subject) and a final newline. File sha256: `41e327159609c4fd62b677d77dff7115226654bd0f97696a2c1d76e1de94e568` (size 203 bytes).

## Local JWT proof (no send)

`web-push` `getVapidHeaders` signed a VAPID JWT locally (ES256, typ JWT, aud `https://vapid-test.invalid`, sub `mailto:hello@romrx.io`). `jws.verify` with the public key as a P-256 JWK returned true. A tampered token was rejected. No notification was sent; the audience is not a real push service; no endpoint was used. The values used for this test were re-read from the `600` file, so the stored file is what was proven.

## Secrets lists (names only)

Now (same 31 names as the 6:47:03 AM ET pin snapshot `pin-20261117/secret-names-now.txt`, sha256 `298c65720e77c1fa57be8c32b3d65c384e49c5f73329531bdcf97c9cbb4a9ca9`): WEB_PUSH_SEND absent, no VAPID names.

ARL_LIVE_ENABLED, EXPORT_MY_DATA, LIFECYCLE_AUDIENCE, LIFECYCLE_CANARY_USER_IDS, LIFECYCLE_EMAILS_SEND, NOTION_API_KEY, NOTION_FEEDBACK_DB_ID, PUBLIC_ORIGIN, QUICK_CHECK_ON, RENEWAL_BASE_SEND, RESEND_API_KEY, ROMBOT_CHECKIN_SEND, ROMOOD_EMAIL_MOOD, romrx_cron_secret, romrx_openai_key, ROMRxBJJ, STRIPE_SECRET_KEY, STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET, stripe_webhook_secret, SUPABASE_ANON_KEY, SUPABASE_DB_URL, SUPABASE_JWKS, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, UNSUBSCRIBE_HMAC_SECRET, WAITLIST_UNSUB_SECRET, WEBHOOK_SECRET.

Expected after a VAPID set (not done): **34 names** — the same 31 plus `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`. WEB_PUSH_SEND still absent.

Expected after the later WEB_PUSH_SEND flip: **35 names** — those 34 plus `WEB_PUSH_SEND`.

A secrets set bumps every function version number without changing ezbr, updated_at, or verify_jwt.

## Planned set command (NOT run)

Load from a temp copy of the 600 file so the private key is never on the command line, in shell history, or on screen. `--env-file` is the supported flag. Then remove the temp file. After a go only:

```
set +x
umask 077
export SUPABASE_ACCESS_TOKEN="$(< /home/box/.supabase/access-token)"
TMP=$(mktemp)
chmod 600 "$TMP"
cp /home/box/.romrx-secrets/vapid-20261117.env "$TMP"
supabase secrets set --env-file "$TMP" --project-ref cqzvqzwwevnflinxgnpp --yes
EC=$?
python3 -c 'import os,sys; p=sys.argv[1]; n=os.path.getsize(p); f=open(p,"r+b"); f.write(b"\0"*n); f.flush(); os.fsync(f.fileno()); f.close(); os.remove(p)' "$TMP"
unset SUPABASE_ACCESS_TOKEN
# stop if $EC is not 0; then list names only and confirm the three VAPID names are present
```

Do not `cat` the env file, do not `set -x`, and do not pass the values as `VAPID_PRIVATE_KEY=...` argv. `--project-ref` is accepted on CLI v3.0.0 (deprecation warning; same as prior deploys).

## Rollback (NOT run)

```
supabase secrets unset VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT --project-ref cqzvqzwwevnflinxgnpp --yes
```

That returns the names list to the current 31. It does not delete the box file at `/home/box/.romrx-secrets/vapid-20261117.env`. Keep that file until a later rotation or a go to destroy it. Unsetting VAPID while `WEB_PUSH_SEND=on` would make the sender return 503; unset the send switch first, or leave VAPID in place until after the send switch is unset.

## Order (this addendum)

1. Apply the dry cron `20261117020200` first (WEB_PUSH_SEND stays unset; VAPID is not required for dry-run).
2. Then set the three VAPID secrets with the command above (34 names).
3. Then the client: Jules, `SHOW_PUSH` on plus this public key as `VITE_VAPID_PUBLIC_KEY`, in the same tagged release as r8b at noon or a later tag. r8b as tagged today still has `SHOW_PUSH=false` and does not ship this key.
4. Then the `WEB_PUSH_SEND=on` flip (35 names), after Vera's flip precheck.

Rotating VAPID later invalidates existing subscriptions; clients have to re-subscribe. There are 0 `push_subscriptions` rows and 0 backups today (6:46:58 AM ET recount), so a first set does not break any live devices. A later rotation would.

## Not done
No `secrets set` or `unset`, no deploy, no invoke, no push, no cron apply, no Netlify publish, no client change. WEB_PUSH_SEND stays absent. The private key stays only in the 600 file named above.
