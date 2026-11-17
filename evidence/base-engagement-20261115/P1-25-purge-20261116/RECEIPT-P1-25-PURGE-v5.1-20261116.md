# RECEIPT: P1-25 purge v5.1 — Notion manual step, unapplied daily cron, privacy sentence, identifier check, 2026-11-16 8:08 PM ET (Avery)

BUILD ONLY. No apply_migration, no live writes, no deploys, no cron changes, no setting changes, no change to any live process. Receipts v1 (5c8ee929), v2 (af4fd317), v3 (d90583cd), v4 (c1744b6c), v5 (f9c6886f) and SHA256SUMS through SHA256SUMS-v5 (3a6dfaa4) were not edited. This file is additive, with `SHA256SUMS-v5.1`. Live reads were catalog, cron inventory, and count-only identifier checks. Nothing is applied or scheduled. The 90-day purge does nothing until it is applied and scheduled.

Jim, verbatim (L1004, 2026-11-03 7:07 PM ET): "Purge deleted accounts after 90 days."

## Grant's v5.1 calls (final, 8:01 PM ET) and what was done

1. **KEEP the dry-run-count guard** in `p1_25_complete_account_deletion`, signature `(uuid, text, jsonb)`. No hook, trigger, or other function SQL was changed. The v5 guard is unchanged (hook SQL sha256 still 4b437b4b).
2. **MANUAL Notion step** added as step 7 in `docs/p1-25/RUNBOOK-COMPLETION-v5.md`. After the function runs, find and delete the feedback-to-notion Notion page(s) for that user's client_feedback rows, and record the page ids deleted (or 'none found') in the completion record. Identify page ids at dry run, while the rows still exist, if the Notion copy is keyed off those rows; delete the pages only after a successful apply. No trigger or code change. Stacy will word the customer-facing part.
3. **Null-user_id product_events:** Grant asked to say plainly that the 1,879 rows with no user id are kept as anonymous because they aren't linked to a person. The live count-only check (below) found **no email, IP, phone, or user-agent strings** in those rows, but it also found **1 of 10 `lead_id` values that matches a current `public.leads` row that has an email**. That one event is linked to a person. I am not calling the 1,879 rows anonymous as a set. Details and exact queries are in "Identifier check".

Also in this drop, per Grant's 8:01 PM ET scope: the unapplied daily pg_cron schedule (and name-only rollback), and Stacy's cleared Privacy Policy sentence with `{N}` filled as 8.

## Identity

- Repo romrxbjj-v2, branch `feat/p1-25-purge-v5-20261116` off **1c3f1d821230fa67683a3ef5d7b79df4a7b1c6ae** (v4). Prior v5 commits 06c604d4 and 24508e01 untouched in their bytes. New tip **c3e0441557d3984c7b42ddff8d0497dcda8bef35** (v5.1, 8:06:59 PM ET), plain push, `git ls-remote origin refs/heads/feat/p1-25-purge-v5-20261116` = c3e04415. Not applied.
- Patch sha256 (`git format-patch --stdout 1c3f1d82..c3e04415`, whole v5 + v5.1 change; evidence copy `1c3f1d82-c3e04415.patch`, held back): **8b7f21493aa4bbc6b7997bcc4e49c574e3a368a504534fe69cd56e4e80d954b5**
- Single-commit patch sha256 of c3e04415 (`format-patch -1`): b65384c4add9238f91362938f325c9e08115a6313f0b25cc1ecff2b68f6234df
- `git patch-id --stable` of the whole change (`git diff 1c3f1d82 c3e04415`): **916dc9c72534d3a42fecc5da43bb0ab0b87c2d43**. Per commit: 06c604d4 **d9c1ab561cfca73fbcb3130ed3f10a7f73613431**; 24508e01 **867ac60beb970239eb279e306fcbf72aa13a0958**; c3e04415 **d19981929e59ecbbc299b008f0ec37898b8d0c13**.
- Hook SQL v5: unchanged, 4b437b4b0525bf6e2830d7e32b42b58e462a3cd81466a74a6c3ba7f7681e7b8c
- Hook rollback v5: unchanged, 119baaeac6ffe1d14c339639fc5924aec3f3a75705c7b3759667e81f13e034b6
- Day-90 purge SQL: unchanged from v4, 19177ae64adee93d0c72e91bc45a08d7837302f2a5efdcbcfe1cb7ac6d3daa6c
- New cron SQL `supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron.sql` (evidence copy same name): **03823f26a07beb63c0a0d3cca3cf39020f618540af86d11768fe40782d0346ca**
- New cron rollback (evidence copy same name): **4ca72fee802c439ba6cf13f9557ad0e2a2946f40c9c90fcf5bdd06ac9321fad7**
- Runbook v5.1 `docs/p1-25/RUNBOOK-COMPLETION-v5.md` (evidence copy `RUNBOOK-COMPLETION-v5.1.md`; the v5 copy 45881e66 is left as it was): **47a55cc08025bd2058298f6539b496a65be6b463e6098d0e046f4e04ed48a9df**
- Build notes v5.1 (evidence copy `BUILD-NOTES-v5.1.md`; the v5 copy 22c03303 is left as it was): **6b8bff800fee504188e703367fbf5aa5823c925ee3128513196372b15c4a73f5**
- Privacy sentence: repo romrx-io-web (legal.html lives there, not in romrxbjj-v2). Branch `feat/p1-25-purge-privacy-line-20261116` off **29eb4fa66f920450d71c44e6edbad123cfd38596**. Tip **7e8190ae1facf81455fccc9cb7858015c5ccc073** (8:07:00 PM ET author / 8:07:05 PM ET commit), plain push, `git ls-remote` = 7e8190ae. legal.html sha256 **abd12f726e9ed7dc712ac1fabf5da1c519ffd0f6749a72c9dded20033753eab9**. `git patch-id --stable` of 7e8190ae: **f5128116ef8a5a2f5681eb9a6f4f12edc91e73f5**. Format-patch held back (c1c28106). Stacy source `STACY-P1-25-PURGE-PRIVACY-LINE-v2-20261116-2001.md` sha256 **94fd190ef930d5673e089442940682e170ac2de09989427bebb603bdcdf93bcc** (verified before use).

## Exact hunks changed (c3e04415, romrxbjj-v2)

1. `docs/p1-25/RUNBOOK-COMPLETION-v5.md` — exactly 1 hunk `@@ -8,3 +8,4 @@`: adds MANUAL step 7 (Notion page delete + record page ids or 'none found').
2. `supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron.sql` — new, exactly 1 hunk `@@ -0,0 +1,38 @@`.
3. `supabase/migrations-unapplied/20261117010200_p1_25_purge_deleted_accounts_cron_rollback.sql` — new, exactly 1 hunk `@@ -0,0 +1,10 @@`.
4. `docs/p1-25/BUILD-NOTES-v5.md` — exactly 1 hunk `@@ -38,3 +38,40 @@`: this v5.1 section.

No change to the completion hook SQL, its rollback, the day-90 purge SQL, the NOT_FOR_APPLY cron sibling, or any test file.

## Exact hunks changed (7e8190ae, romrx-io-web)

1. `legal.html` — exactly 1 hunk `@@ -112,7 +112,7 @@`. Replaces the one sentence in Privacy section 4 "Your rights":

   Before: "When you ask us to delete your data, we delete your account and the personal information tied to you."

   After (Stacy v2, `{N}` filled as 8): "When you ask us to delete your data, we delete your account and the personal information tied to you, including your feedback and your app activity records. If we copied your feedback into our Notion workspace, we delete that copy too. A few remaining records tied to your account are permanently erased 90 days after your deletion is completed, and a short-term safety copy of those records is deleted within 8 days after that. We keep only these records: the billing terms you agreed to; records of the consents you gave or withdrew, such as reminder opt-ins, with the link to your account removed; and app usage data that is not linked to any account. We keep the billing and consent records to show what was agreed to and when, and to meet our legal duties. Stripe keeps its own payment records on its own schedule."

   The rest of the paragraph is unchanged. Last-updated lines are unchanged (Terms: October 28, 2026; Privacy: November 16, 2026) and will be set to the real ship day of this release. `grep` for the literal `{N}` on the committed file: no matches. **This edit must ship in the same release that applies the completion hook AND applies and schedules the 90-day purge, never separately.** Until that release, the words would describe code that is not running.

   Flag for Stacy / Grant: the "app usage data that is not linked to any account" clause is not fully accurate today. See the identifier check: 1 null-user_id `product_events` row is joinable to a `public.leads` row that has an email, via `props.lead_id`.

## Unapplied cron (N = 8)

Live cron, read-only, 8:03 PM ET, project cqzvqzwwevnflinxgnpp. Exact fingerprint query:

```
SELECT count(*)::int AS job_count,
       string_agg(jobid::text, ',' ORDER BY jobid) AS jobids,
       md5(string_agg(jobid::text || '|' || schedule || '|' || command || '|' || active::text, E'\n' ORDER BY jobid)) AS md5_main,
       md5(string_agg(jobid::text || '|' || jobname || '|' || schedule || '|' || command || '|' || active::text, E'\n' ORDER BY jobid)) AS md5_alt_p117
FROM cron.job;
```

Result: **13 jobs**, ids 1-13, md5_main **a96d2036959f1dc2697d23e7665cb490** (unchanged vs P1-08 / P1-17), md5_alt_p117 **37af0c31c6436476b08ebd3743f0bdad** (same as the P1-17 "alt this formula"). Job 1 row md5(jobid|jobname|schedule|command|active) still **671b791fa638938d52f643bbcb77547d**; command md5 still caab15b0. Renewal cron (job 1, `send-renewal-reminders-daily`, `0 12 * * *`) was not touched, not unscheduled, and is not referenced by the new files except as a "do not touch" note. The L1134 all-jobs formula `md5(string_agg(jobid::text||schedule||command||active::text, '|' order by jobid))` is still **2fa1e843681ee3c1d91f926be9c15159**.

No existing job is named `purge-deleted-accounts-daily`. No existing job uses `23 4 * * *`. Nearest daily slot around 04:xx UTC is `17 4 * * *` (consent-events-retention-daily) and the hourly `17 * * * *` (assessment-drafts-purge-hourly).

Chosen job, unapplied:

- name: `purge-deleted-accounts-daily`
- schedule: `23 4 * * *` (04:23 UTC = 11:23 PM ET standard time)
- command: `select public.purge_deleted_accounts('apply', interval '90 days');`

The zz_bak_p1_25_* copy is dropped by a later apply run once older than 7 days, so the safety-copy window is 7 days plus the max wait until the next daily run: **N = 8**.

The new file is in `migrations-unapplied/` and is not applied. It must not be passed to apply_migration until a gate line names this file's sha256, and only after `20261117010000_p1_25_purge_deleted_accounts.sql` has been applied, and only after a count-only then dry_run live run has been reviewed. It supersedes `20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql`, which is left unchanged and still raises if applied. Rollback unschedules `purge-deleted-accounts-daily` by name only, if it exists, and does not touch any other job.

PGlite testing: not feasible. PGlite 0.5.16 does not provide `pg_cron` (`cron.job`, `cron.schedule`, `cron.unschedule`). The existing 35/35 and 40/40 suites were not re-run and were not modified; they do not cover scheduling. The schedule was checked against the live 13-job inventory only.

## Identifier check (read-only, count-only, no values printed)

Live, 8:04–8:06 PM ET, project cqzvqzwwevnflinxgnpp, `SELECT` only, MCP `execute_sql`. `describe_tables` first: `public.product_events(id bigint pk, user_id uuid -> auth.users.id, anon_id text, session_id text, event text, props jsonb, sport text, source text, path text, created_at timestamptz)`. Then `public.leads` and `public.email_sends` before the join counts. No matched values, emails, IPs, or identifiers were selected or printed.

Patterns used (PostgreSQL POSIX):

- email: `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`
- IPv4: `\y(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\y`
- IPv6: `\y(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\y` and `::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}`
- phone (US/E.164-ish, known to false-positive inside UUID digit runs): `(\+1[\s.-]?)?(\(?[0-9]{3}\)?[\s.-]?)[0-9]{3}[\s.-]?[0-9]{4}`
- user agent: `(?i)(mozilla/|applewebkit|chrome/|safari/|firefox/|edg/|crios/|fxios/|user-agent)`
- UUID shape: `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`

Column and pattern counts, `WHERE user_id IS NULL` (1,879 of 9,603 rows):

| Column | nonempty | distinct nonempty | UUID-shape | email | IPv4 | IPv6 | phone (all) | phone not UUID-shape | UA |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| anon_id | 1,833 | 1,001 | 1,826 | 0 | 0 | 0 | 43 | 0 | 0 |
| session_id | 1,833 | 1,101 | 1,826 | 0 | 0 | 0 | 39 | 0 | 0 |
| event | 1,879 | — | — | 0 | 0 | 0 | 0 | — | 0 |
| sport | 14 | — | — | 0 | 0 | 0 | 0 | — | 0 |
| source | 1,879 | — | — | 0 | 0 | 0 | 0 | — | 0 |
| path | 1,833 | — | — | 0 | 0 | 0 | 0 | — | 0 |
| props leaves | 2,672 nonempty / 2,701 leaves | — | 10 | 0 | 0 | 0 | 0 | 0 | 0 |

Other shape counts (no values): both anon_id and session_id empty on 46 rows; 7 nonempty anon_id and 7 nonempty session_id are not UUID-shaped; all 7+7 are 17-character tokens matching `^[A-Za-z0-9_-]+$` (0 hex-only, 0 digits-only). All 43 + 39 phone hits were UUID-shaped false positives.

props: all 1,879 null-user_id rows have a JSON object; 0 nested objects or arrays; 22 distinct top-level keys: authenticated, band, email_id, has_lead_token, is_test, lead_id, mode, path, pending_sport, provider, prs_score, reason, signup_source, source, sport_intent, stage, step_index, step_key, tier, total_steps, utm_campaign, utm_medium. Presence (rows_with_key / nonempty): authenticated 224/224, band 10/10, email_id 12/12, has_lead_token 63/63 (jsonb type boolean), is_test 12/12, lead_id 10/10, mode 22/22, path 1499/1499, pending_sport 27/0, provider 2/2, prs_score 10/10, reason 22/22, signup_source 65/65, source 22/22, sport_intent 67/65, stage 12/12, step_index 197/197, step_key 197/197, tier 10/10, total_steps 208/208, utm_campaign 5/5, utm_medium 5/5.

`props.email_id`: 12 rows, type string, length 12–14, token shape, 0 email, 0 IPv4, 0 UUID. `props.lead_id`: 10 rows, type string, length 36, all UUID shape, 0 email, 0 IPv4.

Join counts (values not selected):

- lead_id rows matching `public.leads.id`: **1**
- of those, leads rows that have a nonempty email: **1**
- of those, leads with converted_user_id set: **0**
- email_id rows matching `public.email_sends.email_id`: **2**
- email_sends rows that share those email_id keys: **24** (so email_id behaves like a campaign/template key, not a unique person id by itself)

**Conclusion:** There are no email, IP, phone, or user-agent strings in the 1,879 rows' own columns or props leaves. There are session/device identifiers (`anon_id`, `session_id`) on 1,833 rows. **1 row is linked to a person** via `props.lead_id` → `public.leads.id` on a lead that has an email. I am not claiming the 1,879 rows are anonymous. The other 1,878 have no in-column email/IP/phone/UA and no matching current lead; 9 of the 10 lead_id values do not match a current leads row.

Exact count queries (all `SELECT` only; no values returned):

```
-- row and text-column pattern counts (user_id IS NULL)
WITH pe AS (
  SELECT * FROM public.product_events WHERE user_id IS NULL
),
pat AS (
  SELECT
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'::text AS email,
    '\y(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\y'::text AS ipv4,
    '\y(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\y'::text AS ipv6,
    '::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}'::text AS ipv6_compressed,
    '(\+1[\s.-]?)?(\(?[0-9]{3}\)?[\s.-]?)[0-9]{3}[\s.-]?[0-9]{4}'::text AS phone,
    '(?i)(mozilla/|applewebkit|chrome/|safari/|firefox/|edg/|crios/|fxios/|user-agent)'::text AS ua
)
SELECT
  (SELECT count(*) FROM public.product_events) AS total_rows,
  count(*) AS null_user_id_rows,
  count(*) FILTER (WHERE anon_id IS NOT NULL AND length(btrim(anon_id)) > 0) AS anon_id_nonempty,
  count(DISTINCT anon_id) FILTER (WHERE anon_id IS NOT NULL AND length(btrim(anon_id)) > 0) AS anon_id_distinct,
  count(*) FILTER (WHERE session_id IS NOT NULL AND length(btrim(session_id)) > 0) AS session_id_nonempty,
  count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL AND length(btrim(session_id)) > 0) AS session_id_distinct,
  count(*) FILTER (WHERE event IS NOT NULL AND length(btrim(event)) > 0) AS event_nonempty,
  count(*) FILTER (WHERE sport IS NOT NULL AND length(btrim(sport)) > 0) AS sport_nonempty,
  count(*) FILTER (WHERE source IS NOT NULL AND length(btrim(source)) > 0) AS source_nonempty,
  count(*) FILTER (WHERE path IS NOT NULL AND length(btrim(path)) > 0) AS path_nonempty,
  count(*) FILTER (WHERE props IS NOT NULL AND props <> 'null'::jsonb AND props <> '{}'::jsonb) AS props_nonempty,
  count(*) FILTER (WHERE anon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS anon_id_uuid_shape,
  count(*) FILTER (WHERE session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS session_id_uuid_shape,
  count(*) FILTER (WHERE anon_id ~ (SELECT email FROM pat)) AS email_in_anon_id,
  count(*) FILTER (WHERE session_id ~ (SELECT email FROM pat)) AS email_in_session_id,
  count(*) FILTER (WHERE event ~ (SELECT email FROM pat)) AS email_in_event,
  count(*) FILTER (WHERE sport ~ (SELECT email FROM pat)) AS email_in_sport,
  count(*) FILTER (WHERE source ~ (SELECT email FROM pat)) AS email_in_source,
  count(*) FILTER (WHERE path ~ (SELECT email FROM pat)) AS email_in_path,
  count(*) FILTER (WHERE anon_id ~ (SELECT ipv4 FROM pat)) AS ipv4_in_anon_id,
  count(*) FILTER (WHERE session_id ~ (SELECT ipv4 FROM pat)) AS ipv4_in_session_id,
  count(*) FILTER (WHERE event ~ (SELECT ipv4 FROM pat)) AS ipv4_in_event,
  count(*) FILTER (WHERE sport ~ (SELECT ipv4 FROM pat)) AS ipv4_in_sport,
  count(*) FILTER (WHERE source ~ (SELECT ipv4 FROM pat)) AS ipv4_in_source,
  count(*) FILTER (WHERE path ~ (SELECT ipv4 FROM pat)) AS ipv4_in_path,
  count(*) FILTER (WHERE anon_id ~ (SELECT ipv6 FROM pat) OR anon_id ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_anon_id,
  count(*) FILTER (WHERE session_id ~ (SELECT ipv6 FROM pat) OR session_id ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_session_id,
  count(*) FILTER (WHERE event ~ (SELECT ipv6 FROM pat) OR event ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_event,
  count(*) FILTER (WHERE sport ~ (SELECT ipv6 FROM pat) OR sport ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_sport,
  count(*) FILTER (WHERE source ~ (SELECT ipv6 FROM pat) OR source ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_source,
  count(*) FILTER (WHERE path ~ (SELECT ipv6 FROM pat) OR path ~ (SELECT ipv6_compressed FROM pat)) AS ipv6_in_path,
  count(*) FILTER (WHERE anon_id ~ (SELECT phone FROM pat)) AS phone_in_anon_id,
  count(*) FILTER (WHERE session_id ~ (SELECT phone FROM pat)) AS phone_in_session_id,
  count(*) FILTER (WHERE event ~ (SELECT phone FROM pat)) AS phone_in_event,
  count(*) FILTER (WHERE sport ~ (SELECT phone FROM pat)) AS phone_in_sport,
  count(*) FILTER (WHERE source ~ (SELECT phone FROM pat)) AS phone_in_source,
  count(*) FILTER (WHERE path ~ (SELECT phone FROM pat)) AS phone_in_path,
  count(*) FILTER (WHERE anon_id ~ (SELECT ua FROM pat)) AS ua_in_anon_id,
  count(*) FILTER (WHERE session_id ~ (SELECT ua FROM pat)) AS ua_in_session_id,
  count(*) FILTER (WHERE event ~ (SELECT ua FROM pat)) AS ua_in_event,
  count(*) FILTER (WHERE sport ~ (SELECT ua FROM pat)) AS ua_in_sport,
  count(*) FILTER (WHERE source ~ (SELECT ua FROM pat)) AS ua_in_source,
  count(*) FILTER (WHERE path ~ (SELECT ua FROM pat)) AS ua_in_path
FROM pe;
```

Residual phone and non-UUID shape counts, plus the props walk (top-level keys and leaf pattern counts; 0 nested objects), plus the lead_id / email_id join counts, were run as the subsequent count-only queries recorded in the work log; results are the numbers in the tables above. The join query returned only aggregated counts, never emails, names, ids, or event payloads.

## Times (America/New_York)

- Stacy v2 file sha verified: 8:02 PM ET
- Live cron read and fingerprint: 8:03 PM ET
- Identifier checks (columns, props, join counts): 8:04–8:06 PM ET
- Commit c3e04415: 8:06:59 PM ET; plain push and ls-remote: 8:07 PM ET
- Commit 7e8190ae (romrx-io-web): 8:07:00 PM ET author, 8:07:05 PM ET commit; plain push and ls-remote: 8:07 PM ET
- This receipt: 8:08 PM ET

No live writes. Nothing applied, deployed or scheduled. The 90-day purge does nothing until it is applied and scheduled.
