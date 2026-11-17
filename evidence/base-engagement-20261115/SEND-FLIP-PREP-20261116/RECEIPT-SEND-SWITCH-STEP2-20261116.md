# RECEIPT — Send switch Step 2 (flip LIFECYCLE_EMAILS_SEND + ROMBOT_CHECKIN_SEND to on) — 2026-11-16

Project cqzvqzwwevnflinxgnpp (romrxbjj-v2). All times ET (UTC-5). Evidence: STEP2/.
Scope: these two secrets only. LIFECYCLE_AUDIENCE, LIFECYCLE_CANARY_USER_IDS and QUICK_CHECK_ON were not changed. WEB_PUSH_SEND is still absent.
Not done: rombot cron, push cron 20261117020200, manual sends, test invokes, cron_call_edge calls, Resend calls, live data edits.
Account 7c71e421: no write, no flag and no config change (read-only inputs only).

## Before (all matched expected, so the flip went ahead)
- SQL at 10:02:17 PM (03:02:17Z):
  - cron.job count 14; table md5 0beb8bc4976fc129be2d26c88096c252; job 1 md5(command) caab15b0a3b771bccfd127f7c3db4df2.
  - email_sends 24; newest sent_at Wed Oct 28 12:11:27 PM ET.
- Secrets at 10:02:41 PM:
  - 31 names (STEP2/secrets-before.txt).
  - LIFECYCLE_EMAILS_SEND b4dc66dde806261bdda8607d8707aa727d308cd80272381a5583f63899918467
  - ROMBOT_CHECKIN_SEND b4dc66dde806261bdda8607d8707aa727d308cd80272381a5583f63899918467
  - LIFECYCLE_AUDIENCE 5ef5ef03… (all); QUICK_CHECK_ON b8d31e85…; LIFECYCLE_CANARY_USER_IDS 73caac2f…
- Functions at 10:02:43 PM:
  - 41 functions (STEP2/functions-before.json).
  - lifecycle-emails v9, ezbr 77358262e0931059…, verify_jwt false.

## Flip
- Command: `supabase secrets set LIFECYCLE_EMAILS_SEND=on ROMBOT_CHECKIN_SEND=on --project-ref cqzvqzwwevnflinxgnpp --yes`
- Run 10:02:56.937 PM to 10:02:59.136 PM; exit 0; "count":2.
- Each value is exactly `on` with no newline.

## After
- Secrets at 10:03:00 PM:
  - 31 names, identical list (NAMES-SAME).
  - Both flags now b8d31e852725afb1e26d53bab6095b2bff1749c9275be13ed1c05a56ed31ec09.
  - The all-digests diff shows only these 2 lines changed. WEB_PUSH_SEND is absent.
- Functions at 10:03:01 PM:
  - 41/41 with ezbr_sha256, updated_at and verify_jwt unchanged ("identity changed: []").
  - All 41 versions went up by 1, which is expected after a secrets set. For example, lifecycle-emails 9→10 (ezbr 77358262…, false) and rombot-checkin 4→5 (fbad0021…, false).
- SQL at 10:03:16 PM (03:03:16Z):
  - cron 14 / 0beb8bc4976fc129be2d26c88096c252 / job 1 caab15b0a3b771bccfd127f7c3db4df2 (unchanged).
  - rombot or send-push cron jobs: 0. email_sends 24 (unchanged).

## First run that can send
- Live cron (read-only): the only email job is job 11 `lifecycle-emails-hourly`, `30 * * * *`, active (`cron_call_edge('lifecycle-emails',120000)`).
- Runs at 10:30 and 11:30 PM tonight and overnight have nothing due, because they fall outside the 3h window from reminder_time 07:00.
- **First run that sends: Tue Nov 17, 7:30 AM ET.**
- The 8:30 and 9:30 AM runs plan the same email_id. The email_sends primary key (user_id, email_id) returns 23505, so each kind/day goes out once.
- ROMBot check-ins: rombot-checkin has **no cron job**, so ROMBOT_CHECKIN_SEND=on has no effect until a schedule or invoke exists. Expected sends: 0.

## Expected recipients (ids only)
Method:
- Recomputed across all users with AUDIENCE=all and no exclusion.
- Per the live v9 logic (5707a3e0, logic.ts L87–128), every kind needs its toggle set to true plus a valid opt-in marker (retest/check7/check14 use retest_opt_in_at, protocol/lapsed use protocol_opt_in_at, digest uses digest_opt_in_at).
- The live read shows exactly one account holding any marker, 7c71e421 (retest 1, protocol 1, digest 1). Every other user has 0 for every kind.
- Local planKind (STEP2/plan-runs.ts, no network) ran over every :30 run from Mon 10:30 PM to Sun Nov 22 11:30 AM.

| First run (Tue Nov 17 7:30 AM ET) | count | ids |
|---|---|---|
| protocol (lc-protocol-2026-11-17) | 1 | 7c71e421-929b-4691-a6bc-cc614ed2a08d |
| retest / check7 / check14 | 0 | — |
| lapsed | 0 | — (last web event 01:34Z today) |
| digest | 0 | — (first digest is Sun Nov 22 9:30 AM ET, 7c71e421) |
| ROMBot check-in (notes/emails) | 0 | — (no cron) |
| **Total** | **1** | |

- After that: protocol goes out once a day Wed–Sun at 7:30 AM ET, while protocol_opt_in_at and the session state stay as they are.
- Digest goes out Sun Nov 22 at 9:30 AM ET (plan-runs-output.txt).

## BB sender
Unchanged live sender, no change made (L1383).

## Rollback
```
export SUPABASE_ACCESS_TOKEN="$(< /home/box/.supabase/access-token)"
supabase secrets set LIFECYCLE_EMAILS_SEND=off ROMBOT_CHECKIN_SEND=off --project-ref cqzvqzwwevnflinxgnpp --yes
unset SUPABASE_ACCESS_TOKEN
```
- This restores both digests to b4dc66dde806261bdda8607d8707aa727d308cd80272381a5583f63899918467.
- To stop the 7:30 AM send, run the rollback before Tue Nov 17 7:30 AM ET.
