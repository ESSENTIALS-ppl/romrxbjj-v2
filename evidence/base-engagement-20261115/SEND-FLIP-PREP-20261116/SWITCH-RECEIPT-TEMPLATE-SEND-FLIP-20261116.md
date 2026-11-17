# SWITCH RECEIPT (TEMPLATE, NOT FILLED): P1-34 send flip, Supabase cqzvqzwwevnflinxgnpp

Fill only after Vera PASS + Sable OK are relayed by Grant and the Jim ledger line is read. Times in ET. Never write a secret value,
token, email or name here. Flag values are recorded as "on" / "off" / "unset" only (they are not secrets, but are read by name only).

## Gate
- Jim line (ledger L____, quoted): ______  (relayed by Sable 7:54 PM ET Nov 16 per Grant)
- Vera PASS id: ______   Sable OK relayed by Grant at ______ ET
- Route used: [ ] Jim, dashboard Edge Function Secrets   [ ] CLI `supabase secrets set` after Jim's `supabase login`   (who did it: ______)

## Flags (before -> after)
| Name | Before | After | Set at (ET) | Basis for "before" |
|---|---|---|---|---|
| LIFECYCLE_EMAILS_SEND | ______ | on | ______ | cron response send_enabled (snapshot q3) / `supabase secrets list` name+digest |
| ROMBOT_CHECKIN_SEND | ______ | on | ______ | `supabase secrets list` name+digest, or "not listed" |
| LIFECYCLE_AUDIENCE | ______ | ______ (unchanged unless separately approved) | | cron response audience |
| LIFECYCLE_CANARY_USER_IDS | count ____ | count ____ | | cron response canary_count (count only, ids never written) |
| QUICK_CHECK_ON (server) | unset/off | MUST STAY OFF (check7 / check14 Version A held) | n/a | |
| QUICK_CHECK_ON (client app/src/lib/quickCheck.ts:22) | false | false | n/a | live bundle 0f677c27 |
| RENEWAL_BASE_SEND | not touched | not touched | n/a | |

## Cron
- Before: jobs __, ids __, cron_md5 ______ (expect a96d2036959f1dc2697d23e7665cb490)
- Applied: CRON-rombot-checkin-NOT-APPLIED.sql sha256 fe460d61... via MCP apply_migration at ______ ET, live id ______, rename commit ______
- After: job ____ `rombot-checkin-hourly`, schedule `30 * * * *`, active __, cmd md5 ______; all other jobs' cmd md5 unchanged (job 1 renewal caab15b0, job 11 lifecycle a40ec369): __
- Rollback ready: CRON-rombot-checkin-ROLLBACK-NOT-APPLIED.sql sha256 ae23fa8c...

## Runs and sends
| Check | Time (ET) | Value |
|---|---|---|
| email_sends before (count, newest sent_at) | | (prep read 8:03:39 PM ET: 24, newest Oct 28 2026 12:11:27 PM ET) |
| first lifecycle-emails run after flip: send_enabled / audience / canary_count / results | | |
| first rombot-checkin run: send_enabled / email_enabled / audience / results | | |
| email_sends after (count, newest, lc-% / checkin-d3-% claims) | | |
| expected first send | | see prep receipt: none until a customer is in a window AND audience/canary allows |

## Rollback (if needed, in this order)
1. Set ROMBOT_CHECKIN_SEND to `off` (any value but "on" is off). 2. Set LIFECYCLE_EMAILS_SEND to `off`. 3. Run the cron rollback (unschedule by name).
Claims and notes already written stay. Time each step: ______

## Not done
No deploy, no migration other than the cron, no QUICK_CHECK_ON change, no renewal job or RENEWAL_BASE_SEND change, no test send.
