# RECEIPT: L1143 send-renewal-reminders DEPLOY (P1-32 Base renewal), 2026-11-16 (Avery)

**DEPLOYED: v27, ezbr 3bcc783c19962ebd2ce0e0e207b37f089a79fca8e729015706010b08c50acf22, verify_jwt false. Source 1220116b6e50b143864c33116cb31d3030087d85, byte-identical on read-back.**
Not touched: cron job 1, RENEWAL_BASE_SEND and all other secrets. The function was not invoked, no dry run, no email, no DB writes.

## Gate
- Ledger L1143 (Margot, 9:44 AM ET) pins 1220116b. Jim's "Ok" at 9:42 AM ET on 2bf843e3 is L1142.
- Vera's precheck: /workspace/vera-verdicts/vera-1220116b-L1143-renewal-P1-32-precheck-20261116.md. sha256 checked before the deploy: 3609bb6e70af247ade227365632cc4455b47855d11fbf08f4b52b6f3dd3b182f (MATCH 3609bb6e). Verdict line: "VERIFIED (precheck) ... 0 FAIL, 4 WARN, 2 NOT TESTED."
- Sable's separate OK came via Grant, relayed at 9:50 AM ET.
- L1134 sequencing, checked at 9:51 AM ET: all 4 migrations were applied (…143732, …143905, …143959, …144054), submit-assessment was v45 (verify_jwt true) and compute-tiers was v54 (verify_jwt false). The L1134 step 3 and 4 receipts were written at 9:44 AM ET. No L1134 step was in progress, so no wait was needed.

## Pre-deploy (9:51 AM ET)
- get_edge_function returned v26, ezbr dece2cb78932a506618281454dad3fb9f7d15ffb50d69ed5663d31edfe615dda, verify_jwt false.
- All 3 live files are byte-equal to ../rollback-live-v26/: index.ts c318e360, logic.ts 1741f4b7, email_footer.ts 0f9d1019.
- Snapshot: pre-deploy/live-meta-pre-deploy.json.

## Deploy
- deploy_edge_function, project cqzvqzwwevnflinxgnpp, name send-renewal-reminders, entrypoint_path source/index.ts, **verify_jwt false (passed explicitly)**.
- 4 files, extracted with `git show 1220116b:<path>` into deploy-src-1220116b/:
  - source/index.ts 6979f0da695cb4b211ebfcb6a3146cf1a7e569e871633f9e1e6b5624fa4fb4e0 (7044 B)
  - source/email.ts e629702bc8521c8038de71e1caf7c47ee7f0fef8e1a0df92fe16aadf044a1fec (12374 B)
  - source/logic.ts 1741f4b7b57074b4c61a3b4b3aa6c516f41f6bd114b06475f628f5fad4518eae (6679 B, = v26)
  - _shared/email_footer.ts 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b (1216 B, = v26)
- Call started 9:51:24 AM ET and returned 9:51:39 AM ET. Version 27 has updated_at 9:51:33 AM ET.
- CORRECTION to the prep receipt (RECEIPT-P1-32-RENEWAL-PREP-20261116.md, df63d231): its "Deploy files" line swapped two labels. index.ts is 6979f0da and email.ts is e629702b. The hashes themselves were right. This receipt has the correct mapping.

## Read-back (get_edge_function after the deploy)
- v27, status ACTIVE, verify_jwt false, ezbr **3bcc783c19962ebd2ce0e0e207b37f089a79fca8e729015706010b08c50acf22** (not dece2cb7, as Vera's W3 expects).
- The file set is exactly the 4 files above. Each one is **byte-IDENTICAL** to deploy-src-1220116b, and index.ts was also compared against `git show 1220116b`.
- Saved: post-deploy/readback-files/, post-deploy/live-meta-v27-readback.json.
- No rollback was needed.
- Text on the live bytes: p132_renewal_test_on_v27_readback.ts is the prep test with its imports pointed at the read-back files. Result: **6 passed, 0 failed** (TEST-ON-V27-READBACK.txt). It covers the 2bf843e3 byte rebuild, From `ROMRx <hello@romrx.io>`, Reply-To hello@romrx.io, BJJ/BB byte-identical to v26, and the logic and flag reader unchanged.

## Cron (read only, re-read 9:51:59 AM ET)
jobid 1 send-renewal-reminders-daily, `0 12 * * *` (7:00 AM ET), active, `select public.cron_call_edge('send-renewal-reminders')`. Command md5 caab15b0a3b771bccfd127f7c3db4df2 is UNCHANGED, and the row md5 671b791fa638938d52f643bbcb77547d is UNCHANGED.

## RENEWAL_BASE_SEND: UNKNOWN
- (a) Does the name exist? **Couldn't check.** `supabase secrets list` failed with AccessTokenRequiredError because there is no CLI login on the box. No MCP tool lists edge-function secret names. The DB vault (vault.secrets) has 0 entries named like "renewal", but edge secrets don't live there, so that proves nothing. The value was never read.
- Runtime: today's 7:00 AM ET run returned 200, but the database web-call log (pg_net) timed out after 5 s, so the body with `send_enabled` wasn't kept. The function logs have only boot and shutdown lines, and the dry-run path logs nothing. renewal_reminders has 0 rows ever, but nobody was due today, so that is expected whether the flag is on or off.
- (b) The code, the same at 1220116b (v27) and live v26:
  - logic.ts:136-137 (both): `/** ... sends are ON only when RENEWAL_BASE_SEND is exactly the lowercase string "on". Unset, "", "ON", "true", "1" are OFF. */` / `export function sendEnabled(v: string | undefined | null): boolean { return v === "on"; }`
  - index.ts, 1220116b lines 72-75 (v26 lines 123-126): `const sendOn = sendEnabled(Deno.env.get("RENEWAL_BASE_SEND"));` / `if (dryRun || !sendOn) {` / `return json({ success: true, dry_run: true, send_enabled: sendOn, ... due: ... });`
  - So: **unset → dry-run (plan only, no claim, no send); "" → dry-run; "false" → dry-run; "true" → dry-run.** Only the exact string "on" sends. This gate sits before the Base/sport branch, so it applies to Base and sport recipients alike.

## Who is due at Tue Nov 17, 7:00 AM ET (counts only)
- Method: a read-only query of active Base subscribers with a Stripe subscription. Emails were replaced server-side with internal/non-internal placeholders, ids were dropped and Stripe ids were md5'd. public.is_test_account was evaluated server-side. The deployed v27 planReminders and brandFor then ran locally with now = 2026-11-17T12:00:00.3Z (count_due_tue.ts, COUNTS-TUE-0700.txt).
- Result: 4 candidate rows. **45-day window: 1 (Base brand). 30-day: 0. 2-day: 0.** Skipped: 2 test fixtures and 1 legacy (grandfathered). Today's 7:00 run gave 0 due, because the one member was 46 days out, outside every window.

## Plain answer
At Tue Nov 17, 7:00 AM ET, one Base member is due the 45-day reminder.
- **If RENEWAL_BASE_SEND is exactly "on"**, that member gets the new ROMRx Base email from ROMRx <hello@romrx.io>, with Reply-To hello@romrx.io and the 2bf843e3 text.
- **If it is unset, empty, "false", "true" or anything else**, nobody gets an email. The run only plans and returns a dry-run response, and it writes no claim row.
- The state found is **UNKNOWN**. The flag couldn't be read without a secrets listing, which isn't available here. Nothing on file suggests anyone has set it to "on" (the v6 code comment says sends stay off until it is), but that isn't proof.
- One caveat on catch-up: windowFor picks the smallest window that covers the days left. If the flag is turned on later, a member at 44 to 31 days still gets the 45-day email on that day's run.

## Rollback to v26 (numbered)
1. Read the live state: get_edge_function send-renewal-reminders, and note the version.
2. Run deploy_edge_function with project cqzvqzwwevnflinxgnpp, name send-renewal-reminders, entrypoint_path source/index.ts, **verify_jwt false**. Pass exactly these 3 files from ../rollback-live-v26/: source/index.ts (c318e360…), source/logic.ts (1741f4b7…), _shared/email_footer.ts (0f9d1019…). Don't include email.ts, which v26 doesn't have.
3. Read it back with get_edge_function. Expect a new version (28+), verify_jwt false, and the 3 files byte-equal to rollback-live-v26. The ezbr should equal dece2cb78932a506618281454dad3fb9f7d15ffb50d69ed5663d31edfe615dda if the bundler is deterministic; if it isn't, record the new ezbr and rely on the byte match.
4. Re-read cron job 1's md5s (caab15b0…, 671b791f…). Don't touch cron or RENEWAL_BASE_SEND.
5. Write a rollback receipt and tell Grant, Sable and Vera.

## Post-deploy
- Vera's live post-check: read v27's live bytes and email text (the read-back files and test are here).
- Watch the Tue 7:00 AM ET run using function_edge_logs and function_logs, plus a row count of renewal_reminders. Don't rely on the pg_net body, which times out at 5 s.
- Deadline met: live at 9:51:33 AM ET Mon Nov 16, ahead of Tue Nov 17 7:00 AM ET.
