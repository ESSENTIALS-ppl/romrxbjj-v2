# RECEIPT: P1-14 VAPID secrets set, 2026-11-17

Applied Tuesday, Nov 17, 2026, 7:13:35 AM to 7:13:37 AM ET (America/New_York, UTC-5). Project `cqzvqzwwevnflinxgnpp` (romrxbjj-v2, production).

This set added exactly three Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (`mailto:hello@romrx.io`). `WEB_PUSH_SEND` was not set and remains absent. No function was deployed. No cron job was created, changed, or unscheduled. Job 1 was not touched. Account `7c71e421` was not touched.

Consent for `--yes` is Jim's first-hand 9:02 PM ET card (L1319 / t2043s6428), covering Supabase changes for the push functions in test mode. Used for this exact change only.

Plan: `ADDENDUM-P1-14-VAPID-20261117.md` (sha256 `6e5aa3f703023bc5a08d4b2e82cb23ccae30ec6cf1e349b32d396b2549fa7bc6`), SUMS `e00cb1d852e96cc0de94e244f051825575274c8c801ee9708973134439941218`. Vera precheck VERIFIED, 0 FAIL (`76b1d629`). Released under L1031/L1229 as part of P1-14 (Grant, L1438).

## Before (7:12:30 AM ET)

**Secrets: 31 names.** `WEB_PUSH_SEND` absent. No VAPID names. Same 31 names as the 6:47:03 AM ET pin (`secret-names-now.txt`, sha256 `298c65720e77c1fa57be8c32b3d65c384e49c5f73329531bdcf97c9cbb4a9ca9`).

- `ARL_LIVE_ENABLED`
- `EXPORT_MY_DATA`
- `LIFECYCLE_AUDIENCE`
- `LIFECYCLE_CANARY_USER_IDS`
- `LIFECYCLE_EMAILS_SEND`
- `NOTION_API_KEY`
- `NOTION_FEEDBACK_DB_ID`
- `PUBLIC_ORIGIN`
- `QUICK_CHECK_ON`
- `RENEWAL_BASE_SEND`
- `RESEND_API_KEY`
- `ROMBOT_CHECKIN_SEND`
- `ROMOOD_EMAIL_MOOD`
- `ROMRxBJJ`
- `STRIPE_SECRET_KEY`
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWKS`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `UNSUBSCRIBE_HMAC_SECRET`
- `WAITLIST_UNSUB_SECRET`
- `WEBHOOK_SECRET`
- `romrx_cron_secret` (CLI lists this name with a trailing space; same as the 6:47 AM ET pin)
- `romrx_openai_key`
- `stripe_webhook_secret`

Names-only file sha256: `48fe049373a3e67c205a817566bf80cebfd255edb35296fb4719bf3711168e6c`. Values were not saved.

**Functions: 41.** Identities (ezbr, updated_at, verify_jwt) recorded in `vapid-set-20261117/functions-before.json` (sha256 `dc1454c9fd999d0d20418c651efcc57e055e43d794b971b359f2516df2ff69ba`). Push functions at the 6:47 AM pin identities:

- `send-push-notification` v27, ezbr `96dfc872547612f7913e6e012cafdbe8e35b8da6753046eaa57d6ec374aa3550`, updated Mon Nov 16, 2026, 10:12:09 PM ET, verify_jwt false, ACTIVE.
- `save-push-subscription` v26, ezbr `ba6bd6493b6a2e2a3941abc72456adeaa809739b6f30083344b5da56e93a7032`, updated Mon Nov 16, 2026, 10:12:32 PM ET, verify_jwt true, ACTIVE.

**Cron: 16 jobs** (JOB 15's dry push cron already present). Inventory md5 `15767a49b1d20646fc8156ecf09cec48` (md5 of `jobid`, `jobname`, `schedule`, `active`, `md5(command)` rows, tab-separated, newline-joined, ordered by jobid). Job 1 command md5 `caab15b0a3b771bccfd127f7c3db4df2`. Job 16 is `send-push-notification-hourly`, schedule `45 * * * *`, active true, command md5 `f0f7bb3d85ba2b1dc024504955d3428f`. Jobs 1–15 match the 6:46:43 AM ET pin (names, schedules, active flags, and command md5s).

## Apply

Env file `/home/box/.romrx-secrets/vapid-20261117.env` (mode 600, 203 bytes, sha256 `41e327159609c4fd62b677d77dff7115226654bd0f97696a2c1d76e1de94e568`) was copied to a `mktemp` file under `/tmp` (mode 600). `trap 'shred -u "$TMP" 2>/dev/null || rm -f "$TMP"' EXIT INT TERM HUP` was set **before** the copy. Names in the temp file were exactly `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; the temp sha matched the box file. Values were never echoed or passed on the command line.

```
supabase secrets set --env-file "$TMP" --project-ref cqzvqzwwevnflinxgnpp --yes
```

CLI v3.0.0. `--project-ref` is accepted and printed the usual deprecation warning (use `--remote=<ref>` in v4). `--use-api` is not a flag on `secrets set` and was omitted. Exit 0 at 7:13:37 AM ET. CLI: "Confirmed by --yes: Set 3 secrets". JSON result: `count` 3, project `cqzvqzwwevnflinxgnpp`. The temp file was overwritten with zeros, removed, and confirmed gone.

## After (7:14:07 AM ET)

**Secrets: 34 names.** The same 31 plus `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`. `WEB_PUSH_SEND` still absent. No other name added or removed.

- `ARL_LIVE_ENABLED`
- `EXPORT_MY_DATA`
- `LIFECYCLE_AUDIENCE`
- `LIFECYCLE_CANARY_USER_IDS`
- `LIFECYCLE_EMAILS_SEND`
- `NOTION_API_KEY`
- `NOTION_FEEDBACK_DB_ID`
- `PUBLIC_ORIGIN`
- `QUICK_CHECK_ON`
- `RENEWAL_BASE_SEND`
- `RESEND_API_KEY`
- `ROMBOT_CHECKIN_SEND`
- `ROMOOD_EMAIL_MOOD`
- `ROMRxBJJ`
- `STRIPE_SECRET_KEY`
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWKS`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `UNSUBSCRIBE_HMAC_SECRET`
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT`
- `WAITLIST_UNSUB_SECRET`
- `WEBHOOK_SECRET`
- `romrx_cron_secret` (CLI lists this name with a trailing space; same as the 6:47 AM ET pin)
- `romrx_openai_key`
- `stripe_webhook_secret`

Names-only file sha256: `0a24b1a8830d4a7fda5713e8f9e15fa80d486fe24fa956fd3bc3b51f8775cc93`.

**Public key is `8dcb59b6`.** `supabase secrets list --remote=cqzvqzwwevnflinxgnpp --output-format json` returns a sha256 digest in the `value` field, not the raw secret. The digest for `VAPID_PUBLIC_KEY` was the full 64-hex sha256 `8dcb59b6616252dded0b8a676ad1c26d52d72eb9dfe4571f97c7379c6105145e`, which is the sha256 of the public key value (87 characters, URL-safe base64, no padding, no newline) and of `VAPID-PUBLIC-KEY-20261117.txt`. The private key was not printed. The subject digest matched sha256 of `mailto:hello@romrx.io` (`5a8b650bd2ba80c94c16b0535da08e755de50939446ca025b1dc4060d6478707`). Raw secrets list output was wiped after the comparison.

**Functions: 41, identities unchanged.** Every function kept the same `ezbr_sha256`, `updated_at`, and `verify_jwt`. Every version number bumped by 1, as expected for a secrets set. Added [], removed [].

| name | before v | after v | ezbr_sha256 | updated_at (unchanged) | verify_jwt |
|---|---|---|---|---|---|
| activate-beta-base | 17 | 18 | `c1bbafc2f3809135b9b8b5bd1982a6e4ed25384bbc026187cea76ce31025d18b` | 2026-09-22 04:00:46 PM ET | true |
| ai-chat | 100 | 101 | `2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7` | 2026-11-15 08:14:37 PM ET | true |
| ai-chat-claims-test | 15 | 16 | `0b9a93a97a0a147b2d04fd8a7120fdd71a319f77d4572d594d18f832793a3087` | 2026-10-12 07:41:58 PM ET | true |
| calendar-ics | 3 | 4 | `9500e1e16c7b13952c511c3e443e54a5248784e691ca76de74a2907a9efa906b` | 2026-11-16 09:09:39 PM ET | true |
| coach-actions | 31 | 32 | `831bb410b7016a009da34f0dd1a8c595d88538fc24c2f6c0e1c177632f771889` | 2026-06-04 12:36:12 PM ET | true |
| compute-tiers | 58 | 59 | `f4c62a384310b5db2966b566ad1085c61733aa4653853cb34b50c7f17e33170b` | 2026-11-16 09:42:59 AM ET | false |
| compute-tiers-base | 15 | 16 | `b14f678b14b24f8184c8066588c4d92836bc05105fd5dd4b40f3f8a35d6258f5` | 2026-11-03 06:27:28 PM ET | false |
| create-checkout-session | 49 | 50 | `2b7dd0ce33acb5300763a9898afca6d67b3f02709b265dd3d951df459551239c` | 2026-10-06 01:12:33 PM ET | true |
| create-portal-session | 27 | 28 | `67ab693a0618313e9b2d2db28dfd564848563003a81af9ae74aeaf8f42895aee` | 2026-10-28 02:50:09 PM ET | true |
| embed-general-once | 14 | 15 | `8be466ff82163eb12fd8153b8dd7e8eb67cbaab98d8ab4a8c527325672c1d043` | 2026-09-21 07:01:50 PM ET | false |
| embed-knowledge | 27 | 28 | `fa413811e18962e390a2afa580a0419de3a2a3a374e32389b227b37daaa757ad` | 2026-11-03 06:27:23 PM ET | false |
| export-my-data | 7 | 8 | `45dd9300cc48c01ae31d9e76685fbff27de8b96125e57312d97efe08d38030f7` | 2026-11-16 08:07:09 PM ET | true |
| feedback-to-notion | 28 | 29 | `6bc351ca50e8a8ffa82946437218476286ba59af0ae609d6af127b1b5d4358b1` | 2026-09-28 11:34:21 PM ET | false |
| get-coach-roster | 25 | 26 | `8945b54bae7456ca5e441f6d46dadbc4c8a19ee92735506fc38df176a8d7bad4` | 2026-05-31 04:10:47 PM ET | true |
| join-waitlist | 7 | 8 | `1fc0dccc8e95e602f3133febe57d7b351406764d3eaf2b7cd2d5e1a86a3a48b4` | 2026-10-29 03:28:17 PM ET | false |
| lifecycle-emails | 10 | 11 | `77358262e0931059e3598c93be2e735158b6b29bc282fedab83571e076f808c8` | 2026-11-16 09:47:01 PM ET | false |
| notify-coach-signup | 27 | 28 | `daffdfbabba556e0dd5dcf418f4e3916614d342716522c87f4432200af7d0304` | 2026-10-01 04:23:33 PM ET | false |
| notify-inbound-lead | 14 | 15 | `688f7a4c3eda26596bb64ca208bc5157e593f9a9b60e584f16e18e4550fdeb53` | 2026-09-29 12:05:51 AM ET | false |
| request-account-deletion | 15 | 16 | `d662e9b8c50da51f4d7b9793d7589dabc08aa883ce61ab8cc6a0cc3e0989a4fc` | 2026-11-15 09:22:01 PM ET | true |
| rombot-checkin | 5 | 6 | `fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19` | 2026-11-16 07:35:14 PM ET | false |
| rombot-conversations | 6 | 7 | `986e2f585e1f9df2292bbe94706c894c001e208d56af2dc3a1d930d1d775f373` | 2026-11-02 09:35:15 PM ET | true |
| save-push-subscription | 26 | 27 | `ba6bd6493b6a2e2a3941abc72456adeaa809739b6f30083344b5da56e93a7032` | 2026-11-16 10:12:32 PM ET | true |
| send-bb-s1-2-followup-email | 24 | 25 | `e9e5475d70d730dd18d45baa829a950dcad7c3ac41b79d51be615fb181b8d3f7` | 2026-10-04 08:13:51 AM ET | false |
| send-bb-s1-3-followup-email | 24 | 25 | `d84da24acc90669c5643f739094eb4b488d9546463db7973c1ff44586869443c` | 2026-10-04 08:14:22 AM ET | false |
| send-bb-s1-4-stilhere-email | 24 | 25 | `67191eb37ab2971063efbe118451c5f3346648f1fec6d00bf17e808a87a9b2e0` | 2026-10-04 08:14:55 AM ET | false |
| send-conversion-drip | 25 | 26 | `bb615a0e2a4a114757e6486102451c3fdad04e2efb826fedecfead19cc1233e2` | 2026-10-04 08:10:46 AM ET | false |
| send-protocol-reminder | 25 | 26 | `0e35974d9243e138cb8c65f31af303beb97ab4990d5729ddf0c8077cd0567ddd` | 2026-10-01 04:23:27 PM ET | false |
| send-push-notification | 27 | 28 | `96dfc872547612f7913e6e012cafdbe8e35b8da6753046eaa57d6ec374aa3550` | 2026-11-16 10:12:09 PM ET | false |
| send-renewal-reminders | 31 | 32 | `3bcc783c19962ebd2ce0e0e207b37f089a79fca8e729015706010b08c50acf22` | 2026-11-16 09:51:33 AM ET | false |
| send-s1-2-followup-email | 27 | 28 | `70ec7706585689d1d6a1915df83b2982dc83d6220feec5d924d2cbf7eed550c0` | 2026-10-04 08:12:02 AM ET | false |
| send-s1-3-masters-email | 27 | 28 | `8cc03fd50078a84dff9ed816d3fb7f4ff66fdf47472e0d91f7974ab0ddcf4433` | 2026-10-04 08:12:39 AM ET | false |
| send-s1-4-stilhere-email | 27 | 28 | `00490da68499bff91910db568df3a722e3eabab569ebe1c856b20b0c4008f4ff` | 2026-10-04 08:13:10 AM ET | false |
| send-s1-welcome-email | 39 | 40 | `99f5d36bcefd3ffb08b99c5570a757077bc0ac7fd6a66af8319ec38706c80d85` | 2026-10-06 01:01:47 PM ET | false |
| send-whats-new | 11 | 12 | `fc831df4880f90ba4fb62a922fb77b908f20e2df1482e8d8b93bdaf6d25a002d` | 2026-10-18 06:18:27 PM ET | false |
| serve-base-icon | 17 | 18 | `6d3d9acc54a85c70ab7dd44b3d29d8cb4744181fddf2024341c5dfe12323e2d6` | 2026-09-08 05:55:01 PM ET | false |
| stripe-webhook | 58 | 59 | `3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0` | 2026-11-15 10:03:22 PM ET | false |
| submit-assessment | 49 | 50 | `edb16eb4a277349df487359f8e087f3f99ecf0c3ebaedadf2b738bc5014d1296` | 2026-11-16 09:42:39 AM ET | true |
| submit-consent | 28 | 29 | `e760e6763d19463d8c5d0c3f075d0e3682eded8ae1f3f4ba8ebb2350f9fc14d1` | 2026-05-04 10:50:43 AM ET | true |
| submit-feedback | 25 | 26 | `d6c1e021cabb96536a1e4d3ef1e64078965ec362a5a881f5802f68e4acbb944d` | 2026-07-05 08:31:05 PM ET | false |
| submit-lead-assessment | 35 | 36 | `48c6f464cbff37e67c3e0a60fb450b2e6a949fb9ab59475da5190e2df5a1dddf` | 2026-10-26 05:52:22 PM ET | false |
| unsubscribe | 18 | 19 | `879abbfacde0fc1e812713205c4ed38aaa3c6f606d1cf37a3704e85293ff8622` | 2026-11-16 07:28:00 PM ET | false |

Push functions after: `send-push-notification` v28, ezbr `96dfc872…`, verify_jwt false; `save-push-subscription` v27, ezbr `ba6bd649…`, verify_jwt true.

**Cron unchanged.** 16 jobs, inventory md5 `15767a49b1d20646fc8156ecf09cec48`, job 1 command md5 `caab15b0a3b771bccfd127f7c3db4df2`, job 16 still `f0f7bb3d85ba2b1dc024504955d3428f`. Recount at 7:14 AM ET.

## Rollback (not run)

```
supabase secrets unset VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT --project-ref cqzvqzwwevnflinxgnpp --yes
```

That returns the names list to the 31 names recorded before this set. It does not delete `/home/box/.romrx-secrets/vapid-20261117.env`. Do not unset VAPID while `WEB_PUSH_SEND=on` (that combination would make the sender return 503). `WEB_PUSH_SEND` is absent today, so a VAPID unset would not flip a live send switch.

## Evidence

Branch `evidence/receipts-rebuilt-20261115`. Temp worktree, fetched with `+refs/heads/evidence/receipts-rebuilt-20261115:refs/remotes/origin/evidence/receipts-rebuilt-20261115`.

Addendum and public-key-only file (never the private key, never the combined env file) are in commit `46a8c78d012e8fca59b8e7bf8ca731dba6cee63e` (`46a8c78`), pushed 7:16 AM ET, verified with `ls-remote` (tip `46a8c78d012e8fca59b8e7bf8ca731dba6cee63e`). Public key file `VAPID-PUBLIC-KEY-20261117.txt` is 87 bytes, no newline, sha256 `8dcb59b6616252dded0b8a676ad1c26d52d72eb9dfe4571f97c7379c6105145e`.

This receipt and its SUMS are added in a follow-up evidence commit on the same branch.

## Not done

No `WEB_PUSH_SEND` set or unset. No function deploy or invoke. No push sent. No cron change. No Netlify publish. No client change. The private key remains only in the mode-600 box file named above.
