# SWITCH RECEIPT v4 (PREP / PLAN, NOTHING FLIPPED): P1-34 send switch, Supabase cqzvqzwwevnflinxgnpp

v4 replaces the v3 template plan (SWITCH-RECEIPT-TEMPLATE-SEND-FLIP-v3-20261116.md, sha256 a0f3bcf8301ad9026e1f9764b885de5eb256ccafa5242af41449fa0763761478). **v3 is left unchanged.** v1 and v2 are also unchanged. Written 8:28 PM ET Mon Nov 16 2026 by Avery's executor; updated 8:39 PM ET the same day (L1269 Step 1 shape, L1272 day-3 correction, r5b, P1-25 cron baseline, CLI token name). Times in ET. Never write a token, secret value, digest, or a user address here. Allowed addresses in this file and in the rendered-text attachment are only `hello@romrx.io` and the placeholder `user@example.com`.

**Decision (Grant option (b), Sable accepted; Step 1 shape per L1269, amending L1266):** no live data edits and no forced test sends. Step 1 keeps the send flags off, sets `LIFECYCLE_AUDIENCE=all`, and records `dry_run=1` selected counts, plus the no-send render below. Step 2, after Vera PASS of Step 1, turns the send flags on and applies the rombot-checkin cron. This receipt is BUILD only: nothing was set, invoked, inserted, updated, scheduled, or emailed while writing it.

## Approvals

Jim, L1031, verbatim:

> "Do all of them. Anything I need to do I'll do tomorrow. After velvet ops gets back do it."

Jim, L1229, verbatim (1:1 with Sable, 7:54 PM ET Nov 16):

> "I said go on all 31 things" and "Why do you treat me this way"

(The same minute, L1228, Jim also said, verbatim: "I said go so many times 😭".)

L1030 D2 is the question text only, not Jim's words:

> "Then turn on the follow-up emails, test accounts first, then every real user who taps yes? Yes or no."

Sable reads L1031 as answering D2 as written there. That reading is Sable's, not a paraphrase of Jim. The L1266 / L1269 conflict note against L1030 D2 stays OPEN: Step 1 does not send a real email to any test account, so the first real email of each type reaches a real opted-in user. That is Sable's ruling, not Jim's words.

Conditions that still stand (L1229): Vera reads the live text of every customer email before any send switch flips (this receipt's rendered-text section, to be matched to a955ebd0); each flip still needs its pinned bytes plus Vera's precheck and post-check under L881. Sable's standing OK (L1230) covers apply after a Vera precheck that passes on content, under Jim's 7:54 PM line.

## Gate (fill at flip time)

- Jules r5b combined client live (pin L1297; r5b replaces r3/r4 as the single client publish): tip `6c15dcaea719629f9a66cda709958b7dda26fdc7`, tag `frozen-20261116/combined-p1-18-18b-26-on-29eb4fa-r5b` (object `a752e040`). Deploy id ______, published ______ ET. Vera client post-check id ______ (PASS required first). This build does not publish r5b.
- This receipt pinned: sha256 ______ (this file). Vera PASS on v4: ______. Sable OK relayed by Grant at ______ ET.
- CLI token (name only, never the value): `romrx-cli-20261116`. Created by Sable through GitHub at 8:33 PM ET Nov 16. Jim, L1291, verbatim (relayed by Sable, 8:30 PM ET): "Supabase login is in vault." The CLI on the box is signed in under that token name. This build does not print, store, or set anything with it.

## Exact strings the live code expects

Live bytes = the deployed functions below (section "Deployed source"). `on` / `all` / `canary` are lowercase.

- `LIFECYCLE_EMAILS_SEND`: exactly `on`. lifecycle-emails `source/logic.ts:15` `flagOn(v) { return v === "on"; }`, used at `source/handler.ts:37`. rombot-checkin also needs it for its email fallback: `source/handler.ts:58`.
- `ROMBOT_CHECKIN_SEND`: exactly `on`. rombot-checkin `source/logic.ts:34` (flagOn), used at `source/handler.ts:57`.
- `QUICK_CHECK_ON`: exactly `on`. lifecycle-emails `source/logic.ts:16-18` `quickCheckOn(v) { return flagOn(v); }`, read at `source/handler.ts:49`. Not `true`, not `1`, not `On`.
- `LIFECYCLE_AUDIENCE`: Step 1 = exactly `all` (dry-run counts under the full audience; send flags stay off). Step 2 leaves it at `all`. lifecycle-emails `source/logic.ts:19-20` `audienceAll(v) { return v === "all"; }`, read at `source/handler.ts:38`; rombot-checkin `source/handler.ts:59` `d.env("LIFECYCLE_AUDIENCE") === "all"`.
- `LIFECYCLE_CANARY_USER_IDS`: the 28 ids in `CANARY-USER-IDS-20261116.txt` (sha256 567231f04e3bbd58282fce058367b8f75f3471cc3546c5b25b8da21ed56884d1), comma-separated. Ids only; no addresses in that file's UUID list. Set in Step 1 so a rollback to canary has the list. The Step 1 dry run uses `AUDIENCE=all`, not this list: under canary, the 28 fixtures would select 0 (no opt-ins; rombot skips is_test) and would not show the real audience counts.

## 7c71e421 (read-only context only)

Per L968 this is Jim's own test account. v4 only confirms, read-only, that it is **not** in the canary id list: none of the 28 UUID lines in `CANARY-USER-IDS-20261116.txt` starts with `7c71e421`. This receipt does not flag that account, does not add a code exclusion for it, and does not edit it.

Read-only context (8:26 PM ET, execute_sql SELECT, no email selected): explicit opt-ins for retest, protocol/lapsed, and digest are all **0** (the retest and email reminder toggles are true, the opt-in markers are null, weekly digest is false). Recorded as context only.

## Step 1 (after the token is in, after r5b is live and Vera post-checks it, after Vera PASS on this receipt)

Set only (L1269; Grant: send flags off, no cron send between Step 1 and Vera PASS):

1. `LIFECYCLE_EMAILS_SEND=off` (or leave unset / any value other than exactly `on`)
2. `ROMBOT_CHECKIN_SEND=off` (or leave unset / any value other than exactly `on`)
3. `LIFECYCLE_AUDIENCE=all`
4. `LIFECYCLE_CANARY_USER_IDS=` the 28 ids from the ids file (for rollback; not the Step 1 selection audience)
5. server `QUICK_CHECK_ON=on` (not a send flag; so the dry run can count Version A eligibility; expected 0)
6. Do **not** apply the rombot-checkin cron in Step 1. The already-scheduled lifecycle-emails-hourly job will keep running; with `LIFECYCLE_EMAILS_SEND` not `on`, `source/handler.ts:37, 52-56` returns the dry-run JSON and sends nothing.

Route: token name `romrx-cli-20261116` is already on the box (Sable, through GitHub, 8:33 PM ET; Jim L1291 "Supabase login is in vault."). Never echo, print, write, commit, or paste the value. Login check (exit code only): `supabase projects list >/dev/null 2>&1; echo $?` -> expect 0.

- Pre-step: `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` shows NAMES only. Record names only.
- Set command (values as above; ids from the file, not typed from memory): time ______ ET, exit ______.
- Cron applied: time ______ ET, live id ______, rename commit ______.
- Post-step: `secrets list` again, names only. Then `unset SUPABASE_ACCESS_TOKEN`.

### Dry-run of both handlers (Step 1 verification, not done in this build)

After the Step 1 sets (flags off, `AUDIENCE=all`), run both handlers with `dry_run=1` (cron secret required; this is a planned later invoke, not a send). Flags off alone already force the dry path (lifecycle `source/handler.ts:37` `sendOn = flagOn(...) && !dryParam`; rombot `source/handler.ts:57` `dry = !flagOn(ROMBOT_CHECKIN_SEND) || dry_run=1`). Record selected counts. **Expected (L1269): email opt-ins 0, check7 and check14 Version A eligible 0, day-3 notes 0, 0 due emails.** Then read `email_sends` before and after that dry run. **Expected: 24 both times.**

Live count now, read-only, no invoke: **email_sends = 24** at 8:24:21 PM ET and again at **8:27:52 PM ET** (after the local template render below). Newest `sent_at` still Oct 28 2026 12:11:27 PM ET. `lc-%` claims 0. `checkin-d3-%` claims 0.

`dry_run=1` does **not** render subject or body, and with 0 recipients it returns empty `due` arrays:

- lifecycle-emails `source/handler.ts:36-37, 52-56`: `dry_run=1` forces `sendOn` false. The JSON is `due: [{ email: maskEmail(...), email_id }]` and `skipped` counts only. `buildEmail` is not called (it is only on the send path at `source/handler.ts:67` after `sendOn` is true). If no one is due, `due` is `[]`.
- rombot-checkin `source/handler.ts:56-73`: `dry_run=1` or `ROMBOT_CHECKIN_SEND` not `on` returns `notes` as `{ branch, note_id, hour_source, tz_source }` and `emails` as `{ branch, email_id, email: maskEmail(...), note_age_hours }` only. No subject, body, or note text. `buildCheckinEmail` is only at `source/handler.ts:93` after `emailOn`. If no one is due, those arrays are empty.

## Rendered text (local, no send, no data edit)

Because `dry_run=1` does not return rendered text, v4 records the 7 lifecycle templates and the 8 check-in versions from a **local Deno render of the template functions**, with placeholder data (`user@example.com`, name Sam Example, Base brand only). Vera can match these subjects and bodies to a955ebd0 (`vera-email-text-review-lifecycle-v4-rombot-checkin-v1-20261116.md`, sha256 a955ebd0fe239d2ee051831e3a1f93fce3b7150353a9d1da07ae93870ba3d060). Example dates used where the templates take a date: lifecycle `Monday, December 28`; check-in Branch C `Monday, Dec 28`. Digest example: score 72, up 3, streak 2 days, 3 sessions this week, "Your next check is in 5 days." today_area for check-in: `hips`.

### No Resend, no email_sends write

The render script is `render-v4/render.ts` (sha256 329fe8dc141444ded8fa2f7abf9413264954427db754dbd4f8c81f3efd3496b0). It:

- Imports only `buildEmail` / `brandFor` (`source/email.ts`), `POSTAL_LINE` (`_shared/email_footer.ts`), `render` / `renderEmail` (`source/copy.ts`), `buildCheckinEmail` (`source/email.ts`), and `noteContent` / `APP_PATH` (`source/logic.ts`).
- **Does not import** `source/handler.ts` or `source/index.ts`.
- **Does not call** `handle()`, `d.send()`, `d.claim()`, `d.release()`, `d.load()`, or `fetch`.
- Replaces `globalThis.fetch` with a thrower, so a mistaken network call would fail closed.
- Therefore the Resend `fetch("https://api.resend.com/emails", ...)` in lifecycle `source/index.ts:93-99` and rombot `source/index.ts:127-133` is never reached, and the `email_sends` insert in `claim()` (lifecycle `source/index.ts:86-91`, rombot `source/index.ts:113-118`) is never reached.

Proof after the render (8:27:52 PM ET, read-only SQL): **email_sends is still 24**, newest still Oct 28 2026 12:11:27 PM ET, lifecycle and check-in claims still 0. Every rendered record has `resend_id: null` and `claimed_email_sends: false`. No Resend id appears in `render-v4/RENDERED-RAW.json` (sha256 6247dd1de44749bb7e85a686050bb80b958c9dfb7e50fc968ade12b88e9e544a) or in `render-v4/RENDERED-BASE-TEXT-20261116.md` (sha256 f2a48a234f1f1f545d9b5d5e340bd94b8a8821a3ffc2830730743ff3baccb936).

Full text also lives in that markdown file. The bodies follow.

### 7 lifecycle templates

Shared Base envelope (from the template functions, Base brand): From `ROMRx <hello@romrx.io>`, Reply-To `hello@romrx.io`, postal `ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774`, greeting `Hi Sam,`. Digest and lapsed have the line variants already listed in a955ebd0 section 4.3–4.4; one representative of each is rendered here.

#### retest
**Subject:** Time for your ROMRx retest
**Body (text):**
```
Hi Sam,

It has been about six weeks since your last ROMRx assessment. Your retest is ready whenever you are.

Start my retest: https://romrx.io/app/onboarding/assessment

You are getting this because Retest reminders is on in your settings. Turn off retest reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```
#### protocol
**Subject:** Today is a protocol day
**Body (text):**
```
Hi Sam,

Today is a protocol day on your ROMRx plan.

Open today's session: https://romrx.io/app/dashboard/my-protocol

You are getting this because Email reminders is on in your settings. Turn off protocol reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```
#### digest (score 72, up 3, streak 2, sessions 3, next check in 5 days)
**Subject:** Your ROMRx week
**Body (text):**
```
Hi Sam,

Here is your ROMRx week.
Body score: 72, up 3 since your previous assessment.
Current streak: 2 days.
Sessions this week: 3.
Your next check is in 5 days.

Open ROMRx: https://romrx.io/app/dashboard

You are getting this because Weekly progress digest is on in your settings. Turn off the weekly digest: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```
#### lapsed (with upcoming check date)
**Subject:** Your ROMRx plan is still here
**Body (text):**
```
Hi Sam,

We haven't seen you in a couple of weeks. Your plan is saved and ready.
You can start again with today's session.
Your next check: Monday, December 28

Open today's session: https://romrx.io/app/dashboard/my-protocol

Want fewer emails? Change your reminders in Settings: https://romrx.io/app/dashboard/settings

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### check7 Version A (with retest date)
**Subject:** Your ROMRx quick check is ready
**Body (text):**
```
Hi Sam,

It has been a week since your ROMRx assessment. Your quick check is ready.
It re-measures 1 or 2 of your focus areas and shows them next to your day 1 results.
Your full retest is still at 6 weeks, on Monday, December 28.

Start my quick check: https://romrx.io/app/dashboard/quick-check

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### check14 Version A (quick check not done, with retest date)
**Subject:** Your quick check is waiting
**Body (text):**
```
Hi Sam,

It has been two weeks since your ROMRx assessment. Your quick check is ready when you are.
It shows your day 1 results next to today's for 1 or 2 of your focus areas.
Your full retest is on Monday, December 28.

Start my quick check: https://romrx.io/app/dashboard/quick-check

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### check14 Version B (quick check done, with next check date)
**Subject:** Two weeks of ROMRx
**Body (text):**
```
Hi Sam,

You did your quick check. Nice work.
Your next check: Monday, December 28
Until then, your plan is ready each day in the app.

Open today's session: https://romrx.io/app/dashboard/my-protocol

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

### 8 check-in versions (email + matching in-app note)

Branches A / B / C, B at n=1 and n=2, named and no-name, as counted in a955ebd0. Base From / Reply-To / postal / sent-to as above. CTA path `/dashboard/my-protocol?src=checkin-d3`.

#### A named (0 sessions)
**Subject:** Your plan is ready, Sam
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
If something got in the way, tell me here and I'll help you find an easier way in.
```
**Email body (text):**
```
Hey Sam, ROMBot here. Your plan is ready whenever you are. Today's focus is your hips. It's short, and you can do it now. Want to start?

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### A no-name (0 sessions)
**Subject:** Your plan is ready
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Hey there, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
If something got in the way, tell me here and I'll help you find an easier way in.
```
**Email body (text):**
```
Hey there, ROMBot here. Your plan is ready whenever you are. Today's focus is your hips. It's short, and you can do it now. Want to start?

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### B n=1 named
**Subject:** 1 done. Two more for your week 1 goal
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Email body (text):**
```
ROMBot here.

Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### B n=1 no-name
**Subject:** 1 done. Two more for your week 1 goal
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Nice work. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Email body (text):**
```
ROMBot here.

Nice work. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### B n=2 named
**Subject:** 2 done. One more for your week 1 goal
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Nice work, Sam. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Email body (text):**
```
ROMBot here.

Nice work, Sam. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### B n=2 no-name
**Subject:** 2 done. One more for your week 1 goal
**In-app note button:** Start today's session
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Email body (text):**
```
ROMBot here.

Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### C named (n=3)
**Subject:** Strong start, Sam
**In-app note button:** See my plan
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
Sam, 3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.
If any move doesn't feel right, tell me here.
```
**Email body (text):**
```
ROMBot here.

Sam, 3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.

See my plan: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If any move doesn't feel right, open ROMBot and tell me.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```
#### C no-name (n=3)
**Subject:** Strong start
**In-app note button:** See my plan
**In-app path:** /dashboard/my-protocol?src=checkin-d3
**In-app note:**
```
3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.
If any move doesn't feel right, tell me here.
```
**Email body (text):**
```
ROMBot here.

3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.

See my plan: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If any move doesn't feel right, open ROMBot and tell me.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Deployed source: file-by-file sha256 match

Local render used `render-v4/src`, a copy of the 7:58 PM ET live extracts. `get_edge_function` sha256 values are from `live-source/*-meta.json`. This turn, `list_edge_functions` and `get_edge_function` on project `cqzvqzwwevnflinxgnpp` returned the same versions, ezbr values, and `updated_at` (lifecycle-emails v4 updated 7:29:36 PM ET; rombot-checkin v1 updated 7:35:14 PM ET). All 18 files MATCH. Both ezbr values MATCH. Full table: `render-v4/BYTE-MATCH-DEPLOYED-SOURCE-20261116.md` (sha256 e56b80d7aec6dcaef9c0140e85703619b96e03785bd87d8d29708b104d74a6bf).

ezbr:

- lifecycle-emails v4: `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41` MATCH
- rombot-checkin v1: `fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19` MATCH

| function | ver | file | get_edge_function sha256 | local render-v4/src sha256 | match |
|---|---|---|---|---|---|
| lifecycle-emails | v4 | `source/index.ts` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | `338fb541f43c3c6a7fd04ffea6abcdeb636d9b8fb67a4e1b89d7668fe026c049` | MATCH |
| lifecycle-emails | v4 | `source/handler.ts` | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | `008e19471fe0b601c41d8b6b68082d86d1e31dfc6b401d7e6988acf0b162fec1` | MATCH |
| lifecycle-emails | v4 | `source/logic.ts` | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | `eea59ae68054e0de05fef21007edce38a6d999970ce31841a9563eaeb2697733` | MATCH |
| lifecycle-emails | v4 | `source/email.ts` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | `a0f138d4b8181e673b5918442215b6bb3432a95e97caf66629c259ad86d1f7f2` | MATCH |
| lifecycle-emails | v4 | `source/score.ts` | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | `00510174f310f69c997e0c47476f0ea75985c86cf02f0c383c5640eee9caaa87` | MATCH |
| lifecycle-emails | v4 | `_shared/mobility/mobilityBands.ts` | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | `bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738` | MATCH |
| lifecycle-emails | v4 | `_shared/mobility/lumbarFlag.ts` | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | `d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c` | MATCH |
| lifecycle-emails | v4 | `_shared/email_footer.ts` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH |
| lifecycle-emails | v4 | `_shared/unsub_token.ts` | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | `96f0f2e3b9e123f632febe33d9911d8db95dbe014b09398dc46573fe1f1befd9` | MATCH |
| lifecycle-emails | v4 | `source/deletion.ts` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH |
| rombot-checkin | v1 | `source/index.ts` | `58b9a42531d4d69e123be5fa59b0b785f80aae93702ddd923964d61f399efa4b` | `58b9a42531d4d69e123be5fa59b0b785f80aae93702ddd923964d61f399efa4b` | MATCH |
| rombot-checkin | v1 | `source/handler.ts` | `b3546c05272882040108020aff6401fc4127ee08118fdd85cd8a12809f5eff39` | `b3546c05272882040108020aff6401fc4127ee08118fdd85cd8a12809f5eff39` | MATCH |
| rombot-checkin | v1 | `source/logic.ts` | `cd0a8d915a78664801e4b8c51e31c78a8442f333ea2834daea48870408830a0f` | `cd0a8d915a78664801e4b8c51e31c78a8442f333ea2834daea48870408830a0f` | MATCH |
| rombot-checkin | v1 | `source/copy.ts` | `58e445128654cf8a9c87cce179aed887ffe87ea43579848700ee1267809b110f` | `58e445128654cf8a9c87cce179aed887ffe87ea43579848700ee1267809b110f` | MATCH |
| rombot-checkin | v1 | `source/email.ts` | `a4bfb5df0786f5c37850e97208404005724e9b65de4b7ba5e7b289f5d54fee00` | `a4bfb5df0786f5c37850e97208404005724e9b65de4b7ba5e7b289f5d54fee00` | MATCH |
| rombot-checkin | v1 | `_shared/email_footer.ts` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | MATCH |
| rombot-checkin | v1 | `_shared/unsub_token.ts` | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | MATCH |
| rombot-checkin | v1 | `source/deletion.ts` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | MATCH |

## Step 2 (after Vera PASS of Step 1)

Set:

1. `LIFECYCLE_EMAILS_SEND=on`
2. `ROMBOT_CHECKIN_SEND=on`
3. Apply the rombot-checkin cron: `sql/CRON-rombot-checkin-NOT-APPLIED.sql` (sha256 fe460d6178de9955efe3c81475060ad42adf4f91b14ca9f640ee7257cf8625f7) via MCP apply_migration only, then a pure-rename commit. Schedule `30 * * * *`.

`LIFECYCLE_AUDIENCE` stays `all`. Emails still go only to people who opted in.

**Day-3 notes (L1272, corrects the L1248 / Grant 8:16 PM ET claim).** L1248 quoted Sable: "The in-app note to the 10 customers is P1-17 as built." Corrected: the 31-item spec has no backfill item. **0 notes go to the existing 10 Base-active customers on the flip.** Only new customers who later enter the local day-3 window after a first full assessment get the in-app note (P1-17 as built; the note needs no email opt-in). L1248 is left as written; this receipt carries the correction.

Fill at the time: flags and cron set ______ ET, secrets list after (names only) ______.

## First natural send (Vera reads as it happens)

Do not force a send. Vera reads the first natural send of each type as it happens: the `email_sends` row, the delivered text, and the first in-app check-in note. If anything is off, roll back right away (order below).

## Before / after snapshot (fill at flip time)

| Check | Time (ET) | Value |
|---|---|---|
| cron before (expected baseline) | after P1-25 server apply (evidence `c5a0cd67`) | **14 jobs**, md5 `0beb8bc4976fc129be2d26c88096c252`. Jobs 1-13 unchanged from the earlier 8:24:21 PM ET read (`a96d2036959f1dc2697d23e7665cb490`). Job 14 `purge-deleted-accounts-daily` `23 4 * * *`. Job 1 `send-renewal-reminders-daily` `0 12 * * *`, cmd md5 `caab15b0a3b771bccfd127f7c3db4df2`, active. No rombot-checkin job. |
| cron after Step 1 | | expect unchanged: 14 jobs, md5 `0beb8bc4` (rombot cron is not applied in Step 1), job 1 cmd md5 still `caab15b0` |
| cron after Step 2 | | expect rombot-checkin-hourly added (15 jobs), job 1 cmd md5 still `caab15b0`, jobs 1-14 otherwise unchanged |
| email_sends before Step 1 | 8:24:21 PM ET and 8:27:52 PM ET | **24**, newest Oct 28 2026 12:11:27 PM ET |
| dry_run=1 lifecycle after Step 1 | | expect due 0, audience all, send_enabled false, dry_run true, Version A eligible 0, no subject/body |
| dry_run=1 rombot-checkin after Step 1 | | expect notes 0, emails 0, audience all, dry_run true, no subject/body |
| email_sends after that dry run | | expect **24**, no Resend id, no new lc-% or checkin-d3-% claims |
| email_sends after first natural sends | | record each new row for Vera |

Snapshot SQL (read only): `sql/SNAPSHOT-PRE-AND-POST-FLIP-READONLY.sql` sha256 e90062dc3bf25f9bbc92a546cb0210b0367b2c7ff4f9e692d35f4f05a3e38d02.

## Rollback (if anything is off, do this right away), in this order

1. Flags off first: `ROMBOT_CHECKIN_SEND=off`, then `LIFECYCLE_EMAILS_SEND=off`. (This stops any send even while `AUDIENCE` is still `all`. The already-scheduled lifecycle-emails-hourly job then returns the dry-run JSON.)
2. `LIFECYCLE_AUDIENCE` back to `canary` (or empty / unset; anything but `all` is canary). `LIFECYCLE_CANARY_USER_IDS` may stay.
3. Cron rollback: `sql/CRON-rombot-checkin-ROLLBACK-NOT-APPLIED.sql` sha256 ae23fa8c1bccbad385194b75475d7f64562d343d0e7633cdd94a2ad45c131992 via MCP (`cron.unschedule('rombot-checkin-hourly')`). If Step 2 never applied the cron, skip this step.
4. `QUICK_CHECK_ON=off`.

After rollback: `secrets list` (names only) and the snapshot SQL again. Confirm cron md5 returns to the P1-25 baseline `0beb8bc4976fc129be2d26c88096c252` (14 jobs) and job 1 is untouched (cmd md5 `caab15b0a3b771bccfd127f7c3db4df2`). Claims and in-app notes already written stay.

**Cron job 1 (renewal) is untouched** by this receipt: not in the apply SQL, not in the rollback SQL, not in the secrets set. Expected pre-flip baseline after P1-25: job 1 still `send-renewal-reminders-daily`, `0 12 * * *`, cmd md5 `caab15b0`, cron fingerprint `0beb8bc4` (14 jobs). The 8:24:21 PM ET read was 13 jobs / `a96d2036`, before P1-25 added job 14. `RENEWAL_BASE_SEND` is not part of this switch.

## Must not change

| Name | Rule |
|---|---|
| RENEWAL_BASE_SEND | not set, unset, or changed by this receipt |
| renewal cron job 1 | untouched; confirm cmd md5 `caab15b0` and overall cron md5 after any cron apply/rollback |
| every other listed secret name | same names except the ones this receipt sets |

## QUICK_CHECK_ON=on in Step 1

With the server flag on, check7 and check14 Version A become eligible (`source/logic.ts:311-314`) for users who also have the Check reminders opt-in and are in the local day window. Version A links to `/dashboard/quick-check`, so this flag waits until r5b (with the quick-check screen on) is live and Vera has post-checked it. Version B still sends with the flag off. At prep time, customer Check-reminders opt-ins and day 7 / day 14 windows were 0. Expected Step 1 dry-run count for Version A: 0.

## Not done in this build

No secret set, no function invoke (including no `dry_run=1` invoke), no insert or update, no email, no cron apply, no change to job 1, no token printed or stored, no live data edit, no forced test send. The CLI is signed in under the token name `romrx-cli-20261116`; this build did not set secrets or invoke functions with it. v3 template not overwritten.

## Held back from git

See `HELD-BACK-FROM-GIT-PREP.md`. Hashed in SHA256SUMS-PREP-v4 and held back from this commit: `CANARY-READONLY-20261116.md` (sha256 69872749c693e8eeac0cfdb8db354820e1f2829fbc96b82be1796948a91d9655), `render-v4/RENDERED-RAW.json` (sha256 6247dd1de44749bb7e85a686050bb80b958c9dfb7e50fc968ade12b88e9e544a; JSON-escaped newlines next to hello@ would trip a naive address grep; the committed markdown has the same text), and `render-v4/src/` (lifecycle `source/email.ts` contains pack sender addresses other than hello@ / reid@ / user@example.com). The deployed-byte proof is the sha table above, which does not need those file bodies in git.
