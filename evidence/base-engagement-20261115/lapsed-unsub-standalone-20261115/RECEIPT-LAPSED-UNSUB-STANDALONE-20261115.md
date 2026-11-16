# RECEIPT: standalone lapsed unsubscribe fix (live v2 + live v12). BUILD ONLY
Written Sun Nov 15, 2026 10:30 PM ET by Avery. Grant's call after Vera's note: a minimal sha that can go live alone, with no P1-06 or P1-08 code. Nothing applied, deployed, or set.
No CLI db push, no force-push, Supabase reads only (`get_edge_function`). No secrets or user emails printed.
Untouched: send-renewal-reminders, RENEWAL_BASE_SEND, renewal cron, LIFECYCLE_EMAILS_SEND, WAITLIST secrets, 20261116040500.

## Live read-only, before any write (get_edge_function, project cqzvqzwwevnflinxgnpp)
- `lifecycle-emails` **v2**, updated Sun Nov 15, 2026 10:04:28 PM ET, `verify_jwt` false, ezbr_sha256 `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`.
- `unsubscribe` **v12**, updated Tue Nov 3, 2026 12:57:16 AM ET, `verify_jwt` false, ezbr_sha256 `97503ff467084edfe1780bf5d5a8bebfe06939dbfe429da0cd11e4741f790e86`.
- Fresh live bytes are identical to the copies saved earlier tonight under P1-unsub-scopes-20261115/live-reads/. Saved again in this folder's live-reads/.

**17c5c9f3 is byte-identical to live v2.** All 10 deployed files match (`source/` + `_shared/`, including `unsub_token.ts` sha 7414d015…4710). No extra or missing deploy-like files.

**Live send kinds** (from live v2 `logic.ts`): `KINDS = ["retest", "protocol", "digest", "lapsed"]`. `check7` and `check14` are not live send kinds. They appear only as day-14 math used to skip a lapsed send when a day-14 check would also be due. They were **not** added to UnsubScope.

## Commit
- Repo ESSENTIALS-ppl/romrxbjj-v2, branch `fix/lapsed-unsub-standalone-20261115` (plain push of a new branch)
- sha **e5488088136e3deb2ca513251f9398fbdf1c23ad**
- parent **17c5c9f37d5c4e6f68d0a84e9d06b4efd1f6a7d1** (live v2 / `fix/p1-15-16-stacy-lapsed-words-v2-20261115`)
- committed Sun Nov 15, 2026 10:30:04 PM ET
- patch sha (`git show --format= --patch | sha256sum`): `54730c72271ed47284501004e278db66e8ce222a85934a65bb47e5205c3d926d`
- worktree `/workspace/lapsed-unsub-standalone-20261115`
- One commit covers both functions. `b4e52f09` is untouched and stays the stacked P1-06/08 set.

## Hunk headers (every hunk in the commit)
1. `supabase/functions/lifecycle-emails/_shared/unsub_token.ts` `@@ -2,8 +2,15 @@` (the change)
2. `supabase/functions/lifecycle-emails/test/lapsed-unsub-scope.test.ts` `@@ -0,0 +1,143 @@` (new test)
3. `supabase/functions/unsubscribe/_shared/events.ts` `@@ -0,0 +1,34 @@` (live v12 bytes)
4. `supabase/functions/unsubscribe/_shared/rate_limit.ts` `@@ -0,0 +1,86 @@` (live v12 bytes)
5. `supabase/functions/unsubscribe/_shared/unsub_token.ts` `@@ -0,0 +1,57 @@` (live v12 + same change as 1; byte-identical to the lifecycle copy)
6. `supabase/functions/unsubscribe/source/index.ts` `@@ -0,0 +1,81 @@` (live v12 + 3 small hunks, below)
7. `supabase/functions/unsubscribe/source/token_path.ts` `@@ -0,0 +1,75 @@` (live v12 + 2 small hunks, below)
8. `supabase/functions/unsubscribe/test/lapsed-scope.test.ts` `@@ -0,0 +1,90 @@` (new test)
9. `supabase/functions/unsubscribe/test/token_path.test.ts` `@@ -0,0 +1,145 @@` (staged v9 tests, verbatim, sha 7f155b9ac6183893d06e0e10b76cf063f3fe4bc9b64c4c11e11c9aa0431d9c0d)

The unsubscribe function was not in the repo on 17c5c9f3; it is added here from the live v12 bytes in the same commit.

## What changed
- `UnsubScope` / `SCOPES` add only `lapsed`. This is the one live send kind that was not already a scope.
- New `SCOPE_SETTING` map: `retest`, `protocol` and `digest` still map to themselves. `lapsed` maps to `protocol` (the `email_reminders` / "Plan day reminders" toggle). Same mapping as b4e52f09 for lapsed, without check7 or check14.
- unsubscribe `index.ts`, the single changed write line: `.update({ [SCOPE_COLUMN[SCOPE_SETTING[scope]]]: false })` replaces `[SCOPE_COLUMN[scope]]`. The `all` branch and the v8 email-address path are byte-for-byte identical to live v12. `events.ts` and `rate_limit.ts` are byte-identical to live v12. `SCOPE_COLUMN` values are unchanged (`retest` → `retest_reminders`, `protocol` → `email_reminders`, `digest` → `weekly_digest`); only the TypeScript key type is `SettingScope`.
- lifecycle-emails: only the shared token module changed. handler/logic/email/index/score/deletion source are untouched (still live v2 / 17c5c9f3). The handler already signs with `scope = kind`, so a lapsed send now gets a working link instead of failing closed.
- **No DB change, no migration.** No new user-facing words. Renewal unsubscribe is not touched.

As built (Grant: keep the link doing what its cleared words say):
- The lapsed link ("Turn off plan day reminders") stops lapsed and protocol. Retest and digest still send.
- Existing scopes write the same columns as v12. `all` still sets `users.marketing_opt_out = true` and all three toggles false, and still blocks every live kind.

## Tests (run 10:28 PM ET on the committed tree)
- lifecycle-emails: **52 passed, 0 failed** (43 existing at 17c5c9f3 + 9 new in `test/lapsed-unsub-scope.test.ts`). Log: test-lifecycle-emails.txt
- unsubscribe: **24 passed, 0 failed** (17 staged v9 verbatim + 7 new in `test/lapsed-scope.test.ts`). Log: test-unsubscribe.txt
- New coverage:
  - a lapsed token signs and verifies
  - the real handler now sends lapsed with a working List-Unsubscribe header and footer link (this was `failed:1` / fail-closed before)
  - a lapsed one-click POST applies the lapsed scope; GET only redirects; a genuine token is not rate limited
  - after that write, lapsed and protocol stop in planKind and in the handler; retest and digest still send
  - `all` blocks every live kind, after any prior scope, and each half blocks alone (`marketing_opt_out` alone; the three toggles alone)
  - the existing four scopes: same writes and the same suppressed sets as v12, and the token payload format is identical
  - tampered tokens are rejected: re-scoped payload with the old signature, mangled signature, and properly signed payloads carrying unknown scopes (check21, check7, check14, LAPSED, "lapsed ", __proto__, an array, a missing scope, a bad uuid). All return 400 `invalid_token` and nothing is applied
  - with no signing secret, lapsed still fails closed
  - every live KIND is in SCOPES; check7 and check14 cannot be signed
- Mutation check against the old (live) files:
  - `deno test` of the new test files type-check fails (lapsed is not in UnsubScope; SCOPE_SETTING is not exported)
  - `--no-check` fails to load the new tests (`SCOPE_SETTING` is not exported)
  - isolated demo on the old token module + current handler: lapsed signs to null and the handler returns `{ sent: 0, already: 0, failed: 1 }` with no send; an existing scope (protocol) still sends. Log: mutation-fail-closed-demo.txt
- Stacy final-words test `lifecycle-emails/test/lifecycle.test.ts` is still blob **b0a99a55bcb9e7942105518eff01886033ddb821** (byte-identical).
- PGlite: none needed (no migration).
- Type check: `deno check --no-lock --node-modules-dir=none source/index.ts` is clean for both functions, branch and live/base. Run in a scratch copy with only the edge-runtime.d.ts import line removed (same harness issue as before: npm:openai types).

## Functions affected (would need redeploy; NOT deployed). Live read-only at 10:25 PM ET
| function | live version | live ezbr_sha256 | diff vs live (branch tree, tests excluded) | diff sha256 |
|---|---|---|---|---|
| unsubscribe | **v12** (updated Nov 3, 12:57:16 AM ET) | 97503ff4…0e86 | 3 files +15 -5: unsub_token.ts (`@@ -2,8 +2,15 @@`), index.ts (`@@ -1,4 +1,5 @@`, `@@ -6,6 +7,7 @@`, `@@ -44,7 +46,7 @@`), token_path.ts (`@@ -2,7 +2,7 @@`, `@@ -11,7 +11,8 @@`) | d2dcd112a445ab9d97a8166163157ca50679d41aea7a9f3b330c29d857f301fd |
| lifecycle-emails | **v2** (= 17c5c9f3, updated Nov 15, 10:04:28 PM ET) | aa79a1dc…5e96 | 1 file +9 -2: `_shared/unsub_token.ts` (`@@ -2,8 +2,15 @@`) | eca1ee399109582803d5563e0ba3953caa8032e79fc8094acf78693e13ba975b |

## Deploy order (when a line is granted; not tonight)
1. **unsubscribe first.** Rollback = the current live v12 source saved in `live-reads/unsubscribe-v12/` (ezbr 97503ff4…0e86).
2. **Then lifecycle-emails.** Rollback = the current live v2 source saved in `live-reads/lifecycle-emails-v2/` (byte-identical to 17c5c9f3, ezbr aa79a1dc…5e96).

A lifecycle-emails build that signs the new lapsed scope before unsubscribe accepts it would mail links that v12 rejects as `invalid_token`.

## Files in this folder
RECEIPT-LAPSED-UNSUB-STANDALONE-20261115.md, SHA256SUMS, commit.patch, diff-vs-live-lifecycle-emails-v2.diff, diff-vs-live-unsubscribe-v12.diff, test-lifecycle-emails.txt, test-unsubscribe.txt, mutation-fail-closed-demo.txt, live-reads/ (live function source read via get_edge_function)
