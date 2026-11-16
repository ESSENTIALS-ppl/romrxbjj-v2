# PREP RECEIPT, Step 1b: lifecycle-emails from e5488088 (standalone lapsed scope). PREP ONLY, NOT DEPLOYED.

Written Mon Nov 16, 2026, about 8:55 AM ET by Avery. Deploy only AFTER Step 1a (unsubscribe v13) is live and post-checked.

## Source
- Commit `e5488088136e3deb2ca513251f9398fbdf1c23ad`, parent `17c5c9f37d5c4e6f68d0a84e9d06b4efd1f6a7d1` (= live v2). Patch sha `54730c72271ed47284501004e278db66e8ce222a85934a65bb47e5205c3d926d`.

## Exact files (repo `supabase/functions/lifecycle-emails/<name>`, tests excluded). Staged copy: `staged/e5488088-lifecycle-emails/`
10 files, the same names as live v2. Only `_shared/unsub_token.ts` differs from live (sha256 `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424`, the same bytes as the unsubscribe copy in 1a). The other 9 are byte-identical to live v2: source/index.ts c4ec3396…, source/handler.ts 0c920063…, source/logic.ts 0c13c9ae…, source/email.ts 51c9558c…, source/score.ts d3d03dd6…, source/deletion.ts edbcee01…, _shared/email_footer.ts 0f9d1019…, _shared/mobility/mobilityBands.ts bb76634e…, _shared/mobility/lumbarFlag.ts d1845820… (full hashes in `staged-files.sha256`).

## Diff vs live v2
- `diffs-vs-live/e5488088-lifecycle-emails-vs-live-v2.diff`, sha256 `8646672211c26a59c8788e668df78945f613bf746f0c466d33331b85890cce8c`. Stat: 1 file changed, 9 insertions(+), 2 deletions(-). Hunk content is identical to the gating pack's `9f4e99ac…`.
- One hunk: `_shared/unsub_token.ts @@ -2,8 +2,15 @@`. It adds `lapsed` to the scopes and the `SCOPE_SETTING` map (lapsed→protocol). This lets the handler sign a lapsed link, where v2 fails closed (Vera F1, L1127(2)).
- No sender, subject, word or schedule change. The `logic.ts` time-zone fallback stays exactly as live v2 (America/Chicago). The New York fallback is only in 8c9f9120 (Step 5, HELD).

## Does this start lapsed emails? (read today, read-only)
- Not by itself. The lifecycle-emails-hourly responses (cron job 11, `net._http_response`) for 4:30, 5:30, 6:30, 7:30 and 8:30 AM ET today all say: `send_enabled false, dry_run true, audience canary, canary_count 0`, with 0 due for digest, lapsed, protocol and retest (`schema-snapshots-20261116/lifecycle-cron-responses-20261116.json`).
- The handler sends only when `LIFECYCLE_EMAILS_SEND` is on, AND either `LIFECYCLE_AUDIENCE` is "all" or canary ids are set. Today the effective state is dry run. So deploying 1b makes lapsed SENDABLE (links now sign), but real lapsed emails start only when the send flag (plus audience) is turned on. That is a separate settings change and is NOT part of this step.
- Env names the function reads (names only, no values): LIFECYCLE_EMAILS_SEND, LIFECYCLE_AUDIENCE, LIFECYCLE_CANARY_USER_IDS, LIFECYCLE_SUPPRESS_USER_IDS, UNSUBSCRIBE_HMAC_SECRET, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. The Supabase MCP has no secrets-list tool and no CLI login is on the box, so I can't list which secrets exist. The cron responses show the effective values above. Step 1 touches no secret or setting.

## Tests
- e5488088 unsubscribe + lifecycle suites: 76/76 (`step5-evidence/e5488088-suite.txt`), including "the real handler now sends lapsed with a working link".

## Backup / rollback
- Live v2 bytes in `live-reads-20261116/lifecycle-emails-v2/` (10 files), byte-identical to 17c5c9f3 and the Nov 15 read. v2 ezbr `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`, verify_jwt false, entrypoint source/index.ts. Redeploy those to roll back (it becomes v4 with v2 bytes). v1 (a18a0b4d) stays the older fallback (W2 receipt).

## Deploy command form
MCP `deploy_edge_function`: name `lifecycle-emails`, entrypoint_path `source/index.ts`, **verify_jwt false (explicit)**, files = the 10 files from `git show e5488088:supabase/functions/lifecycle-emails/<name>`. Expected: v3. Never touch the renewal cron, send-renewal-reminders or RENEWAL_BASE_SEND.

## Post-check plan (read-only)
1. `list_edge_functions` / `get_edge_function`: v3, verify_jwt false, 10 files, sha256 as staged.
2. After the next :30 run, read it from `net._http_response` (flags and counts only, no emails): `select id, created, status_code, (content::jsonb)->>'send_enabled', (content::jsonb)->>'dry_run', (content::jsonb)->>'audience', (select jsonb_object_agg(k, jsonb_array_length(v->'due')) from jsonb_each((content::jsonb)->'kinds') e(k,v)) from net._http_response where content like '%send_enabled%' order by created desc limit 2;` Expect 200, the same flags as before, and no error.
3. `select status, return_message, start_time from cron.job_run_details where jobid = 11 order by start_time desc limit 2;` Expect succeeded.
4. `select count(*) from public.email_sends;` Expect unchanged (24 at the Nov 15 watch). Cron jobs 1 to 12 md5 unchanged vs `schema-snapshots-20261116/pre-apply-snapshot.json`.
5. `query_logs` for lifecycle-emails: no boot errors.

## Baseline (read 8:52 AM ET, `schema-snapshots-20261116/baseline-counts-20261116.json`)
email_sends 24. notification_preferences off counts: email_reminders 7, retest_reminders 4, weekly_digest 48. Timezone null or empty: 0, and every user has a preferences row. So the Chicago-vs-New York fallback in logic.ts applies only to a stored zone that is invalid, and there are 0 empty rows today.
