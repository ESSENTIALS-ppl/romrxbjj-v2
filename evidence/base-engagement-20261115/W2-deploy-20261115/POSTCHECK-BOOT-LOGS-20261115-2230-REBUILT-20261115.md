Rebuilt after the 10:27 PM ET box restart. Replaces lost file POSTCHECK-BOOT-LOGS-20261115-2230.md, sha 97ac17023dceba2ed152ae05d80b36c2cd1eb42642905a7e08b864bc316e8b8d. Not byte-identical.

# POST-CHECK: lifecycle-emails v2 10:30 PM ET boot logs — REBUILT
Rebuilt Sunday Nov 15, 2026, 10:47 PM ET (America/New_York) by Avery. Read-only. No writes, deploys, or applies. Secret-bearing log attributes (API key prefixes and hashes) are omitted.

## How the logs were pulled
The current Supabase MCP catalog for this project does not include a tool named `get_logs`. The live logs were pulled with MCP `query_logs` (read-only ClickHouse) on project cqzvqzwwevnflinxgnpp, Sunday Nov 15, 2026 10:47 PM ET (America/New_York).

Window passed to `query_logs`: `iso_timestamp_start=2026-11-16T03:29:00Z`, `iso_timestamp_end=2026-11-16T03:33:00Z` (Sunday Nov 15, 2026 10:29:00 PM ET through 10:33:00 PM ET), covering the requested 10:29–10:32 PM ET run from cron job 11.

The logs were returned; they had not aged out. Facts below are only what this read returned. Nothing was reconstructed from memory or from the earlier report.

Sources present in that window (first `query_logs` on `select source, count() as n from logs group by source`): postgres_logs 4, edge_logs 3, function_logs 2, postgrest_logs 1, function_edge_logs 1.

A second `query_logs` in the same window selected `timestamp, source, event_message, log_attributes` from `function_logs`, `function_edge_logs`, and `edge_logs`, ordered by timestamp.

## lifecycle-emails invocation (as the logs show them)

### Boot (source: `function_logs`)
- event_message: `booted (time: 36ms)`
- event_type: Boot
- boot_time: 36
- version: 2
- timestamp: 2026-11-16T03:30:03.097Z = Sunday Nov 15, 2026 10:30:03.097 PM ET (America/New_York)
- function_id: 612296fe-7b65-4062-919f-d6a6bcc14657 (matches live lifecycle-emails from `list_edge_functions` / `get_edge_function` at 10:47 PM ET)
- deployment_id: cqzvqzwwevnflinxgnpp_612296fe-7b65-4062-919f-d6a6bcc14657_2
- request_id: 01a1e267-921e-7a8a-b994-9429e70f9e84
- execution_id: 4049c352-4a49-4861-a477-a9fd15345c83
- region: us-east-1
- served_by: supabase-edge-runtime-1.79.1 (compatible with Deno v2.1.4)

### Request / status / duration (source: `function_edge_logs`)
- event_message: `POST | 200 | https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/lifecycle-emails`
- response.status_code: 200
- execution_time_ms: 4173
- version: 2
- timestamp: 2026-11-16T03:30:05.035000 = Sunday Nov 15, 2026 10:30:05.035 PM ET (America/New_York)
- request.method: POST
- request.headers.user_agent: pg_net/0.20.0
- Same function_id, deployment_id, request_id, and execution_id as the Boot event above.

### Shutdown (source: `function_logs`)
- event_message: `shutdown`
- event_type: Shutdown
- reason: EarlyDrop
- version: 2
- timestamp: 2026-11-16T03:31:18.107Z = Sunday Nov 15, 2026 10:31:18.107 PM ET (America/New_York)
- Same function_id, deployment_id, request_id, and execution_id.

Summary as the logs show them: boot 10:30:03.097 PM ET, boot_time 36ms, status 200, duration 4173ms, version 2.

Ancillary `edge_logs` in the same window shared that request_id and were all HTTP 200 (a `verify_webhook_secret` POST, a `notification_preferences` GET, and a `scoring_cutovers` GET). Those rows also carried API key prefixes and hashes; those attributes are not recorded here.

## cron.job_run_details for job 11 (status and times only)
Source: live read, Supabase MCP `execute_sql` (after `describe_tables` of `cron.job` and `cron.job_run_details`), Sunday Nov 15, 2026 10:47 PM ET (America/New_York). Command and return_message were not selected.

- `cron.job` where jobid = 11: jobname `lifecycle-emails-hourly`, schedule `30 * * * *`, active true.
- `cron.job_run_details` for jobid 11 with start_time in 2026-11-16 03:20:00+00 to 03:45:00+00 (10:20–10:45 PM ET): one row.
  - runid: 22240
  - status: succeeded
  - start_time: 2026-11-16 03:30:00.244418+00 = Sunday Nov 15, 2026 10:30:00.244418 PM ET (America/New_York)
  - end_time: 2026-11-16 03:30:00.270816+00 = Sunday Nov 15, 2026 10:30:00.270816 PM ET (America/New_York)

Live function metadata from the same 10:47 PM ET `get_edge_function` / `list_edge_functions` read: lifecycle-emails version 2, updated_at 1794798268446 = Sunday Nov 15, 2026 10:04:28 PM ET, ezbr_sha256 `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`.
