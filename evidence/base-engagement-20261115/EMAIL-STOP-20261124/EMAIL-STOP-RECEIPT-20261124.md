# EMAIL-STOP receipt, Nov 24 2026 (Jim order 4:05 PM ET, scope update 4:06 PM ET)

Scope held: Notice A/B, trial-ending and renewal reminders (RENEWAL_BASE_SEND), announcements.
Allowed (Jim 4:06): lifecycle emails, ROMBot check-ins, welcome, assessment results, lead emails.
No sends, no invokes, no deletes, no cron changes. Values never printed.

## 1. RENEWAL_BASE_SEND: BLOCKED (CLI 401)
- 4:06:23 PM ET `supabase secrets list`: 401 Invalid access token. No before list possible.
- 4:06:37 PM ET `supabase secrets set RENEWAL_BASE_SEND=off --yes`: 401 Invalid access token. Nothing set. No after list.
- No workaround tried (no token reads, no dashboard).
- Inferred current state: ON. Evidence: renewal_reminders has one 45_day claim at Nov 17 7:00:05 AM ET. The code writes a claim only when the flag is exactly "on" and keeps it only if Resend accepted the send.
- Live code: send-renewal-reminders v33 (updated 4:05 PM ET, ezbr c7dd83a8, D3 deploy by the other executor). Flag unset or any value other than exactly "on" = plan only, no sends (sendEnabled: v === "on").
- Cron: job 1 send-renewal-reminders-daily, `0 12 * * *` UTC = 7:00 AM ET daily, active. Next run Wed Nov 25 7:00 AM ET. (Read only; job 1 not touched.)
- Would it send now? No one is due. Eligible Base subscribers: 1, charge date Mar 1 2027 (from users.base_expiry, which v33 reads first). That is 96 days away on Nov 25. The 45-day window opens Jan 15 2027, so the first possible renewal send under v33 is Jan 15 2027 7:00 AM ET. Under the old v32 (consent trial_end Jan 1) the 30_day email would have gone Dec 2 7:00 AM ET; v33 removes that.
- Risk window: a new eligible subscriber with a charge date 45 days out or less would be sent on the next 7 AM run while the flag stays on.

Stop options (none applied; for Grant):
  a) When a valid CLI token exists: `supabase secrets set RENEWAL_BASE_SEND=off --project-ref cqzvqzwwevnflinxgnpp --yes`, with before/after `secrets list` digests. Rollback: set back to on.
  b) `select cron.alter_job(1, active := false)` via MCP. Rollback: `cron.alter_job(1, active := true)`. Note: standing rule says don't touch job 1, so this needs Grant/Jim to lift it.
  c) No action: nothing is due before Jan 15 2027 7:00 AM ET with current subscribers; recheck before each new Base signup batch.

## 2. Other flags (read-only, not changed)
- LIFECYCLE_EMAILS_SEND: ON. Source: lifecycle-emails response at 3:30 PM ET (net._http_response 23166) says send_enabled true, audience all. Kinds: check7, check14, digest, lapsed, retest, protocol. Last real send: lc-protocol at 7:30 AM ET today. Allowed by Jim 4:06.
- ROMBOT_CHECKIN_SEND: ON. Source: rombot-checkin response at 3:30 PM ET (id 23165) says send_enabled true, email_enabled true. 0 sent in the last runs. Allowed by Jim 4:06.
- WEB_PUSH_SEND: OFF. Source: send-push-notification response at 3:45 PM ET (id 23167) says dry_run true; the live code sends only when the flag is exactly "on".
- All three were read from run responses, not secret digests (CLI 401).

## 3. Queue proof (MCP execute_sql, read only)
- No outbox or scheduled table exists. email_sends (user_id, email_id, sent_at) and push_sends (user_id, dedupe_key, claimed_at) are sent logs. No status column and no rows dated in the future.
- No scheduled_at, send_at or queued_at column anywhere in public, except p1_25_storage_delete_queue (file deletes, not email).
- email_sends, last 7 days: lc-protocol daily at 7:30 AM ET plus lc-digest Nov 22. No notice, trial, renewal or announcement kinds.
- renewal_reminders, all time: 1 row (45_day, Nov 17 7:00 AM ET).
- push_sends, last 7 days: 0 rows.
- billing_consent_amendments: 1 row with notice_sent_at null (Notice not sent). No cron, trigger or function sends it; only the guard trigger references the notice columns. Held: it stays unsent.
- Triggers that send: tg_webhook_send_s1_welcome calls send-s1-welcome-email (welcome, allowed). tg_webhook_notify_inbound_lead (lead, allowed).

## 4. Crons that could send email or push
| job | name | schedule UTC | ET | active | next run ET | class |
|---|---|---|---|---|---|---|
| 1 | send-renewal-reminders-daily | 0 12 * * * | 7:00 AM daily | yes | Nov 25 7:00 AM | HELD KIND: renewal/trial-ending. Flag inferred on; nothing due until Jan 15 2027 |
| 8 | conversion-drip-hourly | 15 * * * * | :15 hourly | yes | 4:15 PM Nov 24 | lead conversion drip (c1_value, c2_proof, c3_loss). Treated as lead email (allowed); Sable to confirm. Last runs sent 0 |
| 11 | lifecycle-emails-hourly | 30 * * * * | :30 hourly | yes | 4:30 PM Nov 24 | ALLOWED (Jim 4:06) |
| 15 | rombot-checkin-hourly | 30 * * * * | :30 hourly | yes | 4:30 PM Nov 24 | ALLOWED (Jim 4:06) |
| 16 | send-push-notification-hourly | 45 * * * * | :45 hourly | yes | 4:45 PM Nov 24 | push, WEB_PUSH_SEND off (dry run) |
| 2-7 | s1/bb-s1 follow-up emails | 0 * * * * | hourly | NO | none | inactive |

Not on any cron: send-whats-new (announcements, v12, manual invoke only) and send-protocol-reminder.

## 5. Resend scheduled sends
- RESEND_API_KEY is in the box shell env; the key value was never printed. GET /emails (list) returned 200: 22 emails, all delivered, 0 with scheduled_at in the future, 0 in the scheduled state.
- Caveat: I can't prove this is the same Resend account the edge functions use (secret digests unreadable while the CLI returns 401).
