# SWITCH RECEIPT v2 (TEMPLATE, NOT FILLED): P1-34 send flip, Supabase cqzvqzwwevnflinxgnpp

v2 note: replaces v1 (SWITCH-RECEIPT-TEMPLATE-SEND-FLIP-20261116.md, sha256 c6ec013e175d13f14d70f1abbde5f0c430974a73615e326accfd7b5cb34b0b17,
left unchanged). Changes: (1) the route is fixed as a 7-day SUPABASE_ACCESS_TOKEN env var on the box plus the CLI `secrets set`;
(2) a `secrets list` pre-step and post-step, listed in rollback order; (3) a plain note that the first runs send 0 by design;
(4) an explicit RENEWAL_BASE_SEND line.

Fill only after Vera PASS + Sable OK are relayed by Grant and the Jim ledger line is read. Times in ET. Never write a token, secret
value, digest-to-value mapping, email or name here. Flag values are recorded as "on" / "off" / "not listed" only.

## Gate
- Jim line (ledger L____, quoted): ______  (relayed by Sable 7:54 PM ET Nov 16 per Grant)
- Vera PASS id: ______   Sable OK relayed by Grant at ______ ET

## Route: 7-day SUPABASE_ACCESS_TOKEN env var, then supabase CLI
- Token: a Supabase personal access token with a 7-day expiry, created by Jim (https://supabase.com/dashboard/account/tokens) and placed in
  the box shell env only as `SUPABASE_ACCESS_TOKEN`. Never echoed, printed, written to a file, committed or pasted in chat. Token created
  at ______ ET, expires ______ ET. Who placed it: ______. Existence checked by name only: `[ -n "$SUPABASE_ACCESS_TOKEN" ] && echo set`.
- Login check (exit code only): `supabase projects list >/dev/null 2>&1; echo $?` -> expect 0. Result: __
- **Pre-step:** `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp`. This shows secret NAMES (and a digest), never the values.
  Record names only below; do not copy digests or any value.
- Set (one command): `supabase secrets set ROMBOT_CHECKIN_SEND=on LIFECYCLE_EMAILS_SEND=on --project-ref cqzvqzwwevnflinxgnpp`
  Exit code: __  Time: ______ ET. Nothing else is set in this command.
- **Post-step:** `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` again; names only.
- After the work: unset the env var in that shell (`unset SUPABASE_ACCESS_TOKEN`); the token expires on its own after 7 days.

## Secrets, before -> after, in ROLLBACK ORDER (names from `secrets list`; values never shown)
| # (rollback order) | Name | Listed before? | Listed after? | Intended value | Rollback action |
|---|---|---|---|---|---|
| 1 | ROMBOT_CHECKIN_SEND | __ | __ | on | `supabase secrets set ROMBOT_CHECKIN_SEND=off --project-ref cqzvqzwwevnflinxgnpp` |
| 2 | LIFECYCLE_EMAILS_SEND | __ | __ | on | `supabase secrets set LIFECYCLE_EMAILS_SEND=off --project-ref cqzvqzwwevnflinxgnpp` |
| 3 | cron `rombot-checkin-hourly` (not a secret) | no job | job __ | scheduled | CRON-rombot-checkin-ROLLBACK-NOT-APPLIED.sql (sha256 ae23fa8c1bccbad385194b75475d7f64562d343d0e7633cdd94a2ad45c131992) via MCP |
| - | LIFECYCLE_AUDIENCE | __ | __ | UNCHANGED unless separately approved | none |
| - | LIFECYCLE_CANARY_USER_IDS | __ | __ | UNCHANGED unless separately approved | none |
| - | QUICK_CHECK_ON | __ | __ | MUST NOT BE SET (check7 / check14 Version A stay off) | none |
| - | RENEWAL_BASE_SEND | __ | __ | NOT SET, NOT TOUCHED | none |
| - | every other listed name | count __ | count __ (must be equal, same names) | unchanged | none |
Function-side confirmation (no secret read): next lifecycle-emails :30 response shows send_enabled __ / audience __ / canary_count __
(snapshot SQL e90062dc, block 3).

**RENEWAL_BASE_SEND is NOT set by this switch and stays untouched until a separate Jim ledger line clears it.** The renewal cron
(job 1 `send-renewal-reminders-daily`, `0 12 * * *`, cmd md5 caab15b0a3b771bccfd127f7c3db4df2) is not touched either.

## First runs send 0 by design
At prep time (8:03-8:05 PM ET Nov 16) the first runs after the flip are expected to send 0 emails and write 0 notes. That is by design,
not a fault: audience is canary with 0 canary ids (both handlers stop with "no canary ids set"), 0 customers have an explicit email
opt-in, and 0 customers are in the day-3 check-in window. A first real send needs a customer in a due window AND an audience/canary
setting that includes them. Record here: first run lifecycle ______ ET sent __; first run rombot-checkin ______ ET notes __ emails __.

## Cron
- Before: jobs __, ids __, cron_md5 ______ (expect a96d2036959f1dc2697d23e7665cb490)
- Applied: CRON-rombot-checkin-NOT-APPLIED.sql sha256 fe460d6178de9955efe3c81475060ad42adf4f91b14ca9f640ee7257cf8625f7 via MCP
  apply_migration at ______ ET, live id ______, rename commit ______
- After: job ____ `rombot-checkin-hourly`, `30 * * * *`, active __, cmd md5 ______; job 1 caab15b0 and job 11 a40ec3691de43187cbfb5b3061fd2519 unchanged: __

## Sends
| Check | Time (ET) | Value |
|---|---|---|
| email_sends before (count, newest sent_at) | | prep read 8:03:39 PM ET: 24, newest Oct 28 2026 12:11:27 PM ET |
| email_sends after first runs (count, newest, lc-% / checkin-d3-% claims) | | expected 24, unchanged |
| expected first real send | | none until a customer is due AND inside the audience |

## Rollback (if needed, in the order of the table above)
1. ROMBOT_CHECKIN_SEND=off. 2. LIFECYCLE_EMAILS_SEND=off. 3. Cron rollback (unschedule by name). Then `secrets list` (names only) and
the snapshot SQL again. Claims and notes already written stay. Time each step: ______

## Not done
No deploy, no migration other than the cron, no QUICK_CHECK_ON, LIFECYCLE_AUDIENCE, LIFECYCLE_CANARY_USER_IDS or RENEWAL_BASE_SEND
change, no renewal job change, no test send, no token printed or stored.
