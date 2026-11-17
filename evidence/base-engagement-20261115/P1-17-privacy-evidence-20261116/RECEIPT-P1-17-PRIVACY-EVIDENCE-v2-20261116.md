# RECEIPT v2: P1-17 privacy evidence, branches A, B and C

Written Mon Nov 16, 2026, 7:19 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp.

This addendum covers Branches A, B (1 session and 2 sessions) and C (3 sessions). It does not replace receipt v1 (`RECEIPT-P1-17-PRIVACY-EVIDENCE-20261116.md`, sha256 `b9472441e1f1bcbb7a6b5ad520f75decb3686692378e64d426933cfa5c2b1fd3`), which was left untouched.

**Label:** local dry run of the exact rombot-checkin bytes at `11803fee4157f23435d0b97e6aaa08eddb020565`. Not a live capture. Live ai-chat request: **NOT TESTED**. Real Resend send: **NOT TESTED**.

- `ROMBOT_CHECKIN_SEND` stayed unset (dry). `LIFECYCLE_EMAILS_SEND` unset. No env or secret changes, no deploy, no live writes.
- Synthetic accounts only, email `user@example.com`. Account `7c71e421` was not used. Fixture `076ce453` was not used. No real customer was used.
- Same method as v1: `handle()` was invoked dry (plan only). The would-write note row and would-build Resend body were produced from the same `plan()` / `planEmails()` objects via `noteFor()` and `buildCheckinEmail()`, shaped as `index.ts` lines 129–132 would POST to Resend. `send()` / `fetch` were not called.

Privacy v4 used for the wording comparison: `/workspace/process/evidence/STACY-P1-17-PRIVACY-LINE-v4-20261116-1916.md`, sha256 `263a70179f2b86b84f875d9888cabfe0b4165e81eff5abdfedb6780724d597a6`, written 7:16 PM ET. This receipt compares the check-in note and email against **Edit 1** (section 1, "ROMBot chats"). Edit 2 (section 3 / OpenAI) was worded from receipt v1 and was not re-run here.

---

## Fixtures

All accounts: name Sam Lee, email `user@example.com`, Base, assessed Fri Nov 13, 2026, 9:00 AM ET, reminder 07:00 ET, next check Fri Nov 20, 2026, 9:00 AM ET (`2026-11-20T14:00:00Z`). `is_test` was false so the common gate would not skip them as `test_account` (the email is still the synthetic `user@example.com`).

| Case | user_id (synthetic) | Sessions after the assessment | Branch |
|---|---|---|---|
| A, n=0 | `11111111-1111-4111-8111-111111111111` | none | A |
| B, n=1 | `22222222-2222-4222-8222-222222222221` | 1 (Nov 14) | B |
| B, n=2 | `22222222-2222-4222-8222-222222222222` | 2 (Nov 14 and 15) | B |
| C, n=3 | `33333333-3333-4333-8333-333333333333` | 3 (Nov 14 and two on Nov 15, all more than 12 hours before the note window) | C |

Each case had two dry `handle()` runs: the note phase at Mon Nov 16, 2026, 7:30 AM ET, and the email phase at Tue Nov 17, 2026, 8:30 AM ET (25 hours after the note, no activity since). A note and its email never go in the same run.

---

## Per-branch note text and Resend payload

From / To / Reply-To were the same in every email: From `ROMRx <hello@romrx.io>`, To `user@example.com`, Reply-To `hello@romrx.io`. Full payloads are in `artifacts/p1-17-v2-*-note-row.json` and `artifacts/p1-17-v2-*-resend-payload.json`.

### Branch A (0 sessions)

Note (`context_snapshot`: kind `checkin_d3`, branch `A`, assessment_id, button "Start today's session" / `/dashboard/my-protocol?src=checkin-d3`):

> Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
> If something got in the way, tell me here and I'll help you find an easier way in.

Email subject: `Your plan is ready, Sam`

> Hey Sam, ROMBot here. Your plan is ready whenever you are. Today's focus is your shoulders. It's short, and you can do it now. Want to start?
>
> Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3
>
> If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.

Matches Stacy 9d8fe291 item 3, as in receipt v1. `{today_area}` on the email day is shoulders, not the Monday note's hips.

### Branch B, 1 session

Note (`context_snapshot`: kind `checkin_d3`, branch `B`, assessment_id, same button as A):

> Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
> Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.

Email subject: `1 done. Two more for your week 1 goal`

Opens with `ROMBot here.` then:

> Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your shoulders.
>
> Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3
>
> Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

Last line matches 9d8fe291 item 4 (Branch B). Line 1 and button stay BRANCH_COPY, with `{today_area}` on the send day.

### Branch B, 2 sessions

Note (`context_snapshot`: kind `checkin_d3`, branch `B`, assessment_id, same button):

> Nice work, Sam. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
> Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.

Email subject: `2 done. One more for your week 1 goal`

Same shape as B n=1, with "2 sessions" / "One more" and today's focus on the email day = shoulders. Last line again matches 9d8fe291 item 4 (Branch B).

### Branch C, 3 sessions

Note (`context_snapshot`: kind `checkin_d3`, branch `C`, assessment_id, button **"See my plan"** / `/dashboard/my-protocol?src=checkin-d3`):

> Sam, 3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Friday, Nov 20. That's when you measure again and see where you are.
> If any move doesn't feel right, tell me here.

Email subject: `Strong start, Sam`

Opens with `ROMBot here.` then the same first line (including Friday, Nov 20), button "See my plan", and last line:

> If any move doesn't feel right, open ROMBot and tell me.

Last line matches 9d8fe291 item 4 (Branch C). **Today's focus area does not appear in the Branch C note or email text.** The code still requires a nameable `{today_area}` or it returns `no_plan` and writes nothing (`logic.ts` `renderFor`, lines 195–196), but the C templates have no `{today_area}` placeholder.

---

## Field-use table

What the **written** note text and Resend subject/body actually contain. "Gate only" means the code requires the field to build a message, but does not interpolate it into the text.

`{today_area}` is taken from the user's ranked plan list on the local weekday of that run (note day vs email send day). `{n}` is the count of `sessions_since` at or after the assessment. `{remaining}` is derived from `{n}` (n=1 → "Two", n=2 → "One"). `{next_check_date}` is `user_mobility_schedule.next_check_at` formatted in the user's timezone (`shortDate`: weekday, month, day).

| Field | A note | A email | B note (n=1) | B email (n=1) | B note (n=2) | B email (n=2) | C note | C email |
|---|---|---|---|---|---|---|---|---|
| First name | Yes (Sam) | Yes (subject + body) | Yes | Yes (body; not in the subject) | Yes | Yes (body; not in the subject) | Yes | Yes (subject + body) |
| Days since the assessment (a number) | Yes, but **hardcoded** "It's been 3 days…" — not a computed duration | **No** (removed in 9d8fe291 item 3) | **No** | **No** | **No** | **No** | **No** | **No** |
| "since your assessment" (no number) | Yes (in the 3-day sentence) | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Today's focus area | Yes — hips | Yes — shoulders (send day) | Yes — hips | Yes — shoulders | Yes — hips | Yes — shoulders | **Gate only, not in the text** | **Gate only, not in the text** |
| Session count since the assessment | **No** | **No** | Yes — 1 session | Yes — body and subject ("1 done") | Yes — 2 sessions | Yes — body and subject ("2 done") | Yes — 3 sessions | Yes — 3 sessions |
| Next check date | No | No | No | No | No | No | Yes — Friday, Nov 20 | Yes — Friday, Nov 20 |
| Email address | No | Yes (`to` + footer) | No | Yes | No | Yes | No | Yes |

**Anything else the code uses in the written note or email:**

- Branch B only: `{remaining}` ("Two more" / "One more") and the fixed phrase "week 1 goal of 3 sessions" (derived from the session count; also in the B subject).
- All notes: last-line in-app copy ("tell me here" or Branch B's "Tell me and I'll…"); button label and path in `context_snapshot` (A/B "Start today's session", C "See my plan").
- All notes, stored but not shown as message text: `context_snapshot.kind` (`checkin_d3`), `branch`, and `assessment_id`; conversation `sport=base`, `provider=rombot` (no title).
- All emails: lifecycle footer (Plan day reminders / opt-out links), postal line, `hello@romrx.io`, "This message was sent to {email}." B and C also open with "ROMBot here." (A does not, because A's first line already says it).
- Eligibility only (not in the text): local day-3 calendar gate, send-hour window, reminder time, timezone (also used to format the next check date), opt-in / marketing / activity-since-note gates for the email, and the Branch C "no session in the last 12 hours" skip.

---

## Compare against privacy v4 Edit 1

v4 Edit 1 says the note "uses only your own data: your first name, how long it has been since your assessment, today's focus area from your plan, how many sessions you have logged since then and, if you have done 3 or more, your next check date." It also says the follow-up email "goes to your email address and uses the same kind of data."

**Code uses, in the written note or email, something v4 does not name:**

1. Branch B `{remaining}` ("Two more" / "One more") and "week 1 goal of 3 sessions." These are derived from the session count, but v4 does not name the remaining-count or the week-1 goal.
2. `assessment_id` (and `kind` / `branch`) stored on the note's `context_snapshot`. These are identifiers, not shown in the message text.
3. Nothing else that is a personal data field in the written copy, beyond the list above. Button labels, footer, and postal lines are chrome, not extra profile fields.

**v4 names something the written note or email does not use in every branch:**

1. "How long it has been since your assessment." Only the Branch A **note** states a duration, and it is the fixed phrase "It's been 3 days," not a computed number of days. The Branch A **email** and all B and C notes and emails do not include a day count. B and C only say "since your assessment." The scheduler does use local calendar day 3 as a gate for every note, but that duration is not rendered except in the A note.
2. "Today's focus area from your plan." Used in A and B text. **Not used in the Branch C note or email text** (gate only). If v4 is read as a description of every note, C does not match.
3. "How many sessions you have logged since then." Used in B and C. **Not used in the Branch A note or email** (0 sessions, and the A copy has no count). v4 already expected this from receipt v1 and kept the session count because B and C use it; at the feature level that is consistent, but A does not use it in the written text.
4. "Uses the same kind of data" for the email is not exact. The A email drops the day count and does not use session count or next check date. The C email does not include today's focus area. Each email uses a subset of the listed fields, plus the recipient email address (which v4 does name).

No v4 item was unused by the feature as a whole: first name, a day-3 timing (A note text + every note's gate), today's focus area (A/B text; C gate), session count (B/C), next check date (C), and the email address on the email, are all used somewhere.

---

## Proof nothing was sent

| Check | Result |
|---|---|
| Resend fetches recorded by the mock | **0** (all four cases, both phases) |
| Local `email_sends` count before | **0** |
| Local `email_sends` count after | **0** (delta 0) |
| `claim` / `insertNote` / `send` calls | **0** in every run |
| Live `public.email_sends` (read-only, no user ids or emails) before | total **24**, rows with `sent_at` since Mon Nov 16, 2026, 7:00 PM ET: **0**, `email_id` like `checkin-d3%`: **0**, newest `sent_at` Wed Oct 28, 2026, 12:11:27 PM ET |
| Live `public.email_sends` after (same query) | **same**: total 24, since 7:00 PM ET 0, checkin-d3 0, newest still Oct 28, 2026, 12:11:27 PM ET |

Unsubscribe tokens in the saved payloads were minted with a local test secret only (`"s" × 40`). Live secrets were not read.

---

## Artifacts added in this v2 (SHA256SUMS was not modified)

- `RECEIPT-P1-17-PRIVACY-EVIDENCE-v2-20261116.md` (this file)
- `SHA256SUMS-v2`
- `artifacts/p1-17-v2-branches-summary.json`
- `artifacts/p1-17-v2-A_n0-note-row.json`, `artifacts/p1-17-v2-A_n0-resend-payload.json`
- `artifacts/p1-17-v2-B_n1-note-row.json`, `artifacts/p1-17-v2-B_n1-resend-payload.json`
- `artifacts/p1-17-v2-B_n2-note-row.json`, `artifacts/p1-17-v2-B_n2-resend-payload.json`
- `artifacts/p1-17-v2-C_n3-note-row.json`, `artifacts/p1-17-v2-C_n3-resend-payload.json`
