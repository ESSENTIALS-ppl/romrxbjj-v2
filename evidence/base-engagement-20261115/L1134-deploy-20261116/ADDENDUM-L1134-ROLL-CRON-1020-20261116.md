# ADDENDUM to the L1134 deploy receipts (SHA256SUMS unchanged): job 13 roll-next-check-at-hourly runs from 10:20 AM ET

Written Mon Nov 16, 2026, 6:59 PM ET by Avery. Read only (execute_sql SELECTs and query_logs). I did not call roll_next_check_at() or any other function. This file does not change the six L1134 receipts or their SHA256SUMS.

## Job
Job 13 is `roll-next-check-at-hourly`, schedule `20 * * * *`, command `select public.roll_next_check_at();`, active. Created by migration `20261116143732` (receipt RECEIPT-L1134-2a-030000.md). Command md5 still `01daf01196ef85d698253ef29f32122e`.

## Result: PASS. All 9 hourly runs from 10:20 AM ET through 6:20 PM ET succeeded. No failures. 0 rows moved after any run.

## cron.job_run_details, job 13 (every run from 10:20 AM ET today through the latest)

| runid | start (ET) | end (ET) | status | return_message |
|------:|------------|----------|--------|----------------|
| 22279 | 10:20:00.096 AM | 10:20:00.940 AM | succeeded | 1 row |
| 22283 | 11:20:00.096 AM | 11:20:00.981 AM | succeeded | 1 row |
| 22287 | 12:20:00.084 PM | 12:20:00.952 PM | succeeded | 1 row |
| 22291 | 1:20:00.083 PM | 1:20:00.954 PM | succeeded | 1 row |
| 22295 | 2:20:00.077 PM | 2:20:00.945 PM | succeeded | 1 row |
| 22299 | 3:20:00.087 PM | 3:20:00.966 PM | succeeded | 1 row |
| 22303 | 4:20:00.092 PM | 4:20:00.950 PM | succeeded | 1 row |
| 22307 | 5:20:00.079 PM | 5:20:00.947 PM | succeeded | 1 row |
| 22311 | 6:20:00.069 PM | 6:20:00.944 PM | succeeded | 1 row |

return_message is "1 row" on every run because the cron command is a SELECT that returns one integer, not because one schedule row moved. Duration was 0.84–0.89 s. Read at 6:57:58 PM ET; the 7:20 PM ET run had not started.

## user_mobility_schedule counts (derived; counts only)
The function is idempotent. After the in-migration roll at 9:37:32.659 AM ET, all 19 rows already had `next_check_at = next_retest_at` and 0 rows were open at +7 (RECEIPT-L1134-2a-030000.md), because the newest full assessment is Oct 28, 12:53:27 PM ET, so every user is past local day 14.

Current snapshot, 6:57:58 PM ET:
- rows: **19** (expected 19)
- next_check_at equal to next_retest_at: 19
- open at +7: **0**
- next_check_at null: 0
- All 19 rows still have `updated_at` of 9:37:32.659 AM ET. No row was updated at any :20 run.

So after each of the 9 runs: 19 rows, **0 next_check_at moved**, **0 open at +7**. assessments still 22 (all full); no new assessment has reset a row to +7.

## Postgres logs (query_logs, postgres_logs, 10:15 AM ET to 6:55 PM ET)
Nine start/complete pairs, all severity LOG, sql_state 00000, command `select public.roll_next_check_at();`. Example: run 22279 logged start 10:20:00.026 AM ET and completed 10:20:00.942 AM ET. **ERROR, FATAL, PANIC and WARNING counts in that window: 0.** No errors around the runs.

## Cron md5 checks (method in RECEIPT-L1134-2a-030000.md)
Same expression used for the 2a backup / L1133 postcheck all-jobs fingerprint:

`md5(string_agg(jobid::text||schedule||command||active::text, '|' order by jobid))`

- Jobs 1–12: **08757cf075ed473abc9b9f06e10bffd6**, UNCHANGED vs pre-apply and vs 2a.
- All 13 jobs: **2fa1e843681ee3c1d91f926be9c15159**, UNCHANGED vs the 2a/2b/2c/2d baseline that already included job 13.
- Job 1 (send-renewal-reminders-daily) row md5(jobid\|jobname\|schedule\|command\|active): **671b791fa638938d52f643bbcb77547d**, UNCHANGED. Command md5 still caab15b0a3b771bccfd127f7c3db4df2. Schedule still `0 12 * * *`, active, command `select public.cron_call_edge('send-renewal-reminders')`. 13 jobs, ids 1–13.

## What the runs mean
No run failed. The new hourly job is firing on schedule and completing cleanly. Because every existing row was already rolled at apply time, later runs correctly update 0 rows. That holds until a new full assessment resets a row to +7; the next :20 after that user's local day 14 ends is when `next_check_at` should move to `next_retest_at`.

## Not touched
Cron jobs 1–13 were not altered (schedule, command, or active flag). RENEWAL_BASE_SEND was not read or set. No secrets, no DB writes, no function calls, no rollback, no overwrite of SHA256SUMS.

Raw data: post-deploy/postcheck-cron-1020.json.
