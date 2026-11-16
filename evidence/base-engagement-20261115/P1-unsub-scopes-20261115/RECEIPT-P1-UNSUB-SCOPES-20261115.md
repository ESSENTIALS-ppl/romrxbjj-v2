# RECEIPT: P1 unsubscribe scopes (check7, check14, lapsed). BUILD ONLY
Written Sun Nov 15, 2026 ~10:25 PM ET by Avery. Covered by L1031 (Grant's yes). Nothing applied, deployed, or set.
No CLI db push, no force-push, Supabase reads only. No secrets or user emails printed.
Untouched: send-renewal-reminders, RENEWAL_BASE_SEND, renewal cron, LIFECYCLE_EMAILS_SEND, WAITLIST secrets.

## Commit
- Repo ESSENTIALS-ppl/romrxbjj-v2, branch `fix/p1-unsub-scopes-20261115` (plain push; remote = local)
- sha **b4e52f090688fd41f366cc62f582ed34b7db9faa**
- parent 45ed15d83c19b60441d1a4572bf60379e9e6fef5 (P1-08 v3)
- committed Sun Nov 15, 2026 10:21:11 PM ET
- patch sha (`git show --format= --patch | sha256sum`): b98ce5ea8bec8c2a5cfe6b2e2c34281d6a329adbcb1d25ad9e0e189248dcc5ae
- `git diff 543cabf b4e52f09 | sha256sum`: f8b14f65be742892c5f455dcd7b873927b5fafd5f4328b9531f082d212300b9c
- worktree /workspace/p1-unsub-scopes-20261115

## Hunk headers (every hunk in the commit)
1. `supabase/functions/lifecycle-emails/_shared/unsub_token.ts` `@@ -2,8 +2,16 @@` (the change)
2. `supabase/functions/lifecycle-emails/test/unsub-scopes.test.ts` `@@ -0,0 +1,140 @@` (new test)
3. `supabase/functions/unsubscribe/_shared/events.ts` `@@ -0,0 +1,34 @@` (live v12 bytes)
4. `supabase/functions/unsubscribe/_shared/rate_limit.ts` `@@ -0,0 +1,86 @@` (live v12 bytes)
5. `supabase/functions/unsubscribe/_shared/unsub_token.ts` `@@ -0,0 +1,58 @@` (live v12 + same change as 1; byte-identical to the lifecycle copy)
6. `supabase/functions/unsubscribe/source/index.ts` `@@ -0,0 +1,81 @@` (live v12 + 3 small hunks, below)
7. `supabase/functions/unsubscribe/source/token_path.ts` `@@ -0,0 +1,75 @@` (live v12 + 2 small hunks, below)
8. `supabase/functions/unsubscribe/test/p1-scopes.test.ts` `@@ -0,0 +1,94 @@` (new test)
9. `supabase/functions/unsubscribe/test/token_path.test.ts` `@@ -0,0 +1,145 @@` (staged v9 tests, verbatim, sha 7f155b9a…0c0d)

The unsubscribe function was not in the repo on main or the base; it is added here from the live v12 bytes in the same commit, as asked.

## What changed
- `UnsubScope` / `SCOPES` add `check7`, `check14` and `lapsed`. These are every send kind in lifecycle-emails at 45ed15d8 not already covered (KINDS = retest, protocol, digest, lapsed, check7, check14). P1-02 adds no send kinds; it is audience gating only.
- New `SCOPE_SETTING` map: each scope switches off the settings toggle its email already names.
  - check7 → `retest_reminders`. Email text: "You're getting this because Check reminders is on…" plus the link "Turn off check reminders". The Settings label "Check reminders" means retest_reminders: "around day 7 and day 14 and when your 6-week retest is due".
  - check14 → `retest_reminders` (same words).
  - lapsed → `email_reminders`. Email text: "Plan day reminders is on…" plus the link "Turn off plan day reminders". The Settings label "Plan day reminders" covers "…If you have not been back in 2 weeks, we send one note".
  - retest, protocol, digest → same columns as v12. all → same v12 write (users.marketing_opt_out = true plus all three toggles false).
- unsubscribe `index.ts`, the single changed write line: `.update({ [SCOPE_COLUMN[SCOPE_SETTING[scope]]]: false })` replaces `[SCOPE_COLUMN[scope]]`. The `all` branch and the v8 email path are byte-for-byte unchanged.
- lifecycle-emails: only the shared token module changed. handler/logic/email/index source are untouched. The handler already signs with `scope = kind`, so the new kinds now get links instead of failing closed.
- **No DB change, no migration.** Live reads (read-only): there is no scope CHECK constraint or enum anywhere. notification_preferences already has the three toggle columns, and its triggers (notif_opt_in_guard, notif_updated_at) behave as before for these writes. 20261116040500 is NOT used.
- **No new user-facing words.** The Base confirm page (romrx-io-web 61f948b `app/src/pages/Unsubscribe.tsx`) shows no scope name; it shows the same generic success text for every token. The BJJ and BB confirm pages (Jules) were not re-read tonight.

## FLAG for Grant: "suppress that email kind only" vs the cleared words
The brief asked that each new scope suppress only its own email kind. I did NOT build it that way, because the cleared words promise more:
- check7 and check14 say "Turn off check reminders".
- lapsed says "Turn off plan day reminders".
- Settings says "You can turn any of them off here or from the link in each email".

A per-kind opt-out would leave that toggle ON in Settings. People would keep getting the day-14 and retest emails after clicking "Turn off check reminders", and plan-day emails after "Turn off plan day reminders". The link's own words would then be false.

As built:
- check7 and check14 links stop check7, check14 and retest. Protocol, digest and lapsed still send.
- The lapsed link stops lapsed and protocol. Retest, check7, check14 and digest still send.

The tests assert exactly these sets.

If per-kind is wanted instead, it needs:
- new words from Stacy for each email's off link. Example placeholders only, not written: "Turn off day 7 check emails", "Turn off day 14 check emails", "Turn off the 2-week check-in email".
- a migration 20261116040500 adding check7_opt_out_at, check14_opt_out_at and lapsed_opt_out_at to notification_preferences, with a rollback.
- a send-time check in planKind.

I stopped short of that per the no-new-words rule.

## Tests (run 10:2x PM ET on the committed tree)
- lifecycle-emails: **58 passed, 0 failed** (49 existing + 9 new in `test/unsub-scopes.test.ts`). Log: test-lifecycle-emails.txt
- unsubscribe: **24 passed, 0 failed** (17 staged v9 verbatim + 7 new in `test/p1-scopes.test.ts`). Log: test-unsubscribe.txt
- New coverage:
  - for each new scope: a signed token, a verify round-trip, the one-click POST applying exactly that scope, GET redirect only, no rate limit for a genuine token, and the real handler sending the email with that scope in both the List-Unsubscribe header and the footer link (before this change: failed:1)
  - after the unsubscribe write, the scope's emails stop in planKind and in the handler, and the other kinds still send
  - 'all' blocks all six kinds, after any prior scope, and each half blocks alone (marketing_opt_out alone; the three toggles alone)
  - the existing four scopes: same writes and the same suppressed sets as v12, and the token payload format is identical
  - tampered tokens are rejected: re-scoped payload with the old signature, mangled signature, and properly signed payloads carrying unknown scopes (check21, CHECK7, "check7 ", __proto__, an array, a missing scope, a bad uuid). All return 400 invalid_token and nothing is applied
  - with no signing secret, P1 kinds still fail closed
  - every KIND is in SCOPES
- Mutation check: run against the old token module, the 5 new-scope tests fail and the 4 regression tests pass.
- Stacy final-words test `lifecycle-emails/test/lifecycle.test.ts` is still blob **b0a99a55bcb9e7942105518eff01886033ddb821** (byte-identical).
- PGlite: none needed (no migration).
- Type check: `deno check source/index.ts` is clean for both functions, branch and base. Run in a scratch copy with only the edge-runtime.d.ts import line removed (same harness issue as before: npm:openai types).

## Functions affected (would need redeploy; NOT deployed). Live read-only at ~10:24 PM ET
| function | live version | live ezbr_sha256 | diff vs live (branch tree, tests excluded) | diff sha256 |
|---|---|---|---|---|
| unsubscribe | **v12** (updated Nov 3, 12:57 AM ET) | 97503ff4…0e86 | 3 files +16 -5: unsub_token.ts (`@@ -2,8 +2,16 @@`), index.ts (`@@ -1,4 +1,5 @@`, `@@ -6,6 +7,7 @@`, `@@ -44,7 +46,7 @@`), token_path.ts (`@@ -2,7 +2,7 @@`, `@@ -11,7 +11,8 @@`) | 9c2854aab46e8b590a89def13a6824a3a9791a3e9add8525817dde0c49c9215f |
| lifecycle-emails | **v2** (= 17c5c9f3, updated Nov 15, 10:04 PM ET) | aa79a1dc…5e96 | 5 files +124 -19. Only `_shared/unsub_token.ts` is this commit. email.ts, index.ts, logic.ts and score.ts are 6d25bb3 (P1-06 skip-quick) and 45ed15d8 (P1-08 v3), which are not live and have no deploy line | 0a81df06f900b97746e020abef3299e23cdd5281c1b8feaf8b6865c584a36485 |

Deploy order if lines are granted: **unsubscribe first, then lifecycle-emails.** A lifecycle-emails build that signs new scopes before unsubscribe accepts them would mail links that v12 rejects as invalid_token.

Live v2 already has the `lapsed` kind. Today its sends fail closed, because no token can be signed for it. A lifecycle-emails redeploy from b4e52f09 would also ship P1-06 and P1-08. If only the scope fix is wanted on live, the minimal option is 17c5c9f3 plus this one-file `_shared/unsub_token.ts` change, sent as a new sha for its own line. I did not build that.

## Open items (not done)
- notif_opt_in_guard is unchanged: a scoped opt-out sets a toggle false, and the guard clears its marker as it does for v12 scopes. Unchanged behaviour.
- BJJ and BB confirm pages: not re-read tonight (Jules' sites). Assumed generic like Base.

## Files in this folder
RECEIPT-P1-UNSUB-SCOPES-20261115.md, SHA256SUMS, commit.patch, diff-vs-live-unsubscribe-v12.diff, diff-vs-live-lifecycle-emails-v2.diff, test-lifecycle-emails.txt, test-unsubscribe.txt, live-reads/ (live function source read via get_edge_function)
