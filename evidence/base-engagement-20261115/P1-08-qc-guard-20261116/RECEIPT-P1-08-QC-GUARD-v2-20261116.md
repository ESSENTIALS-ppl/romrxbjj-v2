# RECEIPT v2: P1-08 quick-check suppression guard, on b19b13dc, typings fix fb53b85. BUILD ONLY.

Written Mon Nov 16, 2026, about 7:12 PM ET by Avery. Not deployed, nothing applied, no Supabase writes, no secret or flag writes. `LIFECYCLE_EMAILS_SEND` is untouched. This receipt supersedes the rollback section of `RECEIPT-P1-08-QC-GUARD-20261116.md` (sha256 `36753fd1f5b11c44b5f30975822eac80f061ceac14870569d4e7482a17109cf6`). That older file is not edited. The older rollback targeted b19b13dc, which was never live, so it is not a rollback target.

This is its own gated item. It still needs Margot's sha line for this tip, Vera's precheck of this receipt, and Sable's OK (relayed by Grant) before any deploy. It is not a substitute for a send-switch line.

Answers Vera's 5f32021a items (1) and (2): rollback is to the live functions, and a clean `deno test` with type check now passes 85/85.

## Commit
- **sha `fb53b850f0651a0e0af0fcc440c1d241a9d657da`**
- **parent `a41a3029bc7b6f3140c40bd3d72bd28c63d2b23c`** (the guard itself)
- **grandparent `b19b13dca82a3c2eb34a641aa5ca79e410090c00`** (P1-08 sender, Base From/Reply-To hello@romrx.io)
- **patch sha256 vs b19b13dc: `932d7597b575628e0ead3b4a7f1e92cf7d7da5534fa778785455d899f38c7af1`**
- Method (this receipt): `git diff b19b13dc..fb53b850f0651a0e0af0fcc440c1d241a9d657da | sha256sum`. The saved copy is `diffs/fb53b85-vs-b19b13dc.diff` and has the same sha256. (The first receipt hashed only `git show --format= --patch` of a41a3029, `d761f39a…`. That method is not used here.)
- Branch `feat/p1-08-qc-guard-on-b19b13dc-20261116`, plain-pushed (fast-forward a41a302..fb53b85). Remote tip = fb53b85. Worktree `/workspace/p1-08-qc-guard-20261116`.

fb53b85 is a test-only typings fix on a41a3029. Function bytes did not move.

### Empty source/ diff proof
```
git diff a41a3029 -- supabase/functions/lifecycle-emails/source/ supabase/functions/lifecycle-emails/_shared/ supabase/functions/unsubscribe/source/ supabase/functions/unsubscribe/_shared/
```
is empty. Proof note: `diffs/fb53b85-source-unchanged.txt`.

### Changed-file list vs a41a3029
Only one file:
- `supabase/functions/lifecycle-emails/test/quick-check-guard.test.ts` (+4 / -2)

The test-only patch is `diffs/fb53b85-vs-a41a3029.diff` sha256 `b1f092673d61d0db856bef4272026407feeaab52611810be28bf756eaa218d53`. It types the handler-loop `extras` as `Record<string, string>[]` and the spread `env` as `Record<string, string>`, so spreading `{}` no longer infers `QUICK_CHECK_ON` as `string | undefined` (Vera's 3× TS2345 at the old lines 135, 138 and 140). Behavior of the 9 tests is unchanged.

## Behavior
Unchanged from a41a3029 / the first receipt. Short restatement:

The function reads server env `QUICK_CHECK_ON` with the same fail-safe as the other lifecycle flags (`flagOn`: ON only when the value is exactly the lowercase string `"on"`). Unset, empty, `"true"`, `"TRUE"`, `"1"`, or any other value is off. That is the default, and it matches the live client flag (`QUICK_CHECK_ON = false` at `app/src/lib/quickCheck.ts:22`, live L1135 / 8bf3d601).

Version A is the check7 email, and the check14 email when there is no current-cycle quick row. Both use the button path `/dashboard/quick-check`. Version B is the check14 email when a current-cycle quick row exists (`has_quick_check`). It uses `/dashboard/my-protocol` and does not link to the quick-check page.

When `QUICK_CHECK_ON` is not `"on"`: check7 is skipped (`quick_check_off`); check14 with no quick row is skipped (`quick_check_off`); check14 version B still sends; retest, protocol, digest and lapsed are unchanged. When the flag is exactly `"on"`, version A is chosen as it is on b19b13dc.

Subjects and body words are unchanged. `copyFor` / `buildEmail` are untouched. `source/index.ts` is untouched vs b19b13dc. Unsubscribe function bytes are byte-identical to b19b13dc (they add the check7/check14 scopes on top of live v13's lapsed scope) and are part of shipping this sha, because this tip is on b19b13dc.

## Every hunk vs b19b13dc
The function hunks are the same two source files as a41a3029 (handler.ts, logic.ts). The combined patch vs b19b13dc also includes the original test additions plus the typings fix in `test/quick-check-guard.test.ts`. See `diffs/fb53b85-vs-b19b13dc.diff`.

## Tests (Mon Nov 16, 2026, about 7:10 PM ET)
Command, from each function directory, with type check on (no `--no-check`):

`deno test -A --no-lock --node-modules-dir=none`

- lifecycle-emails at fb53b85: **85 passed, 0 failed**. Log starts with `Check test/day7-day14.test.ts` (deno type-checked the test files). `tests/lifecycle-suites-v2.txt`
- unsubscribe at fb53b85: **24 passed, 0 failed**. Log starts with `Check test/p1-scopes.test.ts`. `tests/unsubscribe-suites-v2.txt`

The first receipt's 85/85 was from a run that needed `--no-check` to type-check cleanly. That is no longer true.

## Live v3 / v13 hash check (read-only, about 7:08 PM ET)
Project `cqzvqzwwevnflinxgnpp`. `list_edge_functions` and `get_edge_function` only. No deploy, no env or secret reads or writes.

| Function | version | status | verify_jwt | ezbr_sha256 | prefix check |
|---|---|---|---|---|---|
| lifecycle-emails | **v3** | ACTIVE | false | `d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e` | starts `d68e443b` — **MATCH**, no drift |
| unsubscribe | **v13** | ACTIVE | false | `cfb084bb0afa91b1399a0fa8e269ad736ae445bd46f535cfd7aeb5c92fba7157` | starts `cfb084bb` — **MATCH**, no drift |

Entrypoints remain `source/index.ts`. File bytes from `get_edge_function` are saved in `rollback/live-lifecycle-emails-v3/` (10 files) and `rollback/live-unsubscribe-v13/` (5 files). Every sha256 and size **MATCH** the L1133 / `P1-08-sender-20261116/pre-live/` copies (`SHA256SUMS-PRE-LIVE`). `updated_at` on both functions is unchanged since L1133. Meta (no file bodies) is in `rollback/live-lifecycle-emails-v3-meta.json` and `rollback/live-unsubscribe-v13-meta.json`. Hashes and sizes: `SHA256SUMS-ROLLBACK-LIVE`.

## Ship deploy (when this sha is ever deployed). Not deployed today.
This tip ships **both** functions, because it sits on b19b13dc. **Deploy order is unsubscribe v14 first, then lifecycle-emails v4.** MCP `deploy_edge_function` only, project `cqzvqzwwevnflinxgnpp`. Tests are never uploaded. The tool defaults `verify_jwt` to true, so **pass false explicitly on both**. The tool takes at most 4 file refs; paste the rest inline from the staged / git / rollback-adjacent bytes. entrypoint_path `source/index.ts` on both. If a call is rejected for too many file refs, do not retry with a partial file list; re-issue the same step with 4 refs and the rest pasted.

No env change is needed or allowed. Do not set, unset, or rotate `QUICK_CHECK_ON`, `LIFECYCLE_EMAILS_SEND`, `LIFECYCLE_AUDIENCE`, or any other secret. Leaving `QUICK_CHECK_ON` unset keeps the guard in the default-off state. `LIFECYCLE_EMAILS_SEND` stays not `"on"` and is not touched. Do not touch the renewal cron, send-renewal-reminders, or `RENEWAL_BASE_SEND`.

Staged lifecycle-emails copies (unchanged vs a41a3029) are in `staged/a41a3029-lifecycle-emails/`. Unsubscribe bytes are at `git show fb53b85:supabase/functions/unsubscribe/<name>` (identical to b19b13dc).

### Step A — unsubscribe FIRST (expected v14)
name `unsubscribe`, entrypoint_path `source/index.ts`, **verify_jwt false**.

| name | sha256 at fb53b85 (= b19b13dc) | vs live v13 | bytes | how to pass |
|---|---|---|---|---|
| source/index.ts (entrypoint) | `37f5bf2f7cf22f7672befa89babafb2d3a8f8ab50667c1232a052bb9f61ae5d4` | DIFF (comment only, P1 scopes) | 4504 | file ref |
| source/token_path.ts | `2c119d967ca83fa6d75e6c18621b92919334e45cbb22627724d26d261bdfb899` | DIFF (comment only) | 5350 | file ref |
| _shared/unsub_token.ts | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | DIFF (adds check7/check14, keeps lapsed) | 3713 | file ref |
| _shared/rate_limit.ts | `7bae6d34db82052977c138ea16c6e993d5afddc0e378f9b2df387241d27cf302` | MATCH | 4838 | file ref |
| _shared/events.ts | `49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21` | MATCH | 1285 | **paste inline** (5th file) |

Byte read-back before Step B:
1. `list_edge_functions`: unsubscribe is v14, ACTIVE, **verify_jwt false**. Record the new ezbr. lifecycle-emails still v3 / `d68e443b…`. No other function version changed.
2. `get_edge_function unsubscribe`: 5 files, each sha256 equals the table. entrypoint `source/index.ts`.
3. Do not invoke the function.

### Step B — lifecycle-emails SECOND (expected v4)
Only after Step A read-back is clean. name `lifecycle-emails`, entrypoint_path `source/index.ts`, **verify_jwt false**. Function file bytes equal a41a3029 (confirmed by the empty source/ diff).

| name | sha256 at fb53b85 (= a41a3029) | vs live v3 | vs b19b13dc | bytes | how to pass |
|---|---|---|---|---|---|
| _shared/mobility/mobilityBands.ts | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | MATCH | MATCH | 37110 | file ref |
| source/logic.ts | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | DIFF | DIFF (guard) | 20622 | file ref |
| source/email.ts | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | DIFF | MATCH | 10852 | file ref |
| source/index.ts (entrypoint) | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | DIFF | MATCH | 6276 | file ref |
| source/handler.ts | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | DIFF | DIFF (guard) | 5389 | paste inline |
| _shared/unsub_token.ts | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | DIFF | MATCH | 3713 | paste inline |
| source/score.ts | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | DIFF | MATCH | 2810 | paste inline |
| _shared/mobility/lumbarFlag.ts | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | MATCH | MATCH | 1471 | paste inline |
| source/deletion.ts | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH | MATCH | 1269 | paste inline |
| _shared/email_footer.ts | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH | MATCH | 1216 | paste inline |

Byte read-back:
1. `list_edge_functions`: lifecycle-emails is v4, ACTIVE, **verify_jwt false**. Record the new ezbr. unsubscribe still the Step A v14 / ezbr. No other function version changed.
2. `get_edge_function lifecycle-emails`: 10 files, each sha256 equals the table. entrypoint `source/index.ts`.
3. Do not invoke the function. No env change.

## Rollback (supersedes the first receipt's rollback). Back to the LIVE versions, not b19b13dc.
b19b13dc was never live, so it is not a rollback target. If both functions have moved and both must go back, roll **lifecycle-emails back to v3 first**, then **unsubscribe back to v13**, so no check7/check14 link is left live against a function that would not verify those scopes. Copies are the live read from tonight, in `rollback/live-lifecycle-emails-v3/` and `rollback/live-unsubscribe-v13/`, hashed in `SHA256SUMS-ROLLBACK-LIVE`.

No env change is required or allowed on rollback either. Do not set, unset, or rotate `QUICK_CHECK_ON`, `LIFECYCLE_EMAILS_SEND`, `LIFECYCLE_AUDIENCE`, or any other secret.

### Rollback 1 — lifecycle-emails to live v3 first
1. Confirm `rollback/live-lifecycle-emails-v3/` still hashes as `SHA256SUMS-ROLLBACK-LIVE` (10 files; live ezbr `d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e`). If it does not, stop, re-pull with `get_edge_function` only if v3 is still live, or restore from the matching `P1-08-sender-20261116/pre-live/lifecycle-emails-v3/` / L1133 post-deploy copies after re-hashing, and do not deploy a partial list.
2. MCP `deploy_edge_function`: name `lifecycle-emails`, entrypoint_path `source/index.ts`, **verify_jwt false** (explicit), files = those 10 exact bytes. Tests are never uploaded. At most 4 file refs, the rest pasted inline from the rollback copies. Do not retry with a partial file list.

| name | sha256 (live v3 rollback target) | bytes | how to pass |
|---|---|---|---|
| _shared/mobility/mobilityBands.ts | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | 37110 | file ref |
| source/logic.ts | `0c13c9ae9b96e21cf0f2eaace1a26e29b2b74bab38be8de316102b47f2fd4b13` | 17533 | file ref |
| source/email.ts | `51c9558cef1eb6ca65a97f99666e8bf0df1bb28ef2063caae731aa80d4c4e40c` | 8434 | file ref |
| source/index.ts (entrypoint) | `c4ec33969ffb7d3396f7450f6c28ab115d9982d91cb635ea8a8a9dd3303d8629` | 5841 | file ref |
| source/handler.ts | `0c920063f0cbceb8a1ebe900ba08c5c8514ae0c936c7acb299005f682692e957` | 5322 | paste inline |
| _shared/unsub_token.ts | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | 3443 | paste inline |
| source/score.ts | `d3d03dd640c1e2df42f3cffbd8b485f1f5ac8ae2dc5742310a621315997cd69c` | 1889 | paste inline |
| _shared/mobility/lumbarFlag.ts | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | 1471 | paste inline |
| source/deletion.ts | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | 1269 | paste inline |
| _shared/email_footer.ts | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | 1216 | paste inline |

3. Byte read-back (required before calling this step done):
   1. `list_edge_functions`: lifecycle-emails is a new version (v5 if this follows a v4 deploy), ACTIVE, **verify_jwt false**. Record the new ezbr. The ezbr will not be `d68e443b…`; the file bytes must match the v3 table. unsubscribe is still the post-ship v14 (do not roll it yet). No other function version changed.
   2. `get_edge_function lifecycle-emails`: 10 files, each sha256 equals the v3 table above. entrypoint `source/index.ts`.
   3. Do not invoke the function. No env change.

### Rollback 2 — unsubscribe to live v13 second
1. Confirm `rollback/live-unsubscribe-v13/` still hashes as `SHA256SUMS-ROLLBACK-LIVE` (5 files; live ezbr `cfb084bb0afa91b1399a0fa8e269ad736ae445bd46f535cfd7aeb5c92fba7157`).
2. MCP `deploy_edge_function`: name `unsubscribe`, entrypoint_path `source/index.ts`, **verify_jwt false** (explicit), files = those 5 exact bytes. At most 4 file refs, the rest pasted inline. Do not retry with a partial file list.

| name | sha256 (live v13 rollback target) | bytes | how to pass |
|---|---|---|---|
| source/index.ts (entrypoint) | `f78d43b429e93a9f96c6c28a57a398c76b24b6ae7eeeb4417684438fa026377b` | 4507 | file ref |
| source/token_path.ts | `bafad0e893f512a0ae6e1c7e7bdab44af6be49d145aa8410c3465b38fcf5671b` | 5342 | file ref |
| _shared/unsub_token.ts | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | 3443 | file ref |
| _shared/rate_limit.ts | `7bae6d34db82052977c138ea16c6e993d5afddc0e378f9b2df387241d27cf302` | 4838 | file ref |
| _shared/events.ts | `49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21` | 1285 | **paste inline** |

3. Byte read-back:
   1. `list_edge_functions`: unsubscribe is a new version, ACTIVE, **verify_jwt false**. Record the new ezbr. The ezbr will not be `cfb084bb…`; the file bytes must match the v13 table. lifecycle-emails is still the Rollback 1 version. No other function version changed.
   2. `get_edge_function unsubscribe`: 5 files, each sha256 equals the v13 table above. entrypoint `source/index.ts`.
   3. Do not invoke the function. No env change.

If only unsubscribe has been deployed (Step A done, Step B not started), skip Rollback 1 and apply Rollback 2 only.

The first receipt's `rollback/b19b13dc-lifecycle-emails/` copies are left in place and are not a rollback target for a ship of this sha.

## Not in this build
- No deploy today. No secret or flag reads or writes.
- `LIFECYCLE_EMAILS_SEND` stays not `"on"` and is not touched.
- Turning `QUICK_CHECK_ON` to `"on"` (client or server) needs its own line.
- The old receipt 36753fd1 is not edited.
