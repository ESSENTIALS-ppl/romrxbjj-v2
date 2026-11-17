# RECEIPT: lifecycle-emails "lapsed" fix (BUILD + READ-ONLY). Nothing live changed.

Project `cqzvqzwwevnflinxgnpp`. Asked by Grant 9:06 PM ET Mon Nov 16 2026. Built 9:05-9:15 PM ET.
No deploy, no secret set, no row writes, no sends, no cron change. Supabase reads were SELECT / EXPLAIN only.
Jim's test account 7c71e421 was READ only (activity dates, no email printed). It is not flagged, edited or excluded in code or config.

## 0. Byte-match of the deployed source (done first)
- Live `get_edge_function lifecycle-emails` at 9:08 PM ET: ezbr_sha256 `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41`, updated_at 7:29:36 PM ET, verify_jwt false, 10 files.
- `compare.py` (copy in this folder) against romrxbjj-v2 commit `fb53b850f0651a0e0af0fcc440c1d241a9d657da` (the P1-08 qc-guard deploy source): **10/10 files MATCH, file set equal, ALL MATCH**. Output: `live-readback-lifecycle-emails-meta-20261116.json`.
- NOTE: the API now reports `version: 5` (it was 4 at 7:58 PM ET). Every other field (ezbr, updated_at, entrypoint_path `..._4/...`, all file bytes) is identical to the 7:58 PM extract. Same code; only the version counter differs. Flag for Vera; I did not cause it.

## (a) Existing per-kind switch that holds "lapsed" out with no code change: NONE
Evidence at `fb53b850` (= live bytes):
- `source/handler.ts:37-43`: the only env reads are `LIFECYCLE_EMAILS_SEND` (global send on/off), `LIFECYCLE_AUDIENCE` (all vs canary), `LIFECYCLE_CANARY_USER_IDS` and `LIFECYCLE_SUPPRESS_USER_IDS` (per USER, all kinds), `UNSUBSCRIBE_HMAC_SECRET`; `handler.ts:49` `QUICK_CHECK_ON` (check7/check14 version A only). No per-kind env.
- `source/handler.ts:41-42`: `kinds = KINDS.filter((k) => !only || k === only)` from the request param `?kind=`. It can only pick ONE kind, never exclude one. Cron job 11 `lifecycle-emails-hourly` (`30 * * * *`, active) calls with no `kind=` param (read-only check), so all 6 kinds run. Holding lapsed out this way would need cron changes (5 per-kind jobs), which is not "no code change" and touches cron.
- `source/logic.ts:11-12`: `KINDS` is a hard-coded constant including "lapsed".
- `source/logic.ts:81-84` and `:111-115`: lapsed has no toggle of its own; it shares `email_reminders` and `protocol_opt_in_at` with the protocol reminder. Any per-user data change would also stop protocol emails.
- `source/index.ts:29-81` (load): reads `notification_preferences`, `users`, `scoring_cutovers` (hip_flex_scored only), `assessments`, `protocol_sessions`, `protocols`, `user_mobility_schedule`, auth admin `getUserById`, plus `deletion.ts` tables. No config table, no template-enabled flag. Templates live in code (`source/email.ts`).
Verdict: no existing switch. Per Grant's call, Step 2 waits for (b).

## (b) Fix: branch `fix/lifecycle-lapsed-app-activity-20261116`
- Commit `ea8ddddd452d7bbebe9af4e802f6f67e8f7e18b6`, parent `fb53b850f0651a0e0af0fcc440c1d241a9d657da` (deployed v4 source, byte-matched above).
- Plain push; `git ls-remote origin refs/heads/fix/lifecycle-lapsed-app-activity-20261116` = `ea8ddddd452d7bbebe9af4e802f6f67e8f7e18b6` (MATCH).
- Patch `lapsed-fix-ea8dddd.patch` (header + `git diff --full-index fb53b850 ea8ddddd`; plain diff so no author address is in the file). patch-id --stable `db9f8bc7f1b8f65789ec522410d8eda34456ef5c` (same as `git show ea8ddddd | git patch-id --stable`).

### Live schema facts (read-only, 9:08-9:10 PM ET)
- `public.product_events`: id bigint, user_id uuid, anon_id, session_id text, event text, props jsonb, sport, source text NOT NULL, path, created_at timestamptz NOT NULL. RLS on. service_role has SELECT.
  - source counts: web 9218, server 212, edge 89, backfill 81, stripe 12. Only `web` is real app use; server/edge/stripe/backfill rows are system-written, so they do not count as activity.
  - Index exists: `product_events_user_created_idx (user_id, created_at DESC)`. EXPLAIN of the new query: `Limit -> Index Scan using product_events_user_created_idx, Index Cond user_id, Filter source='web'`, cost 0.29..2.51. One indexed lookup per loaded user; no new index needed.
- `auth.sessions`: has `updated_at` (timestamptz) and `refreshed_at` (timestamp). service_role has USAGE on schema auth but NO SELECT on auth.sessions (`has_table_privilege` false), no public helper function reads it, and PostgREST does not expose the auth schema. So session activity is NOT readable from the function's service-role client without a new migration (SECURITY DEFINER RPC). Not added (change nothing else). Web product_events stand in: the app writes a web page_view on use.
- Reported case, read-only, dates only: last_sign_in Nov 3; last protocol_session Oct 28; last assessment Jul 6; newest web product_event 8:34 PM ET Nov 16; newest auth.sessions activity 8:31 PM ET Nov 16; prefs America/New_York 07:00. v4 math: quiet from Nov 3 -> lapsed due Tue Nov 17 (7 AM ET window). Fixed math: quiet from Nov 16 -> earliest Nov 30.

### Every hunk (git diff -U0 fb53b850 ea8ddddd)
`supabase/functions/lifecycle-emails/source/index.ts` (6276 -> 7054 bytes, sha256 `417990567c294e24195d134d87f51f9a0b6e0809ffe72d59cdb7ba3cb8327204`)
- `@@ -64,0 +65,9 @@` in load(): after the last_sign_in read, adds 9 lines: two comment lines; `let lastAppEvent: string | null = null;`; `let activityReadFailed = false;`; try { `sb.from("product_events").select("created_at").eq("user_id", p.user_id).eq("source", "web").order("created_at", { ascending: false }).limit(1)`; on `evErr` set activityReadFailed = true; else lastAppEvent = newest created_at or null } `catch { activityReadFailed = true; }`.
- `@@ -77 +86 @@` candidate object: adds `last_app_event_at: lastAppEvent, activity_read_failed: activityReadFailed,` between `last_sign_in_at: lastSignIn,` and `has_quick_check: hasQuick,`.

`supabase/functions/lifecycle-emails/source/logic.ts` (20622 -> 21450 bytes, sha256 `18ea0375fbf4c80e55311c3223edce30e0f98a2a1955bc15f759a8f60932a1d8`)
- `@@ -65,0 +66,6 @@` interface Candidate: adds optional `last_app_event_at?: string | null`, `last_session_at?: string | null` (for a future loader that can read auth.sessions; v4's loader leaves it unset), `activity_read_failed?: boolean`, each with a doc comment.
- `@@ -199,0 +206,3 @@` lapsedDueOn: two comment lines and `if (c.activity_read_failed) return false;` (fail closed: no lapsed email when activity can't be read).
- `@@ -201,2 +210,3 @@` lapsedDueOn: `if (c.last_sign_in_at) { const t = Date.parse(c.last_sign_in_at);` becomes `for (const at of [c.last_sign_in_at, c.last_app_event_at, c.last_session_at]) { if (!at) continue; const t = Date.parse(at);`. The body (local date in the user's tz; keep the later date) is unchanged.

`supabase/functions/lifecycle-emails/test/lapsed-activity.test.ts` (new, 126 lines, 7632 bytes, sha256 `7a58466d9190f371be6e80ba028b56827f4f4394ed03508a5bf745988dab4168`). Test-only, not in the deployed bundle.

Unchanged: `LAPSED_DAYS = 14`, `LAPSED_GRACE_DAYS = 3` (asserted by test), email_id `lc-lapsed-<last session/assessment date>`, copy, all other kinds, handler.ts, email.ts, score.ts, deletion.ts, every _shared file.

### Tests (deno 2.9.7, `deno test --no-lock --node-modules-dir=none -A test/`)
- Before (fb53b850): 85 passed. After (ea8ddddd): **96 passed, 0 failed** (85 old + 11 new). `deno check source/index.ts` clean. Output: `test-run-ea8dddd.txt`.
- New tests: threshold unchanged; v4 bug input reproduced; Jim's case (old sign-in, web event last night: no lapsed, next possible Nov 30); event today; truly lapsed (still sent on days 14-17, not 13 or 18, email_id unchanged); session-refresh-only (no lapsed); no product_events at all (falls back to v4 inputs); latest source wins in the user's tz; read failure fails closed (protocol unaffected); handler dry run plans no lapsed email; loader query shape.
- Planted mutants: **12/12 killed** (`mutants.py`, output `mutants-run-ea8dddd.txt`): drop event, drop session, remove fail-closed, earliest-not-latest, threshold 14->13, revert to sign-in only, drop web filter, oldest first, error ignored, value not passed, grace 3->4, timezone ignored.

### Limits, stated plainly
- Session activity without any web page_view is not seen by this loader (auth.sessions not readable). Real app use writes a web page_view, so the reported case is covered. Reading auth.sessions would need a new SECURITY DEFINER RPC migration, with its own pin.
- Adds one indexed single-row read per loaded user per hourly run.

### Stacy digest condition
Not touched by this change.

## Deploy wording (NOT done)
Deploy `lifecycle-emails` BY NAME ONLY from commit `ea8ddddd` (`supabase/functions/lifecycle-emails` only, never the whole functions folder), with verify_jwt false passed explicitly, ONLY after Grant's pin, Vera's precheck PASS, and Sable's OK. Record the full function version list (every function, version, ezbr) before and after, showing only lifecycle-emails changed, and byte-match the live readback to ea8ddddd. Until then, hold the lapsed kind out of Step 2 (no existing switch, see (a)).
