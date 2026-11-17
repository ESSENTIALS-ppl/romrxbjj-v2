# RECEIPT: P1-08 quick-check suppression guard, on b19b13dc. BUILD ONLY.

Written Mon Nov 16, 2026, about 7:00 PM ET by Avery. Not deployed, nothing applied, no Supabase writes, no secret or flag writes. This is its own gated item. It needs Margot's sha line, Vera's precheck and Sable's OK (relayed by Grant) before any deploy. It is not a substitute for the b19b13dc deploy under L1146.

Answers Vera's 2c357b00 WARN 2 and Grant's brief (via Sable): send check7/check14 version A only when QUICK_CHECK_ON is on. When it's off, use version B, or skip the email if there is no B. LIFECYCLE_EMAILS_SEND is not touched.

## Commit
- **sha `a41a3029bc7b6f3140c40bd3d72bd28c63d2b23c`**
- **parent `b19b13dca82a3c2eb34a641aa5ca79e410090c00`** (P1-08 sender, Base From/Reply-To hello@romrx.io)
- **patch sha256 (`git show --format= --patch`) `d761f39a3c8b015e70b554de7a2d7a61e6ae57598be4ea29a9c23240bb318fe3`**
- Branch `feat/p1-08-qc-guard-on-b19b13dc-20261116`, plain-pushed. Remote tip = a41a3029. Worktree `/workspace/p1-08-qc-guard-20261116`, created from b19b13dc. 7 files, +182 / -10.

## Behavior
The client flag is a source constant, `QUICK_CHECK_ON = false` at `app/src/lib/quickCheck.ts:22` (live L1135 / 8bf3d601). The function cannot import that file, so it reads an equivalent server env of the same name, with the same fail-safe as the other lifecycle flags (`flagOn`: ON only when the value is exactly the lowercase string `"on"`). Unset, empty, `"true"`, `"TRUE"`, `"1"`, or any other value is off. That is the default, and it matches the live client (the page is not reachable).

Version A is the check7 email, and the check14 email when there is no current-cycle quick row. Both use the button path `/dashboard/quick-check`.

Version B is the check14 email when a current-cycle quick row exists (`has_quick_check`). It uses `/dashboard/my-protocol` ("Open today's session") and does not link to the quick-check page.

When `QUICK_CHECK_ON` is not `"on"`:
- check7 has no version B, so it is skipped (`quick_check_off`).
- check14 with no quick row is version A, so it is skipped (`quick_check_off`).
- check14 version B still sends.
- retest, protocol, digest and lapsed are unchanged.

When `QUICK_CHECK_ON` is exactly `"on"`, version A is chosen as it is on b19b13dc. A later line that turns the client flag on should also set this env to `"on"`; that line is not this build.

Subjects and body words are unchanged. The guard only chooses whether A is planned. `copyFor` / `buildEmail` are untouched. `source/index.ts` is untouched (env is already injected via `d.env`). Unsubscribe is byte-identical to b19b13dc and is not part of this item.

## Every hunk vs b19b13dc
Full patch: `diffs/a41a3029-vs-b19b13dc.diff` sha256 **`d761f39a3c8b015e70b554de7a2d7a61e6ae57598be4ea29a9c23240bb318fe3`**, 7 files, +182 / -10.

Function source only (`diffs/a41a3029-vs-b19b13dc-function-only.diff` sha256 **`ec59c8dd00430d518ae4872936874bf82ac834b9edc76f3cb7a4d54720656b3a`**, 2 files, +12 / -4):
1. `source/logic.ts`: adds `quickCheckOn()` (same rule as `flagOn`); adds skip reason `quick_check_off`; `planKind` takes optional `quickCheckOn` (defaults off); after the existing check7-already-done skip, version A is skipped when the flag is off.
2. `source/handler.ts`: passes `quickCheckOn: quickCheckOn(d.env("QUICK_CHECK_ON"))` into `planKind`.

Tests:
3. `test/quick-check-guard.test.ts` (new, 9 tests): both flag states, including the handler path; version B still sends when off and does not include `/dashboard/quick-check`; other kinds unchanged; already-done check7 stays `not_due`.
4. `test/day7-day14.test.ts` and `test/p1-08-v4.test.ts`: existing scheduling tests pass `quickCheckOn: true` so they still cover due-date math when A is allowed.
5. `test/sender-romrx.test.ts` and `test/unsub-scopes.test.ts`: the handler fixtures that must actually send check7 / check14 A set `QUICK_CHECK_ON=on`. Those tests are about the sender and the unsub scopes, not about the guard.

## Tests (Mon Nov 16, 2026, about 6:58 PM ET)
- lifecycle-emails suites at a41a3029: **85 passed, 0 failed** (b19b13dc: 76/76, plus 9 new). `tests/lifecycle-suites.txt`
- unsubscribe suites at a41a3029: **24 passed, 0 failed**. `tests/unsubscribe-suites.txt`
- deno check of `source/handler.ts`, `source/logic.ts`, `source/email.ts`: clean. `tests/deno-check.txt`. `source/index.ts` is unchanged vs b19b13dc.

## Deploy files (when this sha is ever deployed). Not deployed today.
MCP `deploy_edge_function` only, name `lifecycle-emails`, entrypoint_path `source/index.ts`, **verify_jwt false** (explicit; the tool defaults to true). Tests are never uploaded. 10 files, same names as live and as b19b13dc. Copies saved in `staged/a41a3029-lifecycle-emails/` (`SHA256SUMS-STAGED`). Only handler.ts and logic.ts differ from b19b13dc.

| name | sha256 at a41a3029 | vs b19b13dc | bytes |
|---|---|---|---|
| source/index.ts (entrypoint) | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | MATCH | 6276 |
| source/handler.ts | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | DIFF | 5389 |
| source/logic.ts | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | DIFF | 20622 |
| source/email.ts | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | MATCH | 10852 |
| source/score.ts | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | MATCH | 2810 |
| source/deletion.ts | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH | 1269 |
| _shared/unsub_token.ts | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | MATCH | 3713 |
| _shared/email_footer.ts | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH | 1216 |
| _shared/mobility/lumbarFlag.ts | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | MATCH | 1471 |
| _shared/mobility/mobilityBands.ts | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | MATCH | 37110 |

Unsubscribe is not deployed by this item. LIFECYCLE_EMAILS_SEND is not read or written by the deploy (the function still sends only when that value is exactly `"on"`). QUICK_CHECK_ON is not set by the deploy; leaving it unset keeps the guard in the default-off state.

## Rollback (step by step) back to the b19b13dc bytes
This restores the lifecycle-emails function to the exact b19b13dc file bytes. It is the rollback for this guard only. It is not the L1146 rollback to live v3 (that stays in `PLAN-P1-08-DEPLOY-20261116.md`). Unsubscribe is not redeployed. Copies are saved in `rollback/b19b13dc-lifecycle-emails/` and hashed in `SHA256SUMS-ROLLBACK`.

### Files to redeploy (the 10 lifecycle-emails files at b19b13dc)

| name | sha256 at b19b13dc (rollback target) | bytes |
|---|---|---|
| source/index.ts (entrypoint) | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | 6276 |
| source/handler.ts | `0c920063f0cbceb8a1ebe900ba08c5c8514ae0c936c7acb299005f682692e957` | 5322 |
| source/logic.ts | `7dff5e604470d7d3c19aea51ced967377bf8d37ac57e4f9abe8a4df062972630` | 19834 |
| source/email.ts | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | 10852 |
| source/score.ts | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | 2810 |
| source/deletion.ts | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | 1269 |
| _shared/unsub_token.ts | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | 3713 |
| _shared/email_footer.ts | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | 1216 |
| _shared/mobility/lumbarFlag.ts | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | 1471 |
| _shared/mobility/mobilityBands.ts | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | 37110 |

These ten hashes match the b19b13dc staged files already on file in `P1-08-sender-20261116/staged/b19b13dc-lifecycle-emails/` and the file table in `PLAN-P1-08-DEPLOY-20261116.md`.

### Steps
1. Confirm `rollback/b19b13dc-lifecycle-emails/` still hashes as `SHA256SUMS-ROLLBACK` (10 files, the table above). If it does not, extract the same paths from `git show b19b13dca82a3c2eb34a641aa5ca79e410090c00:supabase/functions/lifecycle-emails/<name>` and re-hash before continuing.
2. MCP `deploy_edge_function`: name `lifecycle-emails`, entrypoint_path `source/index.ts`, **verify_jwt false** (explicit; the tool defaults to true), files = those 10 exact bytes. Tests are never uploaded. The tool takes at most 4 file refs; paste the rest inline from the rollback copies. Do not retry with a partial file list.
3. **Byte read-back** (required before calling the rollback done):
   1. `list_edge_functions`: lifecycle-emails is a new version, ACTIVE, **verify_jwt false**. Record the new ezbr. The ezbr will not be the previous one; the file bytes must match b19b13dc. unsubscribe is unchanged (do not redeploy it). No other function version changed.
   2. `get_edge_function lifecycle-emails`: 10 files, each sha256 equals the rollback table above. entrypoint `source/index.ts`.
   3. Do not invoke the function.
4. **No env change is required.** This guard only reads `QUICK_CHECK_ON` and defaults off when the value is missing. The build never set that env, and the rollback does not set, unset, or rotate it (or `LIFECYCLE_EMAILS_SEND`, `LIFECYCLE_AUDIENCE`, or any other secret). Leaving `QUICK_CHECK_ON` unset, or even left at `"on"` after a later send-line, is harmless on the b19b13dc bytes, because b19b13dc does not read that env. Do not touch `LIFECYCLE_EMAILS_SEND` as part of this rollback.

## Not in this build
- No deploy today. No secret or flag reads or writes.
- `LIFECYCLE_EMAILS_SEND` stays not `"on"` and is not touched.
- Unsubscribe is not changed and is not redeployed.
- b19b13dc itself still deploys dry under L1146 only after Vera's precheck of plan 19818e65 and Sable's OK relayed by Grant. This sha is a later, separate gate.
- Turning `QUICK_CHECK_ON` to `"on"` (client or server) needs its own line.
