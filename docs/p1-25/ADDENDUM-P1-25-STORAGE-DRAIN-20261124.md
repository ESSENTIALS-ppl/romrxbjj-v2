# ADDENDUM to the P1-25 purge fix pin (e0b34625): storage queue drain + daily queue check (BUILD ONLY, 2026-11-24)

Clears Vera F1 (verdict 6351fa4e / precheck e0b34625 item B8): "nothing drains public.p1_25_storage_delete_queue". Nothing here is applied, deployed, scheduled or run against live data. Written by Avery, Tue Nov 24 2026 (ET). Reuses the drain code built Tue Nov 17 about 7:18 to 7:28 AM ET (left uncommitted then), re-tested today, plus today's additions (option B gate tests, optional cron, SQL and cron mutants).

## What drains the queue
- Core: supabase/functions/_shared/p1_25_storage_drain_core.mjs (drainQueue).
  1. HEAD count of public.p1_25_storage_delete_queue (PostgREST, service role). If 0: log queue_empty and stop. Nothing else is read or called.
  2. Snapshot the queue in primary-key order (paged, 500 per page).
  3. Per row: DELETE /storage/v1/object/<bucket>/<path> (Storage API, service role, each path segment URL-encoded).
     - 2xx: deleted. HTTP 404, or HTTP 400 with a not_found body: already missing. Only then is that one queue row deleted (PostgREST DELETE by bucket_id + name, return=representation, must return exactly 1 row).
     - Any other status or a network error: failed; the row is KEPT for the next run. A failed queue-row delete is also counted as failed (file already gone; the next run sees not-found and removes the row).
  4. Recount and log one line: queued_at_start, deleted, already_missing, failed, remaining, oldest_queued_at_start, failures (paths masked to the first 8 chars of any uuid).
- Never touches storage.objects with SQL, never sets storage.allow_delete_query, never prints the key (the CLI scrubs it from every line; tested D12c).

## Option chosen: B (edge function), because no service-role key is on the box
Checked Tue Nov 24 2026 (names only, nothing printed): no SUPABASE_SERVICE_ROLE_KEY in the shell environment and no service-role key file in /home/box/.supabase or in the repo .env files. The CLI access token also returns 401 (Grant item 5), so the key cannot be fetched from the box either.

- B. supabase/functions/p1-25-storage-drain/index.ts (BUILT, NOT DEPLOYED). Uses the platform's own SUPABASE_SERVICE_ROLE_KEY env (same as live send-renewal-reminders). POST only; x-cron-secret checked fail-closed against vault cron_webhook_secret through public.verify_webhook_secret(p_name, p_candidate) (live signature confirmed read-only today). Returns counts only.
  - Deploy (gated: own pin, Vera precheck, Sable release; by name only, with full before and after `supabase functions list -o json` name lists):
    `export SUPABASE_ACCESS_TOKEN="$(< /home/box/.supabase/access-token)"`
    `supabase functions deploy p1-25-storage-drain --project-ref cqzvqzwwevnflinxgnpp --no-verify-jwt --use-api`
    `--no-verify-jwt` is required: live public.cron_call_edge sends only Content-Type and x-cron-secret (no Authorization header). The CLI token currently returns 401, so the deploy needs the token renewed first (Grant item 5).
  - Manual run (gated, MCP execute_sql): `select public.cron_call_edge('p1-25-storage-drain', 120000);` then `select status_code, content::text from net._http_response where id = <returned id>;` Append the counts line to the drain log (below).
  - Optional automatic run: supabase/migrations-unapplied/20261124120000_p1_25_storage_drain_cron.sql (+ _rollback). Job 'p1-25-storage-drain-daily', '53 4 * * *' UTC (30 min after job 14: 11:53 PM ET in EST, 12:53 AM ET in EDT). The HTTP call is made only when the queue has at least one row. Apply only after the purge fix and the function are live; adds 1 cron job. Own pin.
- A (fallback, only if Sable or Jim provides the key through a gated path; Node 18+, no network beyond Supabase):
    `cd <worktree of this branch>`
    `trap 'unset SUPABASE_SERVICE_ROLE_KEY' EXIT`
    `export SUPABASE_SERVICE_ROLE_KEY="$(< <600-mode key file>)"` (never echo; delete the file after, trap as in the VAPID set script)
    `node scripts/p1-25-storage-drain/drain.mjs --dry-run`
    `node scripts/p1-25-storage-drain/drain.mjs`
    `unset SUPABASE_SERVICE_ROLE_KEY`
  Exit 0 = no failures (including empty), 2 = some rows failed and stayed queued, 1 = setup or read error.

## Drain log
process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-DRAIN.log (one JSON line per run with an ET time; option A writes it itself, option B: Avery appends the response counts).

## Daily queue-count check (read-only; Avery runs and logs it)
- SQL: scripts/p1-25-storage-drain/daily-queue-check.sql (count, oldest queued_at in UTC and ET, escalate_to_grant). The queue's enqueue-time column is queued_at.
- Start the day after the purge fix is applied (before that the table does not exist: 42P01 is expected and is not an alert).
- Run once a day after 12:30 AM ET (after job 14 and the optional drain job), via MCP execute_sql.
- Log one line to process/batches/base-engagement-20261115/P1-25-purge-20261116/drain-log/P1-25-QUEUE-CHECK.log: `<ET time> queued=<n> oldest_queued_at_et=<t or none> escalate=<true|false>`.
- queued > 0: run the drain (option B manual run, or confirm the cron run in net._http_response).
- escalate_to_grant = true (any row waiting more than 24 hours): tell Grant the same day with the count, oldest time (ET) and the last drain failures (masked paths only).

## Known item W2 (not covered by the drain)
See KNOWN-ITEM-W2-P1-25-PHOTO-PATH-ORPHAN-20261124.md. Objects referenced only by a progress-photo path are never queued, so the drain cannot see them. Detect via storage_objects_queued < table_counts['storage.objects'].

## Tests (no live data, no secrets; 127.0.0.1 only)
- scripts/p1-25-storage-drain/drain.test.mjs: PGlite with the real queue DDL from 20261117120000 and the LIVE storage.protect_delete trigger; local stub plays PostgREST and the Storage API. 25/25 PASS, including success, 404, 400 not_found, 500 keeps the row, network error, empty queue, paging, odd paths, idempotent rerun, dry run, wrong key, daily check (0 rows; 23 h; 25 h escalates), CLI exit codes and key never printed.
- supabase/functions/p1-25-storage-drain/index.test.ts (Deno): 5/5 PASS (GET 405; no secret 403; wrong secret 403; RPC error or 500 fails closed; good secret + empty queue 200 with counts, key not in body).
- scripts/p1-25-storage-drain/cron-cmd.test.mjs (PGlite): 4/4 PASS.
- Mutants: core 11/11 killed (mutants.mjs), daily-check SQL 3/3 (mutants-sql.sh), option B gate 5/5 (mutants-b.sh), cron 4/4 (mutants-cron.sh). 23/23 killed.

## Not tested
- A real Storage API delete against the live project (no live run; build only).
- pg_cron scheduling itself (PGlite has no pg_cron; only the command text is tested).
