# RECEIPT: P1-08 quick-check guard DRY deploy (fb53b850), Mon Nov 16 2026

Project `cqzvqzwwevnflinxgnpp`. Source: romrxbjj-v2 commit `fb53b850f0651a0e0af0fcc440c1d241a9d657da`, worktree `/workspace/p1-08-qc-guard-20261116`, branch `feat/p1-08-qc-guard-on-b19b13dc-20261116` (not main). HEAD == fb53b850 and `git status --porcelain` empty, checked before any bytes were read. Basis: L1031 (Jim, "Do all of them"), L1199 / L1207 pins, L1209 Sable OK (dry deploy), Vera FAIL 6 recheck 281862eb passed, relayed by Grant.

Tool: Supabase MCP only (`list_edge_functions`, `get_edge_function`, `deploy_edge_function`, read-only `execute_sql`). No env or secret change. No cron change. No invocation of either function. No test submit or send.

## Timeline (ET)
| Step | Time (ET) | Result |
|---|---|---|
| 1. Pre-check (list + SQL) | 7:27:17 PM | lifecycle-emails v3 `d68e443b…` verify_jwt false; unsubscribe v13 `cfb084bb…` verify_jwt false; send switch off; email_sends 24; cron 13 jobs. PASS |
| 2. Deploy unsubscribe v14 | 7:28:00 PM (function updated_at) | v14 ACTIVE, verify_jwt false |
| 2. Read-back unsubscribe | 7:28:21 PM | 5/5 files MATCH git fb53b850, same file set. PASS |
| 3. Deploy lifecycle-emails v4 | 7:29:36 PM (function updated_at) | v4 ACTIVE, verify_jwt false |
| 3. Read-back lifecycle-emails | 7:29:48 PM | 10/10 files MATCH git fb53b850, same file set. PASS |
| 4. Post-check | 7:30:43 PM | only these two functions changed (39 functions listed before and after); switch off; email_sends 24, 0 new; cron unchanged. PASS |

## Versions
| Function | Before | After | verify_jwt before / after | entrypoint |
|---|---|---|---|---|
| unsubscribe | v13 `cfb084bb0afa91b1399a0fa8e269ad736ae445bd46f535cfd7aeb5c92fba7157` | **v14** `879abbfacde0fc1e812713205c4ed38aaa3c6f606d1cf37a3704e85293ff8622` | false / **false** | `source/index.ts` (unchanged) |
| lifecycle-emails | v3 `d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e` | **v4** `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41` | false / **false** | `source/index.ts` (unchanged) |

Layout: same file names and entrypoint as live v13 (5 files) and v3 (10 files); no deno.json or import map (none at fb53b850, none live). Method as planned in receipt v2 and used at L1133: 4 `$file:` refs per call, the rest passed inline. Each deploy was one call with the full file list; nothing was retried.

## File sha256: live read-back vs git blob at fb53b850
### unsubscribe v14
| file | bytes | sha256 (live = git) | how passed | result |
|---|---|---|---|---|
| source/index.ts | 4504 | `37f5bf2f7cf22f7672befa89babafb2d3a8f8ab50667c1232a052bb9f61ae5d4` | file ref | MATCH |
| source/token_path.ts | 5350 | `2c119d967ca83fa6d75e6c18621b92919334e45cbb22627724d26d261bdfb899` | file ref | MATCH |
| _shared/unsub_token.ts | 3713 | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | file ref | MATCH |
| _shared/rate_limit.ts | 4838 | `7bae6d34db82052977c138ea16c6e993d5afddc0e378f9b2df387241d27cf302` | file ref | MATCH |
| _shared/events.ts | 1285 | `49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21` | inline | MATCH |

### lifecycle-emails v4
| file | bytes | sha256 (live = git) | how passed | result |
|---|---|---|---|---|
| source/index.ts | 6276 | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | file ref | MATCH |
| source/logic.ts | 20622 | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | file ref | MATCH |
| source/email.ts | 10852 | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | file ref | MATCH |
| _shared/mobility/mobilityBands.ts | 37110 | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | file ref | MATCH |
| source/handler.ts | 5389 | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | inline | MATCH |
| source/score.ts | 2810 | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | inline | MATCH |
| source/deletion.ts | 1269 | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | inline | MATCH |
| _shared/unsub_token.ts | 3713 | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | inline | MATCH |
| _shared/mobility/lumbarFlag.ts | 1471 | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | inline | MATCH |
| _shared/email_footer.ts | 1216 | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | inline | MATCH |

Read-back meta (no file bodies): `deploy-20261116/readback-unsubscribe-v14-meta.json`, `deploy-20261116/readback-lifecycle-emails-v4-meta.json`. Read-back bytes: `deploy-20261116/readback-*/`. Bytes exported from git: `deploy-20261116/fb53b850-bytes/`. Checker: `deploy-20261116/readback.py`. All 15 tables match receipt v2 (aa254589) Step A / Step B.

## Switch states (values never printed beyond on/off)
- **LIFECYCLE_EMAILS_SEND: not on.** Read the same way as the L1133 / STEP1b receipts: the lifecycle-emails-hourly (cron job 11) responses in `net._http_response`. Before: 6:30 PM ET run on v3 = 200, `send_enabled false`, `dry_run true`, audience canary, canary_count 0. After: **7:30:00 PM ET run, served by v4** (deployed 7:29:36) = 200, `send_enabled false`, `dry_run true`, audience canary, canary_count 0; job 11 run `succeeded`. Not read, set or changed as a secret.
- **QUICK_CHECK_ON: unchanged** (not read, set or changed; the MCP has no secrets tool). Nothing in this deploy touches env.
- LIFECYCLE_AUDIENCE, canary and suppress lists, UNSUBSCRIBE_HMAC_SECRET, RENEWAL_BASE_SEND: not touched.

## email_sends
| | at (ET) | rows | newest sent_at (ET) |
|---|---|---|---|
| Pre-check | 7:27:17 PM | 24 | Oct 28 2026 12:11:27 PM |
| Post-check | 7:30:43 PM | 24 | Oct 28 2026 12:11:27 PM |
Rows with sent_at after the pre-check: **0**.

## Cron
Pre and post: 13 jobs, jobids 1-13, md5(jobid|schedule|command|active) `a96d2036959f1dc2697d23e7665cb490` both times (alt md5 incl. jobname `62828effdd6f58da06eb15b2ae74c396` both times). **Unchanged.** Renewal cron (job 1) not touched.

## Other functions
`list_edge_functions` before and after: 39 functions; the only differences are unsubscribe 13 -> 14 and lifecycle-emails 3 -> 4 (`deploy-20261116/pre-list-edge-functions.json`, `post-list-edge-functions.json`).

## Rollback (not needed, not run)
Order: **lifecycle-emails to v3 `d68e443b…` first, then unsubscribe to v13 `cfb084bb…`**, so no check7/check14 link is left live against a function that would not verify those scopes. If only one must go back, see receipt v2 "Rollback" section.
1. Confirm `sha256sum -c SHA256SUMS-ROLLBACK-LIVE-v3` = 15/15 OK (checked 7:27 PM ET today: 15/15 OK).
2. `deploy_edge_function` name `lifecycle-emails`, entrypoint `source/index.ts`, **verify_jwt false**, the 10 files in `rollback/live-lifecycle-emails-v3/` (4 file refs: mobilityBands.ts, logic.ts, email.ts, index.ts; rest inline). Read back: 10 files equal the v3 table in receipt v2 / `rollback/live-lifecycle-emails-v3-meta.json`. New version will be v5 with a new ezbr; bytes must match v3.
3. Then `deploy_edge_function` name `unsubscribe`, entrypoint `source/index.ts`, **verify_jwt false**, the 5 files in `rollback/live-unsubscribe-v13/` (4 refs: index.ts, token_path.ts, unsub_token.ts, rate_limit.ts; events.ts inline). Read back: 5 files equal `rollback/live-unsubscribe-v13-meta.json`. New version v15.
4. No env change on rollback either.

## Evidence in git
Committed to `evidence/receipts-rebuilt-20261115` under `evidence/base-engagement-20261115/P1-08-qc-guard-20261116/`: this receipt, `SHA256SUMS-DEPLOY`, `HELD-BACK-FROM-GIT-DEPLOY.md`, and the `deploy-20261116/` files listed in `SHA256SUMS-DEPLOY`. Four byte copies stay on disk only (address rule), listed with shas in `HELD-BACK-FROM-GIT-DEPLOY.md`.

## Not done
- No env, secret, flag or cron change. LIFECYCLE_EMAILS_SEND needs its own Jim line (L1209). QUICK_CHECK_ON "on" needs its own line.
- No function invoked, no test submit, no send.
- No hashed file overwritten; all files above are new.
