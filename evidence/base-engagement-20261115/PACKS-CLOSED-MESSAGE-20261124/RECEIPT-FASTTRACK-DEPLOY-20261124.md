# Receipt: fast-track TRIALEND-MAR1 create-checkout-session v53 deployed, 2026-11-24

Owner: Avery (Foundation Eng). Project `cqzvqzwwevnflinxgnpp`. Function **create-checkout-session** only. All times ET (America/New_York, EST). Account 7c71e421 was not touched. The function was not invoked. No Stripe calls. No checkout sessions were created. PACKS_CHECKOUT_OPEN was not changed. S1 rev3, webhook, and D7 folders were not touched.

Authority: Jim, 2:55 PM ET Nov 24, "Base should take a card now but not charge until let's say March 1 2027". Margot re-pinned SHA256SUMS-v2 `eb349064dae200d3175282981fdd0570d7129c0a484bd5783923127482fa9ad8`. Sable checked that pin. Grant RELEASED at 3:37 PM ET Nov 24 (Sable checked eb349064). Vera precheck 517ee10f was already VERIFIED. Set: `deploy-set-TRIALEND-MAR1`.

## 1. Gate (all passed; would have stopped on a mismatch)

- `sha256sum -c SHA256SUMS-v2`: **19/19 OK**, immediately before the live BEFORE list, 3:38 PM ET.
- SHA256SUMS-v2 itself hashes to **eb349064dae200d3175282981fdd0570d7129c0a484bd5783923127482fa9ad8**.
- DEPLOY-CALL-v2.txt was read and followed exactly.

## 2. BEFORE list (MCP list_edge_functions, 3:38:29 PM ET)

- **42 functions**. create-checkout-session **v52**, ezbr **36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9**, **verify_jwt=true**, updated **2026-11-24 2:43:33 PM ET (EST)**.
- The live list was byte-identical to pinned BEFORE-v2 on every field (name, version, ezbr, updated_at, verify_jwt, id, status, entrypoint, import_map). No added, removed, or changed functions.

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
| create-checkout-session | 52 | true | `36abc3ba` | 2026-11-24 02:43:33 PM EST |
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

## 3. Deploy (MCP deploy_edge_function, once)

Time: **2026-11-24 3:40:03 PM ET (EST)** (updated_at 2026-11-24T20:40:03.918Z, 1795552803918).

Call (as written in DEPLOY-CALL-v2.txt): project_id cqzvqzwwevnflinxgnpp, name create-checkout-session, entrypoint_path source/index.ts, verify_jwt true, five files with the staged bytes. import_map_path omitted. Not a CLI deploy. Deployed once; the successful call was not retried.

Staged files uploaded and later re-read from live:

| path | sha256 | sha8 | live get_edge_function |
|------|--------|------|------------------------|
| source/index.ts | 3b706ba85582d52336ec375d045477e4e29a0b1277487fe10ca1034478969666 | 3b706ba8 | MATCH |
| source/packs_gate.ts | 328ea953b5dc06735790681922632c561b600391beb1a14970aac0a422df6b65 | 328ea953 | MATCH |
| _shared/arl_copy.ts | f713fc4a6f11523a7d00cc4897dfc6edfc094f95f8422d860a2d7ac32f97a230 | f713fc4a | MATCH |
| _shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 | 49f18652 | MATCH |
| _shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 | f3a82f1d | MATCH |

Live packs_gate.ts has `PACKS_EARLIEST_OPEN_UNIX = 1803920400` (the value used as Base trial_end). Live arl_copy.ts has `BETA_TRIAL_END_UNIX = 1803920400`. Neither file contains 1798822800.

## 4. AFTER list (MCP list_edge_functions, 3:40:17 PM ET) and get_edge_function (3:40:18 PM ET)

- create-checkout-session **version 53**, ezbr **cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b**, **verify_jwt=true**, updated **2026-11-24 3:40:03 PM ET (EST)**, status ACTIVE, import_map false, entrypoint source/index.ts.
- Each of the five downloaded files was re-hashed and matched the staged sha256 values above.
- Full 42-function list delta: **only create-checkout-session changed**. The other 41 functions are unchanged in version, ezbr, updated_at, and verify_jwt. None were added or removed.

  before: v52, ezbr 36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9, verify_jwt=true, 2026-11-24 2:43:33 PM ET (EST)
  after:  v53, ezbr cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b, verify_jwt=true, 2026-11-24 3:40:03 PM ET (EST)

**diff = only create-checkout-session**

### AFTER table (42 functions)

| name | ver | verify_jwt | ezbr (sha8) | updated_at ET |
|---|---:|:---:|---|---|
| activate-beta-base | 18 | true | `c1bbafc2` | 2026-09-22 04:00:46 PM EDT |
| ai-chat | 101 | true | `2db1a2de` | 2026-11-15 08:14:37 PM EST |
| ai-chat-claims-test | 16 | true | `0b9a93a9` | 2026-10-12 07:41:58 PM EDT |
| calendar-ics | 4 | true | `9500e1e1` | 2026-11-16 09:09:39 PM EST |
| coach-actions | 32 | true | `831bb410` | 2026-06-04 12:36:12 PM EDT |
| compute-tiers | 59 | false | `f4c62a38` | 2026-11-16 09:42:59 AM EST |
| compute-tiers-base | 16 | false | `b14f678b` | 2026-11-03 06:27:28 PM EST |
| create-checkout-session **CHANGED** | 53 | true | `cebd7638` | 2026-11-24 03:40:03 PM EST |
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

## 5. Not done (by instruction)

- The function was not invoked (no curl, no MCP invoke, no checkout session, no Stripe API call).
- No other function was deployed or changed.
- S1 rev3, webhook, and D7 folders were not touched.
- Rollback was not run.

## 6. Rollback (not run)

If needed: MCP deploy_edge_function, name create-checkout-session, entrypoint_path source/index.ts, verify_jwt true, files = the L1468 / live v52 set in `deploy-set-TRIALEND-MAR1/rollback/L1468-v52/`:

| path | sha256 |
|------|--------|
| source/index.ts | 3b706ba85582d52336ec375d045477e4e29a0b1277487fe10ca1034478969666 |
| source/packs_gate.ts | 21bc6a5fae3e325a97fce7ab4efd9e2c846d8db4b17e588e9b78fa4b589b4ed5 |
| _shared/arl_copy.ts | c06bd3153d91dbcd4c9ba9458e7c601dbbb763a3cd07322757ddf7046408b3f3 |
| _shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 |
| _shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 |

Confirm after rollback: create-checkout-session is a new version with ezbr **36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9** (the v52 identity) and verify_jwt=true.

## State now

create-checkout-session is live **v53**, ezbr **cebd7638b4237e18922ef972c8d3a4db2eaf9398b9069b351d16748e15349b8b**, verify_jwt **true**. Base trial_end / BETA_TRIAL_END_UNIX is **1803920400** (2027-03-01 12:00 PM ET). Packs remain refused. Customer-facing arl_copy lines still say December 31, 2026 / January 1, 2027; those belong to the separate March 1 copy sets and were not changed here.
