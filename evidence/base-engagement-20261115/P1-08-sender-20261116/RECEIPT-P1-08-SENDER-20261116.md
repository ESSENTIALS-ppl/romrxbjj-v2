# RECEIPT: P1-08 sender change, Base lifecycle emails From "ROMRx <hello@romrx.io>". BUILD ONLY.

Written Mon Nov 16, 2026, about 9:03 AM ET by Avery. Not deployed, nothing applied, no Supabase writes. HELD: needs Jim's sender yes, which comes with his renewal-text OK (ledger L1132(a), L1134). Needs Margot's sha line, Vera's precheck and Sable's OK before any deploy.

## Commit
- **sha `b19b13dca82a3c2eb34a641aa5ca79e410090c00`**
- **parent `8c9f9120af23be31ab890f922122979ce5ad2d3f`** (P1-08 v4 tz, the lifecycle stack tip)
- **patch sha256 (`git show --format= --patch`) `13866d62e431813918c4a490e0741170d4215f480bb00f957588d129aa153612`**
- Branch `feat/p1-08-sender-romrx-20261116`, plain-pushed. Remote tip = b19b13dc. Worktree /workspace/p1-08-sender-romrx-20261116, created from origin/feat/p1-08-v4-20261115.

## Stacy citation (sender / Reply-To)
- `/workspace/process/evidence/STACY-P1-08-WORDS-20261115-2055.md` sha256 `ce23c9fa9b1c4f08892d4855f40468262b3bb50c809bf86a218568c26c1b4991`, lines 10-12: "Shared sender and footer (both emails) / From: ROMRx <hello@romrx.io> / Reply-To: hello@romrx.io". Line 17 footer: "hello@romrx.io". Line 65: "Sender: lifecycle-emails Base brand today sends as [the BJJ address] (email.ts). These words assume ROMRx <hello@romrx.io>, matching the Base renewal fix."
- `/workspace/process/evidence/STACY-P1-16-WORDS-20261115-2055.md` sha256 `e1e0a602c3451df96363fe816c298d074b5ec5f7664d1efa636557f0c71504da`, lines 10-11: "From: ROMRx <hello@romrx.io> / Reply-To: hello@romrx.io". Line 28 footer: "hello@romrx.io".
- `/workspace/process/evidence/STACY-P1-01-WORDS-20261115-2053.md` sha256 `5b6778b6f391ed38c2d51d91041c3a113966f10a26bb2172e462aeb01ea1b84a`, line 94: "Suggest one Base sender, ROMRx <hello@romrx.io>, so Base users don't get a BJJ address."
- Result: Stacy's Reply-To is hello@romrx.io, the same as the brief. Nothing differs, so I followed it as written.

## Scope decision (flag for Grant)
- The new sender applies to **every email kind a Base user gets**: retest, protocol, digest, lapsed, check7 and check14. Those six are all of the function's KINDS, and every one takes From and Reply-To from `brandFor(active_sport)`.
- **BJJ and Bodybuilding users keep their sport-pack senders** (BRANDS.bjj and BRANDS.bodybuilding are unchanged). Stacy's words cover the Base brand only (P1-01 line 94, P1-08 line 65), and the earlier P1-02 receipt kept the sport-pack senders the same way. If Grant wants every brand on ROMRx, that's a two-line follow-up with its own words check.
- **Visible side effect:** the Base HTML footer contact link (`mailto:${brand.replyTo}`) and the "sent to" footer text now show hello@romrx.io. That matches Stacy's footer line. Subjects and body words are unchanged.

## Every hunk vs 8c9f9120 (`diffs/b19b13dc-vs-8c9f9120.diff` sha256 = the patch 13866d62…, 5 files +94/-13)
Function source (`diffs/b19b13dc-vs-8c9f9120-function-only.diff` sha256 `1af3100d3ba8b6d4ad6478ba88ab640dfbee22336d1815da1e64ed462e42e072`, 2 files +5/-3):
1. `source/email.ts @@ -4,12 +4,14 @@`:
   - adds a doc comment and `export const ROMRX_SENDER = { from: "ROMRx <hello@romrx.io>", replyTo: "hello@romrx.io" } as const;`
   - replaces the Base comment line ("Base sender = the same From send-renewal-reminders v6 uses…") with "Base sender (P1-08): ROMRX_SENDER, per Stacy's cleared P1-08 and P1-16 words…"
   - the `base:` brand line changes only `from` and `replyTo`, which were the BJJ address and are now `ROMRX_SENDER.from` / `ROMRX_SENDER.replyTo`. key, name, appBase and settingsPath are unchanged. The bjj and bodybuilding lines are unchanged context.
2. `source/index.ts @@ -1,4 +1,4 @@`: header comment only. "Base From left as live ([BJJ address]). No P1-02 audience/sender rewrite." becomes "Base From/Reply-To = ROMRX_SENDER (ROMRx <hello@romrx.io>, P1-08). No P1-02 audience rewrite."

Tests:
3. `test/day7-day14.test.ts @@ -79,7 +79,7 @@`: the d7 text now contains "hello@romrx.io" (was the BJJ address). `@@ -102,5 +102,5 @@`: BRANDS.base.from is now "ROMRx <hello@romrx.io>".
4. `test/lifecycle.test.ts @@ -245,11 +245,11 @@`: the Base sender test is renamed and asserts base.from, base.replyTo, brandFor(null).from and brandFor(undefined).replyTo are the new sender. The bjj and bodybuilding assertions are unchanged. `@@ -301,11 +301,11 @@`: the lapsed footer text has hello@romrx.io, and base.from is the new sender. `@@ -331,7 +331,7 @@`: base.from is the new sender.
5. `test/sender-romrx.test.ts @@ -0,0 +1,79 @@` (new): 15 tests. It checks the constant; that the six KINDS are all kinds; and for each kind × {null, "general"} through the real handler send path: From, Reply-To and To; List-Unsubscribe shape (POST endpoint, signed token for that kind, b=base); List-Unsubscribe-Post one-click; footer mailto; and no sport-pack domain. It also checks that bjj and bodybuilding are unchanged.

Not touched (`git diff --stat 8c9f9120 b19b13dc -- supabase/functions/unsubscribe supabase/functions/send-renewal-reminders` is empty): unsubscribe, the renewal code, handler.ts (List-Unsubscribe construction), logic.ts, _shared/unsub_token.ts, subjects and body words.

## Diff vs live
- **vs live lifecycle-emails v2** (aa79a1dc, saved `deploy-prep-20261116/live-reads-20261116/lifecycle-emails-v2`): `diffs/b19b13dc-lifecycle-emails-vs-live-v2.diff` sha256 **`1253bc6f13791ab81e7bfb36f0bf3c7f0b4843ad996f12b225bd4845481e21d1`**, **5 files changed, 139 insertions(+), 25 deletions(-)**. That is 8c9f9120's v2 diff (6dcbf57f content, +135/-23) plus the two source hunks above.
- **NOTE: live is no longer v2.** lifecycle-emails is now **v3** (ezbr d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e, deployed Mon Nov 16, 2026 8:58:53 AM ET; byte-identical to the e5488088 staged files, per L1133). So I also cut it against current live: `diffs/b19b13dc-lifecycle-emails-vs-live-v3.diff` sha256 `5d7a3da63bc38168f369ca7bae91de02077a4e7c97efc16bfe1fb2cc46a4a934`, 5 files changed, +135/-28. The v3 read is saved in `live-read/lifecycle-emails-v3` (meta.json).
- Deploy files: 10, the same names as live (`staged/b19b13dc-lifecycle-emails/`). Entrypoint source/index.ts, verify_jwt false (explicit). Unsubscribe must go from the 8c9f9120 tree first (b19b13dc's unsubscribe tree is identical to it).

## Tests (Mon Nov 16, 2026, about 9:00 to 9:02 AM ET)
- lifecycle-emails suites at b19b13dc: **76 passed, 0 failed** (8c9f9120: 61/61, plus 15 new). `tests/lifecycle-suites.txt`
- unsubscribe suites at b19b13dc: **24 passed, 0 failed**. `tests/unsubscribe-suites.txt`
- e5488088 cross-check against b19b13dc: **4 passed, 0 failed**. `tests/x-compat-e5488088-in-b19b13dc.test.ts` and `tests/x-compat-run-final.txt` (`tests/x-compat-run.txt` is the first identical run, before a title-only fix)
- deno check lifecycle-emails/source/index.ts and unsubscribe/source/index.ts: clean. `tests/deno-check.txt`

## Header samples
`HEADER-SAMPLES-P1-08-SENDER-20261116.md`, rendered with `render-headers.ts` through the real handler at b19b13dc. Fake recipient user@example.com, tokens redacted. All six kinds show From "ROMRx <hello@romrx.io>" and Reply-To "hello@romrx.io", with unchanged List-Unsubscribe (…/functions/v1/unsubscribe?t=<REDACTED-TOKEN>&b=base) and List-Unsubscribe-Post one-click.

## Rollback (when it is ever deployed)
Redeploy the live version that came before (today v3 = e5488088, `live-read/lifecycle-emails-v3`, ezbr d68e443b…), entrypoint source/index.ts, verify_jwt false.
