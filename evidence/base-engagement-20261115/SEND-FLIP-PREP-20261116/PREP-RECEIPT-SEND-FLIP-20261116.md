# PREP RECEIPT: P1-34 send flip (LIFECYCLE_EMAILS_SEND, ROMBOT_CHECKIN_SEND, rombot-checkin cron). PREP ONLY.

Written 8:07 PM ET Mon Nov 16 2026 by Avery's executor. Supabase `cqzvqzwwevnflinxgnpp`, read only. **Nothing flipped**: no secret or env
set, no cron scheduled, no migration, no deploy, no function invoked, no email. QUICK_CHECK_ON untouched (off). RENEWAL_BASE_SEND and
renewal job 1 untouched. No hashed file overwritten; /workspace/SHA256SUMS not touched.

**Scope change 8:03 PM ET (Grant/Sable):** Vera already PASSED the 7 lifecycle templates, the 8 check-in versions and G1 (a955ebd0), so the
rendered-text deliverable was STOPPED. No RENDERED-LIVE-TEXT file was written. The partial local render work (render/) stays on disk
only, is not part of this receipt's claims, and is held back from git (it holds the sport-pack sender addresses).

## 0. Live bytes = git (read 7:58 PM ET, get_edge_function)
| function | version | ezbr_sha256 | verify_jwt | files | vs git |
|---|---|---|---|---|---|
| lifecycle-emails | v4, updated 7:29:36 PM ET | 6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41 | false | 10 | 10/10 MATCH fb53b850, file set equal |
| unsubscribe | v14, updated 7:28:00 PM ET | 879abbfacde0fc1e812713205c4ed38aaa3c6f606d1cf37a3704e85293ff8622 | false | 5 | 5/5 MATCH fb53b850, file set equal |
| rombot-checkin | v1, updated 7:35:14 PM ET | fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19 | false | 8 | 8/8 MATCH 11803fee, file set equal |
Per-file shas: `live-source/*-meta.json` (checker `live-source/compare.py`). Raw MCP output is on disk only.

## 1. Cron plan (rombot-checkin)
- **Schedule: `30 * * * *`, hourly at :30** (same minute as live job 11 lifecycle-emails-hourly). Source: 11803fee
  `supabase/migrations-unapplied/20261116160000_rombot_checkin_cron.sql:11`.
- **Why hourly:** the function decides per user, in the user's own zone. `logic.ts:12-15` DEFAULT_HOUR 9, DEFAULT_TZ America/New_York;
  `logic.ts:53-61` sendTime: hour = `notification_preferences.reminder_time` if readable, else 9:00; zone = stored `timezone` if valid,
  else America/New_York; `logic.ts:16-17,70-73` eligible for 3 h from that hour (SEND_WINDOW_HOURS 3) so one failed run is retried;
  `logic.ts:229` note only on local day = assessment local date + 3; `logic.ts:167-170` email 24 h to 72 h after the note, at the same
  hour, plan day, no activity since. So a 9:00 AM NY user gets the note in the 9:30 AM ET run (10:30 and 11:30 are retries).
- **Auth:** `public.cron_call_edge(p_fn, timeout)` (SECURITY DEFINER) reads `vault.decrypted_secrets` name `cron_webhook_secret` and sends it
  as `x-cron-secret`; rombot-checkin `index.ts:17-28` checks it via `verify_webhook_secret`, 403 otherwise. No key is embedded in any cron
  command or in these files.
- Files (UNAPPLIED): `sql/CRON-rombot-checkin-NOT-APPLIED.sql` **fe460d6178de9955efe3c81475060ad42adf4f91b14ca9f640ee7257cf8625f7**;
  rollback `sql/CRON-rombot-checkin-ROLLBACK-NOT-APPLIED.sql` (`cron.unschedule('rombot-checkin-hourly')`)
  **ae23fa8c1bccbad385194b75475d7f64562d343d0e7633cdd94a2ad45c131992**. Apply via MCP apply_migration only, then pure-rename commit.
- Job 11 `lifecycle-emails-hourly` (`30 * * * *`, active, `select public.cron_call_edge('lifecycle-emails', 120000)`) already exists; nothing
  to add for lifecycle.

## 2. Switch method
- **No route that avoids Jim exists on this box.** Checked by name only: SUPABASE_ACCESS_TOKEN / SUPABASE_TOKEN / SBP_TOKEN not in env;
  `~/.supabase` has only `cli-latest` and `telemetry.json` (no access-token file); `~/.config/supabase` absent; no `sbp_` token string in
  home files; `supabase projects list` exit **1** (not logged in; CLI 3.0.0). Supabase MCP has no secrets tool. Shell history: 0
  `secrets set`. Ledger and process notes show no record of LIFECYCLE_EMAILS_SEND ever being set; every live lifecycle cron response
  reads dry_run true / send_enabled false, so it has never been "on". The earlier dashboard secrets route was blocked by Auto-review
  (tracker B38). The Management API (`POST https://api.supabase.com/v1/projects/cqzvqzwwevnflinxgnpp/secrets`) needs a personal access
  token, which does not exist here.
- **Jim's step, option A (dashboard, simplest):** open https://supabase.com/dashboard/project/cqzvqzwwevnflinxgnpp/functions/secrets
  (Edge Functions > Secrets), Add new secret: Name `LIFECYCLE_EMAILS_SEND`, Value `on` (exactly lowercase `on`; anything else is off).
  Add `ROMBOT_CHECKIN_SEND` = `on`. Save. Do not touch QUICK_CHECK_ON, RENEWAL_BASE_SEND or any other secret.
- **Option B (CLI on the box):** Jim runs `supabase login` in a box terminal and completes the browser sign-in. Then Avery runs, only after
  the gate: `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` (names + digests, before), then
  `supabase secrets set LIFECYCLE_EMAILS_SEND=on ROMBOT_CHECKIN_SEND=on --project-ref cqzvqzwwevnflinxgnpp`, then `secrets list` again.
  Management API equivalent (same token): `curl -X POST -H "Authorization: Bearer <PAT>" -H "Content-Type: application/json"
  https://api.supabase.com/v1/projects/cqzvqzwwevnflinxgnpp/secrets -d '[{"name":"LIFECYCLE_EMAILS_SEND","value":"on"},{"name":"ROMBOT_CHECKIN_SEND","value":"on"}]'`.
- **Rollback:** set each to `off` (same screen or `supabase secrets set NAME=off`), ROMBOT_CHECKIN_SEND first; then the cron rollback file.
- **IMPORTANT, decision needed before the flip does anything:** both functions send/write only to `LIFECYCLE_AUDIENCE` exactly `all`, else
  to `LIFECYCLE_CANARY_USER_IDS`. The live cron responses show **audience canary, canary_count 0**. With that, after the flip lifecycle
  returns "no canary ids set; nothing sent" (`lifecycle handler.ts:38-39,58`) and rombot-checkin returns "nothing written or sent"
  (`rombot handler.ts:59-60,75`). So flipping only the two flags sends nothing. Someone must decide (Jim/Sable) a canary id list or
  `LIFECYCLE_AUDIENCE=all`; that is not covered by the relayed 7:54 PM go as stated and is a separate value to set the same way.
- **QUICK_CHECK_ON:** two separate switches. Server: env `QUICK_CHECK_ON`, read in lifecycle `logic.ts:16-18` and `handler.ts:49`, on only
  for exactly `on`; unset = off, so check7 and check14 Version A are skipped (`logic.ts:311-314`, reason quick_check_off); check14
  Version B still sends. Client: a compiled constant, not a VITE env: romrx-io-web 29eb4fa6 `app/src/lib/quickCheck.ts:22`
  `QUICK_CHECK_ON = false`; `QuickCheck.tsx:26` redirects to /dashboard/my-protocol; the live bundle index-CDYOl0V-.js (0f677c27) has
  0 hits for the quick-check copy and its /dashboard/quick-check route only redirects. Turning it on would need a code change, rebuild
  and Netlify publish under its own gate, plus the server secret, plus the P1-06 server set named in quickCheck.ts:2-8. **Kept OFF per
  Grant/Sable 8:03 PM.** Its rollback would be server `QUICK_CHECK_ON=off` and client restore of 6afba1b9.

## 3. Pre-flip snapshot (read only, counts only)
- email_sends **24**, newest sent_at **Oct 28 2026 12:11:27 PM ET** (8:03:39 PM ET read; same 24 as the P1-08 receipt). lc-% claims 0,
  checkin-d3-% claims 0.
- Users 47. Excluded: 7c71e421 **1**; test/internal (`is_test_account`) **28**; fixture 076ce453 is not a users row (0, frozen, never
  selected). Customers 18, Base active customers 10.
- **Lifecycle targets (live loader rule: toggle true AND explicit opt-in marker, index.ts:30-36, logic.ts:116-122): retest/check7/check14
  0, protocol/lapsed 0, digest 0.** The 7:30 PM ET v4 dry run agrees: due 0 and no candidates in every kind.
- **rombot-checkin:** notes need Base active + exactly one full assessment + local day 3 (no email opt-in needed); emails also need the
  Plan day reminders opt-in. Now: 0 users in the day-3 window, 0 assessed in the last 2 days, newest customer assessment Oct 28 2026
  12:53 PM ET. 7 Base-active customers have one full assessment, all long past day 3. 0 email-eligible (no protocol opt-ins).
- **Expected first send:** none on the first runs. Lifecycle: no email until a customer opts in and hits a due window, at the :30 run
  in their reminder hour (default 9:30 AM NY). rombot-checkin: first note at the :30 run in the reminder hour 3 local days after a new
  Base customer's first assessment (earliest Thu Nov 19 9:30 AM ET if someone assesses tonight, Nov 16); first email 24 h after that
  note at the earliest, and only with a protocol opt-in. Both also need the audience/canary decision above.
- **Caps in code:** audience gate (above); prefs load `.limit(5000)` (lifecycle index.ts:33), candidate loads `.limit(5000)` (rombot
  index.ts:52,58); one claim per email_id in email_sends (PK user_id+email_id), released on failure; 3 h window per run; retest once per
  assessment days 42-48; check7 days 7-8, check14 day 14 only, one per assessment; lapsed once per last-activity date; one note per
  assessment, one email per note, email 24-72 h after; marketing_opt_out, deletion requests, LIFECYCLE_SUPPRESS_USER_IDS and
  is_test_account (rombot) skipped. No per-run or per-day send-count cap and no Resend rate limit in either function.
- Snapshot SQL to run just before and after: `sql/SNAPSHOT-PRE-AND-POST-FLIP-READONLY.sql`
  **e90062dc3bf25f9bbc92a546cb0210b0367b2c7ff4f9e692d35f4f05a3e38d02** (test-ran clean 8:05:22 PM ET).
- Results: `reads/readonly-reads-20261116.json`.

## 4. Switch states now
LIFECYCLE_EMAILS_SEND not on (cron responses dry_run true). ROMBOT_CHECKIN_SEND not set by any work; no cron calls it, so not observable.
QUICK_CHECK_ON: server unset/off (never set; code default off), client false. RENEWAL_BASE_SEND not touched; renewal job 1 `0 12 * * *`
cmd md5 caab15b0 unchanged. Cron 13 jobs, ids 1-13, **md5 a96d2036959f1dc2697d23e7665cb490** (8:03:39 PM ET), no rombot job.

## 5. Switch receipt template
`SWITCH-RECEIPT-TEMPLATE-SEND-FLIP-20261116.md` **c6ec013e175d13f14d70f1abbde5f0c430974a73615e326accfd7b5cb34b0b17** (flags before/after,
cron job, first send time, email_sends before/after, rollback order).
