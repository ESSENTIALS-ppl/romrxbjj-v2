# RECEIPT: P1-32 Base renewal reminder, DEPLOY PREP (Avery), 2026-11-16 9:47 AM ET

PREP ONLY. Nothing deployed, no Supabase writes, no invoke, no dry run, no email, no claim rows. The renewal cron (job 1) and RENEWAL_BASE_SEND were read only, never changed. No new commit was needed (the build already matches 2bf843e3 byte for byte).

Authority: Jim "Ok" 9:42 AM ET to the renewal text 2bf843e3 (relayed by Sable via Grant; ledger L1142). Margot's gate line L1143 pins 1220116b. Deploy waits on Vera's precheck and Sable's separate OK, relayed by Grant.

## Source
- Repo ESSENTIALS-ppl/romrxbjj-v2, origin fix/renewal-reminder-base-brand-20261115, remote head **1220116b6e50b143864c33116cb31d3030087d85** (fetched 9:44 AM ET; no commits after it). Parent 78a9044dbe643ebe99150b455dc9d6b4df659a06, on 4ccc59d5ce09568682b5ece95c3e40a62d1f1b95, on baseline 31a69b5 (live v26 verbatim).
- Fresh worktree: /workspace/p1-32-renewal-prep-wt-20261116 (local branch prep/p1-32-renewal-20261116 at 1220116b, nothing committed).
- Patch of 1220116b (vs 78a9044d): 1220116b.patch sha256 10831ae948afccdcaab082a4acb4b6183fefbc64e6bbe9c0b9e30b9dd98e0e90; diff sha256 6af80523eec66751951d5c7a664e5128ce8c7b57ed1e214635ac506092e61ddf (1 file, +4/-1; same as the prior 2-day colon receipt); patch-id d5268219.
- Deploy files at 1220116b: send-renewal-reminders/index.ts e629702bc852, email.ts 6979f0da695c, logic.ts 1741f4b7b570 (= live), _shared/email_footer.ts 0f9d101999a6 (= live).

## Diff vs live
- Live read 9:44 AM ET (get_edge_function): send-renewal-reminders **v26**, ezbr **dece2cb78932a506618281454dad3fb9f7d15ffb50d69ed5663d31edfe615dda**, verify_jwt **false**, entrypoint source/index.ts, updated Mon Nov 2 9:56 PM ET. Live files: source/index.ts c318e360, source/logic.ts 1741f4b7, _shared/email_footer.ts 0f9d1019, all equal baseline 31a69b5. No drift since the Nov 15 build.
- Diff of 1220116b vs the live files read today: P1-32-branch-1220116b-vs-live-v26.diff sha256 303bdda9ac7ffa179b25bfb30f4e2656a1a31c1425e76feee9f6115b8f3ab5b8 (2 files changed, +196/-60: email.ts new +183, index.ts +13/-60). Same content and stat as git diff 31a69b5..1220116b (P1-32-branch-1220116b-vs-baseline-31a69b5.diff sha256 af83df91a36d62af0dfb547d908380d993c7331e1331bc6d434284312e402cdf, byte-identical to the Nov 15 renewal-base-brand-vs-v26-final.diff that Margot matched in L1143). The two files differ only in the diff path prefixes.

## Byte match vs 2bf843e3: MATCH
- Approved file: /workspace/process/batches/renewal-base-brand-20261115/RENEWAL-FOR-JIM.md, sha256 2bf843e394c2f685aec83d844aaad1a8b9b10962afb0fb99e3305ea49d4a6e92 (3766 bytes).
- Method (harness/render_p132.ts): call the branch's subjectFor / buildBaseText and BRAND_BASE.from / replyTo with the approved file's own placeholders (Alex, Jan 1 2027, $60/yr, its example recipient), and assemble them in the file's layout. Lines 1-4 (title, intro prose and their blank lines) are not produced by code, so they are taken verbatim. Result: rebuilt 3766 bytes, sha256 2bf843e3...6e92, **byte-identical** to the file (subject, every body line, plan/date/amount rows, manage link, all 5 fine-print lines, postal line, support address, the "sent to" line, From and Reply-To).
- Per window, with the fake recipient user@example.com: Subject + text section equals the approved section (recipient swapped only) for 45, 30 and 2 days. The HTML body's visible text carries every approved text line, and the HTML is byte-identical to the Nov 15 Vera-passed previews (base-*-final.email.html, recipient swapped).
- Subjects: "Your ROMRx Base membership renews in 45 days" / "... in 30 days" / "... in 2 days: last chance to cancel".
- From: **ROMRx <hello@romrx.io>** (OK).
- Reply-To: 2bf843e3 line 6 says **"Reply-To: hello@romrx.io"**, and the build uses hello@romrx.io (BRAND_BASE.replyTo; index.ts sends reply_to: brand.replyTo). MATCH. This matches Grant's 9:43 AM ET relay (Jim: "Replies go to hello@, Reid triages them from my inbox.") and L1143 ("any Reply-To other than hello@romrx.io" is NOT covered).
- Rendered samples (fake recipient user@example.com): previews/base-{45,30,2}d.email.txt, .email.html, .headers.txt, .request.json (the Resend body the function would POST: from, to, subject, html, text, reply_to).

## BJJ / BB identical to live v26: IDENTICAL (6/6)
harness/live_v26_render.ts is generated straight from today's live v26 index.ts (lines 33-85 and the 143-145 subject expression, verbatim). For bjj and bodybuilding at 45/30/2 days: the HTML, subject, From, Reply-To and full Resend request body from live v26 and from 1220116b are byte-identical (SPORT_ALL_IDENTICAL_VS_LIVE_V26=true). Routing: only the exact strings "bjj" / "bodybuilding" get a sport brand; null, "", "general", "Base", "BJJ", " bjj", "Bodybuilding", "yoga" go to Base. Sport render files stay in render/ locally (they carry the sport sender addresses, so they are not pushed to evidence).

## Tests
- The branch carries no test file for this function. Added harness/p132_renewal_test.ts in this folder (not in the repo): `deno test --allow-read` **6 passed, 0 failed** (From/Reply-To; 2bf843e3 byte rebuild with a sha prefix check; a negative control; BJJ/BB identical to live v26; routing; logic windows 45/30/2, $60/yr, and the flag reader is on only for exactly "on"). Output: TEST-OUTPUT.txt.
- `deno check index.ts email.ts logic.ts` at 1220116b: exit 0.
- Harness: RENDER-COMPARE-REPORT.txt, ALL_OK=true.

## Cron (read only, cron.job)
jobid 1, send-renewal-reminders-daily, schedule **`0 12 * * *`** (12:00 UTC = 7:00 AM ET), active true, command `select public.cron_call_edge('send-renewal-reminders')`, command md5 caab15b0a3b771bccfd127f7c3db4df2, row md5(jobid|jobname|schedule|command|active) 671b791fa638938d52f643bbcb77547d. Last 5 runs (Nov 12-16, 7:00 AM ET) succeeded. Not touched.

## RENEWAL_BASE_SEND (read only): NOT DETERMINABLE, no evidence it is on
There is no secrets tool, so this is inferred:
- Today's 7:00 AM ET run: the function answered 200 at 7:00:06 AM ET (function_edge_logs), but pg_net gave up after 5 s (net._http_response 22393, timed_out, no body). The body, which would carry send_enabled, was not captured. Older pg_net bodies have aged out.
- public.renewal_reminders has 0 rows ever. With the flag on, a due reminder writes a claim row first. But no one has been due yet: the Base charge is Jan 1, 2027, today is 46 days out, and windowFor(46) is null. So 0 rows is what you'd see with the flag on OR off.
- No "Resend error" or RESEND warnings in the function logs.
- Conclusion: the flag's value can't be proven from runtime evidence. Code (v26 and 1220116b, unchanged logic.ts) sends only when it is exactly "on". **Tomorrow, Tue Nov 17 7:00 AM ET, is the first run where Base subscribers fall in the 45-day window**, so whatever the flag is will matter then. If it is "on", tomorrow's run sends; if not, it only plans. Whether it should be on is a separate Jim/Grant line. Not touched here.

## Rollback
Redeploy the live v26 files saved here: rollback-live-v26/source/index.ts (c318e360), source/logic.ts (1741f4b7), _shared/email_footer.ts (0f9d1019), META.json (v26, ezbr dece2cb7...6dda, verify_jwt false). Same bytes as /workspace/process/evidence/renewal-reminder-live-v26-20261115/. Rollback target: **v26 / ezbr dece2cb7**.

## Deploy form (for after Vera's precheck and Sable's OK via Grant; NOT done)
deploy_edge_function, project cqzvqzwwevnflinxgnpp, name send-renewal-reminders, entrypoint_path source/index.ts, **verify_jwt false** (as live), files from 1220116b: source/index.ts, source/email.ts, source/logic.ts (from supabase/functions/send-renewal-reminders/), _shared/email_footer.ts. Expect v27 and a new ezbr; record both. Don't touch cron job 1 or RENEWAL_BASE_SEND. Don't invoke the function.

## Post-deploy plan
1. get_edge_function: version 27, verify_jwt false, the 4 deployed file sha256s equal the 1220116b files above, record ezbr.
2. Vera reads the live email text: render from the deployed files with this harness (point the imports at the read-back files) and confirm the 2bf843e3 byte rebuild and the 6 BJJ/BB IDENTICAL results still hold, plus From ROMRx <hello@romrx.io> and Reply-To hello@romrx.io.
3. Watch the Tue Nov 17 7:00 AM ET cron run (function_edge_logs status, function_logs errors, renewal_reminders row count only, no addresses printed).

## Deadline
Live before **Tue Nov 17, 7:00 AM ET** (cron job 1's next run, which is also the first 45-day-window run for the Jan 1, 2027 charge).

## Notes / surprises
- pg_net's 5 s timeout is shorter than the function's ~6 s run, so cron's HTTP response bodies aren't captured (the call still completes, 200). Worth knowing for tomorrow's watch: use function logs, not net._http_response.
- Margot's L1143 gate line (9:44 AM ET) already pins 1220116b; this prep matches it.
- Fine print uses romrx.io/app/dashboard/settings, and the Nov 15 build note recorded that route answering 200.
