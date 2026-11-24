# FG-21 release plan: drain cron 8827ec3f (p1-25-storage-drain-daily). STAGED ONLY, NOT APPLIED

By Avery, Tue Nov 24 2026 about 3:40 PM ET (America/New_York). Requested by Sable via Grant 3:35 PM ET. Nothing applied, invoked or scheduled; live reads were one read-only MCP execute_sql SELECT at 3:36:17 PM ET. Vera drain post-check VERIFIED 9afe7f38 (vera-73d64c54-L1469-DRAIN-DEPLOY-postcheck-20261124.md).

## Preconditions (all met today)
- Queue table exists: migration 20261124194129 p1_25_purge_storage_queue (applied 2:41:29 PM ET, L1469 step 1).
- Drain function live: p1-25-storage-drain v1, ezbr 208fad08, verify_jwt false (deployed 3:15:13 PM ET).
- No job named p1-25-storage-drain-daily exists yet.

## 1. Cron SQL (apply only via MCP apply_migration, after the gate)
- File 20261124120000_p1_25_storage_drain_cron.sql, sha256 8827ec3fd57b8c02d4839533aecd2c6087c85f513c67516e3deaee0646d3991a, exact bytes from romrxbjj-v2 tip 4a6ee2a9 (unchanged through f6b0c54b). Not edited.
- Schedules by name: `cron.schedule('p1-25-storage-drain-daily', '53 4 * * *', $cmd$select public.cron_call_edge('p1-25-storage-drain', 120000) where exists (select 1 from public.p1_25_storage_delete_queue)$cmd$)`.
- ET: pg_cron runs in UTC. '53 4 * * *' = 11:53 PM ET in EST (now to Sat Mar 13 2027) and 12:53 AM ET in EDT (from Sun Mar 14 2027). Always 30 minutes after job 14 ('23 4 * * *', 11:23 PM / 12:23 AM ET), in both seasons.
- Matches runbook v6.5 (da5f8727) line 111: "'p1-25-storage-drain-daily' ('53 4 * * *' UTC, calls only when the queue is not empty)". MATCH on name, schedule and the empty-queue guard.
- Touches no other job: job 1 (caab15b0) and job 14 (ad429871) are not referenced. It only adds one row.
- MCP call (not run): user-Supabase apply_migration, project_id cqzvqzwwevnflinxgnpp, name p1_25_storage_drain_cron, query = "$file:<abs path>/20261124120000_p1_25_storage_drain_cron.sql". Then a pure-rename commit of the repo file to the stamped id (same as 20261124194129), never re-apply.

## 2. Cron list before and expected after
See CRON-BEFORE-AND-EXPECTED-AFTER.txt. Before: 16 jobs, md5 40f1bf17f5b12e0cd32c190f928ef609. Expected after: 17 jobs, md5 a7c6a5b37fa67489b9cc365075db5adc (new job 17; jobs 1 to 16 still 40f1bf17; job 1 caab15b0; job 14 ad429871).

## 3. Rollback (not run)
- File 20261124120000_p1_25_storage_drain_cron_rollback.sql, sha256 8cc4759a6db5e204d8145db2d16c8e7fe76b45ff22474817fb6e3ebc60adeddf: `select cron.unschedule('p1-25-storage-drain-daily');` Unschedules by name only; no other job touched. Apply via MCP apply_migration. After rollback: 16 jobs, md5 40f1bf17. Queue rows and the drain function are left as they are.

## 4. Queue-count read (read-only; the same query as the daily check D2 and Vera's reads)
- daily-queue-check.sql, sha256 a5d439624143b09c654e5d9045fbb76035eff0733963fb382154302b6002dfe7: count, oldest queued_at (UTC and ET), escalate_to_grant (> 24 h).
- **Now (3:36:17 PM ET): queued 0, oldest none.**

## 5. First run and what it touches
- If applied before 11:53 PM ET tonight: first run **Tue Nov 24 2026 11:53 PM ET** (04:53 UTC Wed). Job 14 (the first run of the fixed purge) runs at 11:23 PM ET, 30 minutes earlier.
- Each run, as postgres: one SELECT on public.p1_25_storage_delete_queue (exists). If the queue is empty, nothing else happens (no HTTP call); pg_cron writes its own cron.job_run_details row.
- If the queue has rows: one net.http_post (public.cron_call_edge) to p1-25-storage-drain with the vault cron_webhook_secret in x-cron-secret. The function then, with its own service role: deletes each queued file through the Storage API (bucket progress-photos today), and removes its queue row only after success or not-found; failures keep their row. The response (counts only) lands in net._http_response.
- Expected tonight: 0 accounts qualify for the 90-day purge, so job 14 queues 0 and the drain job makes no HTTP call.
- After the cron is live, runbook v6.5 D2 becomes "after that night's drain job"; a v6.6 should drop the "until cron 8827ec3f is released" clause (not written here).

## 6. Privacy line (draft only, for Stacy; Notion not edited)
"Any files still linked to a deleted account, such as progress photos, are permanently deleted from our file storage by an automatic nightly job once the 90-day period after the deletion is completed ends."

## Not done
- No apply, no invoke, no cron change, no Notion edit, no Supabase write. No secret read or printed.
