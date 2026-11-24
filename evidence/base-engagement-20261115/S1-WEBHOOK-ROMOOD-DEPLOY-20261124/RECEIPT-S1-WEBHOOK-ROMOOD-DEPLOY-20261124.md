# Receipt: S1 rev3, webhook ack/trial-end, and ROMOOD deployed, 2026-11-24

Owner: Avery (Foundation Eng). Project `cqzvqzwwevnflinxgnpp`. All times ET (America/New_York, EST). MCP `deploy_edge_function` by name only. Accounts 7c71e421 and 076ce453 were not touched. No function was invoked. No Stripe sessions were created. No messages were sent. Cron jobs 1 and 14 were not touched. D7 was not part of this release.

Authority: Sable released via Grant at 3:54 PM ET Nov 24. Covered by Jim L1487/L1489 for (a) and (b), and Jim's 3:36 PM ET "I SAID ADD IT" for ROMOOD, including the flag. The flag flip itself was later blocked (step 6).

## 0. Gate and BEFORE (all passed)

- (a) deploy-set-S1-ARL-MAR1-rev3/SHA256SUMS: `sha256sum -c` OK. File hashes to **da26405287121f7b744fad4522aedec0a1b6f8294a88c07ed2e5c080b615a0f8**.
- (b) deploy-set-WEBHOOK-ACK-TRIALEND-MAR1/SHA256SUMS: `sha256sum -c` OK. File hashes to **56303a3f2610e99cc5fa1e55887a41bc079f66915b658df4c8e120c2007904f1**.
- deploy-set-ROMOOD-20261124/SHA256SUMS: `sha256sum -c` OK. File hashes to **b863d0cd9769b19d6cba5dec35c18435753855e6b0109d846ecf226f572ab876**.
- Fresh BEFORE list at **2026-11-24 3:55:34 PM ET (EST)**: **42 functions**, byte-identical to the fast-track AFTER list.

| function | before ver | before ezbr | verify_jwt | before updated_at ET |
|---|---:|---|:---:|---|
| create-checkout-session | 53 | `cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b` | true | 2026-11-24 3:40:03 PM ET (EST) |
| stripe-webhook | 59 | `3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0` | false | 2026-11-15 10:03:22 PM ET (EST) |
| ai-chat | 101 | `2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7` | true | 2026-11-15 8:14:37 PM ET (EST) |

### BEFORE table (42 functions)

| name | ver | verify_jwt | ezbr (sha8) | updated_at ET |
|---|---:|:---:|---|---|
| activate-beta-base | 18 | true | `c1bbafc2` | 2026-09-22 04:00:46 PM EDT |
| ai-chat | 101 | true | `2db1a2de` | 2026-11-15 08:14:37 PM EST |
| ai-chat-claims-test | 16 | true | `0b9a93a9` | 2026-10-12 07:41:58 PM EDT |
| calendar-ics | 4 | true | `9500e1e1` | 2026-11-16 09:09:39 PM EST |
| coach-actions | 32 | true | `831bb410` | 2026-06-04 12:36:12 PM EDT |
| compute-tiers | 59 | false | `f4c62a38` | 2026-11-16 09:42:59 AM EST |
| compute-tiers-base | 16 | false | `b14f678b` | 2026-11-03 06:27:28 PM EST |
| create-checkout-session | 53 | true | `cebd7638` | 2026-11-24 03:40:03 PM EST |
| create-portal-session | 28 | true | `67ab693a` | 2026-10-28 02:50:09 PM EDT |
| embed-general-once | 15 | false | `8be466ff` | 2026-09-21 07:01:50 PM EDT |
| embed-knowledge | 28 | false | `fa413811` | 2026-11-03 06:27:23 PM EST |
| export-my-data | 8 | true | `45dd9300` | 2026-11-16 08:07:09 PM EST |
| feedback-to-notion | 29 | false | `6bc351ca` | 2026-09-28 11:34:21 PM EDT |
| get-coach-roster | 26 | true | `8945b54b` | 2026-05-31 04:10:47 PM EDT |
| join-waitlist | 8 | false | `1fc0dccc` | 2026-10-29 03:28:17 PM EDT |
| lifecycle-emails | 11 | false | `77358262` | 2026-11-16 09:47:01 PM EST |
| notify-coach-signup | 28 | false | `daffdfba` | 2026-10-01 04:23:33 PM EDT |
| notify-inbound-lead | 15 | false | `688f7a4c` | 2026-09-29 12:05:51 AM EDT |
| p1-25-storage-drain | 1 | false | `208fad08` | 2026-11-24 03:15:13 PM EST |
| request-account-deletion | 16 | true | `d662e9b8` | 2026-11-15 09:22:01 PM EST |
| rombot-checkin | 6 | false | `fbad0021` | 2026-11-16 07:35:14 PM EST |
| rombot-conversations | 7 | true | `986e2f58` | 2026-11-02 09:35:15 PM EST |
| save-push-subscription | 27 | true | `ba6bd649` | 2026-11-16 10:12:32 PM EST |
| send-bb-s1-2-followup-email | 25 | false | `e9e5475d` | 2026-10-04 08:13:51 AM EDT |
| send-bb-s1-3-followup-email | 25 | false | `d84da24a` | 2026-10-04 08:14:22 AM EDT |
| send-bb-s1-4-stilhere-email | 25 | false | `67191eb3` | 2026-10-04 08:14:55 AM EDT |
| send-conversion-drip | 26 | false | `bb615a0e` | 2026-10-04 08:10:46 AM EDT |
| send-protocol-reminder | 26 | false | `0e35974d` | 2026-10-01 04:23:27 PM EDT |
| send-push-notification | 28 | false | `96dfc872` | 2026-11-16 10:12:09 PM EST |
| send-renewal-reminders | 32 | false | `3bcc783c` | 2026-11-16 09:51:33 AM EST |
| send-s1-2-followup-email | 28 | false | `70ec7706` | 2026-10-04 08:12:02 AM EDT |
| send-s1-3-masters-email | 28 | false | `8cc03fd5` | 2026-10-04 08:12:39 AM EDT |
| send-s1-4-stilhere-email | 28 | false | `00490da6` | 2026-10-04 08:13:10 AM EDT |
| send-s1-welcome-email | 40 | false | `99f5d36b` | 2026-10-06 01:01:47 PM EDT |
| send-whats-new | 12 | false | `fc831df4` | 2026-10-18 06:18:27 PM EDT |
| serve-base-icon | 18 | false | `6d3d9acc` | 2026-09-08 05:55:01 PM EDT |
| stripe-webhook | 59 | false | `3c60342d` | 2026-11-15 10:03:22 PM EST |
| submit-assessment | 50 | true | `edb16eb4` | 2026-11-16 09:42:39 AM EST |
| submit-consent | 29 | true | `e760e676` | 2026-05-04 10:50:43 AM EDT |
| submit-feedback | 26 | false | `d6c1e021` | 2026-07-05 08:31:05 PM EDT |
| submit-lead-assessment | 36 | false | `48c6f464` | 2026-10-26 05:52:22 PM EDT |
| unsubscribe | 19 | false | `879abbfa` | 2026-11-16 07:28:00 PM EST |

## 1. (a) create-checkout-session S1 rev3

Deployed **2026-11-24 3:56:21 PM ET (EST)** (updated_at 2026-11-24T20:56:21.142Z). entrypoint_path source/index.ts, verify_jwt **true**. Once; the successful call was not retried.

**after: v54**, ezbr **299759926463ae3139fa730556c285fd63b0bc2680b04cd0094603d1ce856328**, verify_jwt **true**.

Live file hashes all MATCH the pinned rev3 set: index `0fd0a4a9`, arl_copy `cd9b2617`, packs_gate `328ea953`, events `49f18652`, rate_limit `f3a82f1d`.

## 2. (b) stripe-webhook ack + trial_end

Deployed **2026-11-24 3:56:58 PM ET (EST)** (updated_at 2026-11-24T20:56:58.064Z). entrypoint_path source/index.ts, verify_jwt **false**. Once.

**after: v60**, ezbr **12b2e1c438359be2cd81b6cbd3cf5cc5df6d7ee9f27b92dc5bd135850611a7e0**, verify_jwt **false**.

Live file hashes MATCH: index `9d7fb502`, arl_copy `cd9b2617`, events `49f18652`. `_shared/email_footer.ts` (`0f9d1019`, same as v59) was included in the upload; get_edge_function returned 3 files and not email_footer, because arl_copy `cd9b2617` inlines the postal line and does not import it (v59 arl_copy `6b550c27` did).

## 3. AFTER (a) and (b)

list_edge_functions at 3:57:08 PM ET: **42 functions; only create-checkout-session and stripe-webhook changed.** The other 40, including ai-chat v101, were unchanged in version, ezbr, updated_at, and verify_jwt.

## 4. ROMOOD ai-chat

Deployed **2026-11-24 3:58:47 PM ET (EST)** (updated_at 2026-11-24T20:58:47.376Z). entrypoint_path source/index.ts, verify_jwt **true**. Files exactly as DEPLOY-CALL.txt. Once.

**after: v102**, ezbr **b714e06099a9a7961d19d2a09cd298d9b436a4bf1bb2c53fe7320bdf3571b220**, verify_jwt **true**.

Live file hashes all MATCH: handler.js `cccca3fa`, romood_chat.js `3f6edd25`, romood_tips.js `15021f44`, index `728ea3cc`, rate_limit `f3a82f1d`.

list_edge_functions after this step: **only ai-chat changed** vs the step-3 list. Checkout stayed v54 / `29975992` / true; webhook stayed v60 / `12b2e1c4` / false.

A names-only `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` was attempted at 3:58:08 PM ET, before this deploy, and failed with HTTP 401 Invalid access token. No workaround was used. ROMBOT_MOOD could not be confirmed unset. The flag was not set by this release (step 6 blocked), so ai-chat should keep the flag-off path unless the secret was already present.

## 5. Migration

MCP `apply_migration` only (no db push), name `romood_insert_accepts_v2_or_v3_consent`, SQL verbatim from the staged file.

**Applied version id: 20261124210022** (2026-11-24 4:00:22 PM ET (EST)).

Policy before: restrictive `mood_entries_insert_requires_v2_consent` (v2 only). Policy after: that policy is gone; restrictive `mood_entries_insert_requires_v2_or_v3_consent` is present and accepts `v2-email-20261026` or `v3-rombot-20261028` with `opted_in_at` not null. Permissive insert-own was unchanged.

Counts before and after (no user identifiers): mood_settings 2, v3 consent 0, v2 consent 2, mood_entries 4. Unchanged.

Repo file renamed (bytes unchanged) on `feat/rombot-romood-on-live-20261124` and pushed: `20261124210022_romood_insert_accepts_v2_or_v3_consent.sql` (commit `f0aaa1037470a3212fb00f2a1aa717dbc31b93ad`). The pinned deploy-set copy was left at its original staged name so SHA256SUMS still passes.

The L1487 amendment SQL (`ec40c332`, staged name `1-migration-20261124210000_billing_consent_amendments.sql`) is on this evidence branch inside the pinned L1487-SUB-MOVE set (SUMS `e8d56ee7`). It is not in `supabase/migrations`. It was renamed here to `1-migration-20261124205135_billing_consent_amendments.sql` (applied id 20261124205135). File bytes were not changed. The historical pin SUMS still lists the staged filename.

## 6. ROMBOT_MOOD=on — BLOCKED, not applied

`supabase secrets list` (names only) and therefore `supabase secrets set ROMBOT_MOOD=on --project-ref cqzvqzwwevnflinxgnpp --yes` were not run to completion. The CLI is not logged in or the token has expired: `unexpected list secrets status 401: Invalid access token`. No workaround was used. No function was re-deployed for a flag flip. After the ROMOOD deploy and the migration, the 42-function list was unchanged (same versions, ezbrs, updated_at, verify_jwt).

## 7. Post-checks (read-only)

- v3 consent row count is still **0** (unchanged).
- No messages were sent.
- No Stripe sessions, no customer invokes, no cron changes.

## AFTER table (42 functions, final)

| name | ver | verify_jwt | ezbr (sha8) | updated_at ET |
|---|---:|:---:|---|---|
| activate-beta-base | 18 | true | `c1bbafc2` | 2026-09-22 04:00:46 PM EDT |
| ai-chat **CHANGED** | 102 | true | `b714e060` | 2026-11-24 03:58:47 PM EST |
| ai-chat-claims-test | 16 | true | `0b9a93a9` | 2026-10-12 07:41:58 PM EDT |
| calendar-ics | 4 | true | `9500e1e1` | 2026-11-16 09:09:39 PM EST |
| coach-actions | 32 | true | `831bb410` | 2026-06-04 12:36:12 PM EDT |
| compute-tiers | 59 | false | `f4c62a38` | 2026-11-16 09:42:59 AM EST |
| compute-tiers-base | 16 | false | `b14f678b` | 2026-11-03 06:27:28 PM EST |
| create-checkout-session **CHANGED** | 54 | true | `29975992` | 2026-11-24 03:56:21 PM EST |
| create-portal-session | 28 | true | `67ab693a` | 2026-10-28 02:50:09 PM EDT |
| embed-general-once | 15 | false | `8be466ff` | 2026-09-21 07:01:50 PM EDT |
| embed-knowledge | 28 | false | `fa413811` | 2026-11-03 06:27:23 PM EST |
| export-my-data | 8 | true | `45dd9300` | 2026-11-16 08:07:09 PM EST |
| feedback-to-notion | 29 | false | `6bc351ca` | 2026-09-28 11:34:21 PM EDT |
| get-coach-roster | 26 | true | `8945b54b` | 2026-05-31 04:10:47 PM EDT |
| join-waitlist | 8 | false | `1fc0dccc` | 2026-10-29 03:28:17 PM EDT |
| lifecycle-emails | 11 | false | `77358262` | 2026-11-16 09:47:01 PM EST |
| notify-coach-signup | 28 | false | `daffdfba` | 2026-10-01 04:23:33 PM EDT |
| notify-inbound-lead | 15 | false | `688f7a4c` | 2026-09-29 12:05:51 AM EDT |
| p1-25-storage-drain | 1 | false | `208fad08` | 2026-11-24 03:15:13 PM EST |
| request-account-deletion | 16 | true | `d662e9b8` | 2026-11-15 09:22:01 PM EST |
| rombot-checkin | 6 | false | `fbad0021` | 2026-11-16 07:35:14 PM EST |
| rombot-conversations | 7 | true | `986e2f58` | 2026-11-02 09:35:15 PM EST |
| save-push-subscription | 27 | true | `ba6bd649` | 2026-11-16 10:12:32 PM EST |
| send-bb-s1-2-followup-email | 25 | false | `e9e5475d` | 2026-10-04 08:13:51 AM EDT |
| send-bb-s1-3-followup-email | 25 | false | `d84da24a` | 2026-10-04 08:14:22 AM EDT |
| send-bb-s1-4-stilhere-email | 25 | false | `67191eb3` | 2026-10-04 08:14:55 AM EDT |
| send-conversion-drip | 26 | false | `bb615a0e` | 2026-10-04 08:10:46 AM EDT |
| send-protocol-reminder | 26 | false | `0e35974d` | 2026-10-01 04:23:27 PM EDT |
| send-push-notification | 28 | false | `96dfc872` | 2026-11-16 10:12:09 PM EST |
| send-renewal-reminders | 32 | false | `3bcc783c` | 2026-11-16 09:51:33 AM EST |
| send-s1-2-followup-email | 28 | false | `70ec7706` | 2026-10-04 08:12:02 AM EDT |
| send-s1-3-masters-email | 28 | false | `8cc03fd5` | 2026-10-04 08:12:39 AM EDT |
| send-s1-4-stilhere-email | 28 | false | `00490da6` | 2026-10-04 08:13:10 AM EDT |
| send-s1-welcome-email | 40 | false | `99f5d36b` | 2026-10-06 01:01:47 PM EDT |
| send-whats-new | 12 | false | `fc831df4` | 2026-10-18 06:18:27 PM EDT |
| serve-base-icon | 18 | false | `6d3d9acc` | 2026-09-08 05:55:01 PM EDT |
| stripe-webhook **CHANGED** | 60 | false | `12b2e1c4` | 2026-11-24 03:56:58 PM EST |
| submit-assessment | 50 | true | `edb16eb4` | 2026-11-16 09:42:39 AM EST |
| submit-consent | 29 | true | `e760e676` | 2026-05-04 10:50:43 AM EDT |
| submit-feedback | 26 | false | `d6c1e021` | 2026-07-05 08:31:05 PM EDT |
| submit-lead-assessment | 36 | false | `48c6f464` | 2026-10-26 05:52:22 PM EDT |
| unsubscribe | 19 | false | `879abbfa` | 2026-11-16 07:28:00 PM EST |

## Summary (Grant)

| function | before | after | verify_jwt | deploy time ET |
|---|---|---|:---:|---|
| create-checkout-session | v53 / `cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b` | v54 / `299759926463ae3139fa730556c285fd63b0bc2680b04cd0094603d1ce856328` | true (unchanged) | 2026-11-24 3:56:21 PM ET (EST) |
| stripe-webhook | v59 / `3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0` | v60 / `12b2e1c438359be2cd81b6cbd3cf5cc5df6d7ee9f27b92dc5bd135850611a7e0` | false (unchanged) | 2026-11-24 3:56:58 PM ET (EST) |
| ai-chat | v101 / `2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7` | v102 / `b714e06099a9a7961d19d2a09cd298d9b436a4bf1bb2c53fe7320bdf3571b220` | true (unchanged) | 2026-11-24 3:58:47 PM ET (EST) |

diff vs the 3:55:34 PM ET BEFORE list = **only those three functions**.

Migration id: **20261124210022**. Flag: **not set** (CLI 401; step 6 skipped).

## Rollbacks (not run)

- create-checkout-session: redeploy `deploy-set-S1-ARL-MAR1-rev3/rollback/TRIALEND-MAR1/` (fast-track bytes), entrypoint source/index.ts, verify_jwt true; expect ezbr `cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b`. Or `rollback/L1468-v52/` for the v52 identity, ezbr `36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9`, verify_jwt true.
- stripe-webhook: redeploy `rollback-live-v59/`, entrypoint source/index.ts, verify_jwt false; expect ezbr `3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0`.
- ai-chat: redeploy `deploy-set-ROMOOD-20261124/rollback/live-v101/` (3 files, no romood_*.js), entrypoint source/index.ts, verify_jwt true; expect ezbr `2db1a2de38f0e57c86ea3e43e2644c0f572787fc5830774ef73c53e51466dff7`.
- Migration: `20261124210022_romood_insert_accepts_v2_or_v3_consent.rollback.sql.txt` (restores the v2-only policy). Not applied.
- Flag: not set, so no unset was needed. The kill switch would have been `supabase secrets unset ROMBOT_MOOD` once the CLI can authenticate.

## State now

create-checkout-session **v54** / `29975992…` / verify_jwt true (Base promo off, 503 removed, March 1 trial_end, S8 ack copy). stripe-webhook **v60** / `12b2e1c4…` / verify_jwt false (March 1 ack and trial_end write). ai-chat **v102** / `b714e060…` / verify_jwt true (ROMood code live; flag not set). Mood insert policy accepts v2 or v3. v3 consent count remains 0.
