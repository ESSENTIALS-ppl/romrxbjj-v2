# SWITCH RECEIPT v3 (TEMPLATE, NOT FILLED): P1-34 send flip, Supabase cqzvqzwwevnflinxgnpp

v3 note: replaces v2 (SWITCH-RECEIPT-TEMPLATE-SEND-FLIP-v2-20261116.md, sha256 0ce1e5103d54a534f8603de8c1992af9c7fc33d6b2db461de68fde6cf582d249)
and v1 (c6ec013e175d13f14d70f1abbde5f0c430974a73615e326accfd7b5cb34b0b17), both left unchanged. v2 was wrong on scope. Grant's 8:09 PM ET
call (decided): the switch set is FOUR values flipped together, LIFECYCLE_EMAILS_SEND=on, ROMBOT_CHECKIN_SEND=on, LIFECYCLE_AUDIENCE=all and
server QUICK_CHECK_ON=on, plus the rombot-checkin-hourly cron.

Fill only after ALL of: Jules's combined client is live, Vera has post-checked it, Vera PASS on this switch, Sable OK relayed by Grant,
and the Jim ledger line is read. Times in ET. Never write a token, secret value, digest, email or name here. Values are recorded as
"on" / "off" / "all" / "canary" / "not listed" only.

## Gate
- Jim line (ledger L____, quoted): ______  (relayed by Sable 7:54 PM ET Nov 16 per Grant; scope per Grant 8:09 PM ET)
- Jules combined client live: deploy id ______, published ______ ET. Vera client post-check id ______ (PASS required first)
- Vera PASS on this switch: ______   Sable OK relayed by Grant at ______ ET

## Exact strings the live code expects (live bytes = git, see PREP-RECEIPT section 0)
- `LIFECYCLE_EMAILS_SEND`: exactly `on`. lifecycle-emails `source/logic.ts:15` `flagOn(v) { return v === "on"; }`, used at `source/handler.ts:37`.
  rombot-checkin also needs it for its email fallback: `source/handler.ts:58`.
- `ROMBOT_CHECKIN_SEND`: exactly `on`. rombot-checkin `source/logic.ts:34` (flagOn), used at `source/handler.ts:57`.
- `QUICK_CHECK_ON`: exactly `on`. lifecycle-emails `source/logic.ts:16-18` `quickCheckOn(v) { return flagOn(v); }` ("ON only when the value
  is exactly "on" ... Unset, empty, or any other value is off"), read at `source/handler.ts:49`. Not `true`, not `1`, not `On`.
- `LIFECYCLE_AUDIENCE`: exactly `all`. lifecycle-emails `source/logic.ts:19-20` `audienceAll(v) { return v === "all"; }` ("anything else is
  canary"), read at `source/handler.ts:38`; rombot-checkin `source/handler.ts:59` `d.env("LIFECYCLE_AUDIENCE") === "all"`. Any other value
  (including `canary` or unset) = canary, i.e. LIFECYCLE_CANARY_USER_IDS only.

## Route: 7-day SUPABASE_ACCESS_TOKEN env var, then supabase CLI
- Token: Supabase personal access token, 7-day expiry, created by Jim (https://supabase.com/dashboard/account/tokens), placed only in the
  box shell env as `SUPABASE_ACCESS_TOKEN`. Never echoed, printed, written to a file, committed or pasted in chat. Created ______ ET,
  expires ______ ET, placed by ______. Existence by name only: `[ -n "$SUPABASE_ACCESS_TOKEN" ] && echo set`.
- Login check (exit code only): `supabase projects list >/dev/null 2>&1; echo $?` -> expect 0. Result: __
- **Pre-step:** `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` shows NAMES (with a digest), never values. Record names only.
- **Set (one command, these four only):**
  `supabase secrets set ROMBOT_CHECKIN_SEND=on LIFECYCLE_EMAILS_SEND=on LIFECYCLE_AUDIENCE=all QUICK_CHECK_ON=on --project-ref cqzvqzwwevnflinxgnpp`
  Exit code __, time ______ ET.
- **Cron:** apply `sql/CRON-rombot-checkin-NOT-APPLIED.sql` (sha256 fe460d6178de9955efe3c81475060ad42adf4f91b14ca9f640ee7257cf8625f7) via
  MCP apply_migration at ______ ET, live id ______, pure-rename commit ______.
- **Post-step:** `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` again, names only. Then `unset SUPABASE_ACCESS_TOKEN`.

## Before / after, in ROLLBACK ORDER (names from `secrets list`; values never shown)
| # | Name | Listed before? | Listed after? | Set to | Rollback action (in this order) |
|---|---|---|---|---|---|
| 1 | ROMBOT_CHECKIN_SEND | __ | __ | on | `supabase secrets set ROMBOT_CHECKIN_SEND=off --project-ref cqzvqzwwevnflinxgnpp` |
| 2 | QUICK_CHECK_ON | __ | __ | on | `supabase secrets set QUICK_CHECK_ON=off --project-ref cqzvqzwwevnflinxgnpp` |
| 3 | LIFECYCLE_AUDIENCE | __ | __ | all | `supabase secrets set LIFECYCLE_AUDIENCE=canary --project-ref cqzvqzwwevnflinxgnpp` (any value but "all" is canary; LIFECYCLE_CANARY_USER_IDS left unchanged) |
| 4 | LIFECYCLE_EMAILS_SEND | __ | __ | on | `supabase secrets set LIFECYCLE_EMAILS_SEND=off --project-ref cqzvqzwwevnflinxgnpp` |
| 5 | cron `rombot-checkin-hourly` (not a secret) | no job | job __ | `30 * * * *` | `sql/CRON-rombot-checkin-ROLLBACK-NOT-APPLIED.sql` sha256 ae23fa8c1bccbad385194b75475d7f64562d343d0e7633cdd94a2ad45c131992 via MCP |
After any rollback: `secrets list` (names only) and the snapshot SQL (sha256 e90062dc3bf25f9bbc92a546cb0210b0367b2c7ff4f9e692d35f4f05a3e38d02) again.
Claims and in-app notes already written stay. Time each step: ______

## Must not change
| Name | Listed before? | Listed after? | Rule |
|---|---|---|---|
| LIFECYCLE_CANARY_USER_IDS | __ | __ | unchanged (not in the set command; also unchanged on rollback) |
| RENEWAL_BASE_SEND | __ | __ | NOT SET by this receipt (see below) |
| every other listed name | count __ | count __ | same names, same count |
Renewal cron job 1 `send-renewal-reminders-daily` (`0 12 * * *`, cmd md5 caab15b0a3b771bccfd127f7c3db4df2) unchanged: __.

**RENEWAL_BASE_SEND is not part of this switch.** Grant cleared it at 8:10 PM ET as a separate step with its own fact sheet, Vera precheck
and receipt. This receipt must not set, unset or change it.

## First-run expectation (audience = all)
- Still **0 sends by design** on the first runs: at prep time (8:04-8:13 PM ET Nov 16) 0 customers had an explicit email opt-in (check,
  plan day or digest) and 0 customers were in the day-3 check-in window. So **email_sends is expected to stay at 24** (newest Oct 28 2026
  12:11:27 PM ET) and 0 check-in notes are expected. Record: first lifecycle run ______ ET sent __; first rombot-checkin run ______ ET
  notes __ emails __; email_sends after ______ (expect 24).
- **Plainly: once LIFECYCLE_AUDIENCE=all, any customer who opts in later gets the emails their opt-in covers, with no per-run or per-day
  cap in either function.** The only limits are per-user rules: one claim per email id, the 3-hour send window, the per-kind day windows,
  one check-in note per assessment and one check-in email per note. The 5000-row load limits are not send caps.
- audience=all also covers rombot-checkin's in-app note, which needs no email opt-in: every Base-active customer (10 at prep time) gets
  one note on local day 3 after a first full assessment.

## QUICK_CHECK_ON=on effect (day 7 and day 14 Version A)
- With QUICK_CHECK_ON on, the check7 email and the check14 Version A email (no quick row this cycle) become eligible
  (lifecycle-emails `source/logic.ts:311-314`). Both still need the Check reminders opt-in (`retest_reminders` + `retest_opt_in_at`,
  `source/logic.ts:81-85, 111-122`) and the local day window (check7 days 7-8, check14 day 14 only).
- **Who that affects today (read 8:13:04 PM ET, counts only):** customers with the Check reminders opt-in 0; customers on day 7-8 today 0;
  on day 14 today 0; on days 7-14 at all 0; Version A eligible today **0**. Excluded accounts (7c71e421, test/internal) in a window today 0.
  Fixture 076ce453 is not a users row.
- Version A links to /dashboard/quick-check, so the server flag must only go on after Jules's combined client (with the quick-check screen
  on) is live and Vera has post-checked it. On the current live client 6afba1b9 that route only redirects to today's session.

## Snapshot reads
| Check | Time (ET) | Value |
|---|---|---|
| cron before: jobs / ids / md5 | | expect 13 / 1-13 / a96d2036959f1dc2697d23e7665cb490 |
| cron after: rombot job added, all other cmd md5 unchanged | | |
| email_sends before | | prep 8:03:39 PM ET: 24 |
| lifecycle :30 response after: send_enabled / audience / results | | expect true / all / all 0 |
| rombot-checkin :30 response after: send_enabled / email_enabled / audience / results | | expect true / true / all / 0 |
| email_sends after first runs | | expect 24 |

## Not done
No deploy, no migration other than the cron, no change to LIFECYCLE_CANARY_USER_IDS or RENEWAL_BASE_SEND, no renewal job change, no test
send, no token printed or stored.
