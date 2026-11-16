Rebuilt after the 10:27 PM ET box restart. Replaces lost file TZ-FALLBACK-AUDIT-20261115.md, sha de9e2f675d53165a561201e891fdcd2afe92a256cf22a1a8d735ce8b74cc383d. Not byte-identical.

# TZ fallback audit — REBUILT (read-only redo)
Rebuilt Sunday Nov 15, 2026, 10:47–10:49 PM ET (America/New_York) by Avery. Read-only on live Supabase project cqzvqzwwevnflinxgnpp and on named git commits. No writes, applies, or deploys. Counts only for timezones; no user emails or other row data printed.

## Live lifecycle-emails v2 — `source/logic.ts` tz fallback
Source: live read, Supabase MCP `get_edge_function` function_slug=`lifecycle-emails`, Sunday Nov 15, 2026 10:47 PM ET (America/New_York). Live metadata from that same read: version 2, status ACTIVE, verify_jwt false, ezbr_sha256 `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`, updated_at 1794798268446 = Sunday Nov 15, 2026 10:04:28 PM ET. File `source/logic.ts` (297 lines). Weekly digest uses the same helpers.

- `source/logic.ts:7` — comment: "Send time follows reminder_time and timezone. A bad or missing value falls back to 09:00 America/Chicago."
- `source/logic.ts:19` — `export const DEFAULT_TZ = "America/Chicago";`
- `source/logic.ts:78-80` — `validTz` returns false for missing, non-string, or invalid zone names.
- `source/logic.ts:83` — `localParts`: `const zone = validTz(tz) ? tz : DEFAULT_TZ;` (stored/valid tz first; Chicago only when missing or invalid). Digest, retest, protocol, lapsed, and check timing all go through `localParts`.
- `source/logic.ts:168` — `friendlyDate` uses the same `validTz(tz) ? tz : DEFAULT_TZ` fallback.

No other `America/Chicago` or `America/New_York` literal appears in the live v2 `source/` files from this read. `source/index.ts:33` selects `timezone` from `notification_preferences` but has no fallback of its own.

## Live `tg_protocol_session_completion` functiondef tz lines
Source: live read, Supabase MCP `execute_sql` `pg_get_functiondef` of `public.tg_protocol_session_completion()`, Sunday Nov 15, 2026 10:47 PM ET (America/New_York). Line numbers are 1-based lines of that functiondef text.

- functiondef:22 — `-- Local date: user's notification_preferences.timezone if valid, else America/New_York.`
- functiondef:26-31 —
  - :26 `AND (c.completed_at AT TIME ZONE COALESCE(`
  - :27 `(SELECT np.timezone FROM public.notification_preferences np`
  - :28 `WHERE np.user_id = NEW.user_id`
  - :29 `AND np.timezone IN (SELECT tz.name FROM pg_catalog.pg_timezone_names tz)`
  - :30 `ORDER BY np.updated_at DESC NULLS LAST LIMIT 1),`
  - :31 `'America/New_York'))::date = NEW.session_date`

Stored valid tz first; fallback is America/New_York.

## `notification_preferences.timezone` default and counts
Source: live read, Supabase MCP `execute_sql` (after `describe_tables` of `public.notification_preferences`), Sunday Nov 15, 2026 10:47 PM ET (America/New_York). Counts only; no emails or ids.

- Column default: `'America/New_York'::text`. Type text, `is_nullable` = NO. (`information_schema.columns`)
- Counts by timezone (48 rows total; none missing):
  - America/New_York: 46
  - America/Los_Angeles: 1
  - Europe/Istanbul: 1

## Live submit-assessment tz (none expected)
Source: live read, Supabase MCP `get_edge_function` function_slug=`submit-assessment`, Sunday Nov 15, 2026 10:47 PM ET (America/New_York). Live metadata: version 44, ezbr_sha256 `110f365775b57b68977c68627ef2cda1645aae09a4ef23944555de8fcb0ff19a`, updated_at 1793114288188 = Tuesday Oct 27, 2026 10:18:08 AM ET. Deployed files: `functions/submit-assessment/index.ts`, `mood_block.ts`, and four `_shared` files. Searched all six for timezone / America/ / DEFAULT_TZ / timeZone / UTC fallback: **no hits**. No `schedule.ts` in the live function. No timezone logic on live submit-assessment, as expected.

## Client romrx-io-web at 360510fe
Source: commit 360510fe3a3d165d20fe11392715cfedec47eb9c (`git show` in `/workspace/romrx-io-web-360510f-publish`; also confirmed on GitHub `ESSENTIALS-ppl/romrx-io-web` via `gh api repos/ESSENTIALS-ppl/romrx-io-web/commits/360510fe3a3d165d20fe11392715cfedec47eb9c`, Sunday Nov 15, 2026 10:48 PM ET). Committed Sunday Nov 15, 2026 10:02:10 PM ET. Device / stored tz still first; the two UTC literals are fallbacks only.

- `app/src/lib/localDate.ts:7-11` — `localDateIso` uses the device calendar (`getFullYear` / `getMonth` / `getDate`). No named fallback zone.
- `app/src/pages/Settings.tsx:97-98` — `Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'`
- `app/src/lib/reminderOptIn.ts:74` — `timezone: timezone || 'UTC'` in `saveReminderTime`

## P1-07 v3 `user_mobility_schedule.sql` Chicago lines
Source: commit 3543ef94831ae13135174461b45c5ceac755bb88 (`git show 3543ef94:supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql`). Commit message: feat(P1-07 v3): quick-check window through END of local day 14. Committed Sunday Nov 15, 2026 10:15:06 PM ET. Unapplied.

- `supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql:15` — `-- Time zone (same source as lifecycle-emails): notification_preferences.timezone if valid, else America/Chicago`
- `supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql:60` — `select s2.user_id, coalesce(tzn.name, 'America/Chicago') as tz`
- `supabase/migrations-unapplied/20261116030000_user_mobility_schedule.sql:73` — comment on `roll_next_check_at`: `fallback America/Chicago`

decision (Grant, 10:27 PM ET): America/New_York fallback, stored or device tz first.
