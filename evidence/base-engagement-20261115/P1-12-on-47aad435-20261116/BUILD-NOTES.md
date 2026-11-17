# P1-12 calendar-ics + web .ics download BUILD-NOTES — 2026-11-16, 8:20 PM ET (America/New_York)

BUILD ONLY. Nothing deployed, applied, flipped or scheduled. P1-12/ v2 hashed files (including sample-romrx-base.ics 40a56ef3 and the v2 samples) were not overwritten.

## Stopped-run check
`/workspace/p1-12-calendar-20261116` already existed on `feat/p1-12-add-to-calendar-20261116` at 29eb4fa6, clean, with no calendar commits. Origin had no 20261116 P1-12 branch (ls-remote). Server rebuild did not exist. Continued from there.

## Server (romrxbjj-v2)
- Branch: `feat/p1-12-calendar-ics-on-47aad435-20261116`
- Commit: `c1901e458fe6629535d916ed33767ef41a77156a`
- Parent / base: `47aad4358c73f333e34f25e53002fcef432a78a1` (live P1-07 v4 + P1-06 v5). Migration file on this parent is still named `20261116030000_user_mobility_schedule.sql` (unapplied in the repo); live applied it as `20261116143732`.
- Patch sha256: `b338daae55290489242e0d52e16917a290c47251fd32a01058e20904f422d5b1`
- `git patch-id --stable`: `8727b4265afe75d24abdca75cea673fabe3004d3`
- SQL / rollback: none (function only).

### Every hunk (all new files)
1. `supabase/functions/calendar-ics/ics.ts` — builder. Default TZ `America/New_York` (was Chicago on 7881afb9). Weekly protocol VEVENT (all 7 weekdays at reminder_time), one-shot check-in, one-shot 6-week retest. After a quick check or day-14 roll (`next_check_at` on/after `next_retest_at`) only the retest event is written. UTF-8 octet fold, VTIMEZONE for US zones. UIDs `romrx-protocol-weekly`, `romrx-check`, `romrx-retest` (no mailbox form). No scores.
2. `supabase/functions/calendar-ics/handler.ts` — GET only, JWT required, CORS for romrx.io, `text/calendar` attachment `romrx-base.ics`, fail-soft if schedule read throws.
3. `supabase/functions/calendar-ics/index.ts` — user client (RLS). Reads `notification_preferences.reminder_time, timezone` and `user_mobility_schedule.next_check_at, next_retest_at`.
4. `supabase/functions/calendar-ics/ics.test.ts` — 7 tests (parseReminderTime; weekly+check+retest and no scores; handler 401/200 and missing schedule; RFC 5545 + ical.js; octet fold; after-roll retest only; missing/invalid TZ falls back to America/New_York).

## Client (romrx-io-web)
- Branch: `feat/p1-12-add-to-calendar-20261116`
- Commit: `58ef5c6affa662c072f70f749977c99642ee3877`
- Parent / base: `29eb4fa66f920450d71c44e6edbad123cfd38596` (live web at last publish).
- Patch sha256: `5548515ec2c67a00bfb78cc62875eab07f58803cf8039b320365688141d23581`
- `git patch-id --stable`: `e7f8b2c04116a78c442973b169540690f6a4eccd`

### Every hunk
1. `app/src/lib/addToCalendar.ts` — `calendarIcsUrl`, `fetchCalendarIcs` (GET + bearer + apikey), `saveIcsDownload` (Blob + `<a download>`), copy constants. No native calendar API, no service-worker path, no new redirect rule.
2. `app/src/lib/addToCalendar.test.ts` — 3 tests (URL + copy, successful download, 401 / non-calendar body).
3. `app/src/pages/Settings.tsx` — "Add to my calendar" button in the Notifications section (after the reminder-time block, before the hidden push toggle). Web download only.

## Words still open (Stacy)
.ics: "ROMRx protocol session", "Your ROMRx session for today.", "ROMRx check-in", "A short ROMRx check-in is due.", "ROMRx 6-week retest", "Your 6-week ROMRx retest is due." (same as v2 7881afb9; Vera W1). Button/help: "Add to my calendar", "Download a calendar file for your protocol days, check-in, and 6-week retest.", "The calendar file could not be downloaded."
