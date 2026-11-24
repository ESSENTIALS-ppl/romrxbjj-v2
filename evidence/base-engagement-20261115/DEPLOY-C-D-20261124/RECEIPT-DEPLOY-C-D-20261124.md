# RECEIPT: LIVE DEPLOY c (D7 emails) and d (D3 renewal), project cqzvqzwwevnflinxgnpp
Released by Sable via Grant at 3:57 PM ET, Nov 24, 2026. The prior deploy (a, b, ROMOOD) finished at 4:00 PM ET. Done by Avery, 4:04-4:08 PM ET (EST).
All deploys were by name through MCP deploy_edge_function, with an MCP list_edge_functions before and after each one.
No invokes, no sends, no secret or env changes (RENEWAL_BASE_SEND untouched), no cron. 7c71e421 and 076ce453 were not touched.
Set checks before deploying: D3-WEBHOOK-TRIALEND-v3 SUMS 50f204bb, `-c` OK. deploy-set-D7-EMAILS-MAR1-v3 SUMS 81f8be3b47a7d3844bad2423a0ea8dc13c6f7358e36bf85395963fc680d2897a, `-c` OK.
BEFORE (0-BEFORE-d.tsv, 4:04 PM ET): 42 functions. All four targets matched their staged rollback ezbrs.

| # | function | before | after | updated_at (ET) | verify_jwt | live files vs set | rollback |
|---|---|---|---|---|---|---|---|
| d | send-renewal-reminders | v32 3bcc783c19962ebd2ce0e0e207b37f089a79fca8e729015706010b08c50acf22 | v33 c7dd83a89e9ff9c3d69d407f5ecba3d7f6e7c0f6c838a55deb495ae12383b514 | 4:05:33 PM | false = live | 4/4 MATCH (index c9eea026, logic 7f360f7b, email f4ab656c, footer 0f9d1019) | D3 v3 rollback-live-v32/, verify_jwt false, ezbr 3bcc783c |
| c1 | send-s1-welcome-email | v40 99f5d36bcefd3ffb08b99c5570a757077bc0ac7fd6a66af8319ec38706c80d85 | v41 d5fef9ba13a20377188c326c73db8817daaf3736ba9a5fb09ffa79b870065bd3 | 4:06:09 PM | false = live | 3/3 MATCH (index 68da5e9b, events 49f18652, footer 0f9d1019) | D7 v3 send-s1-welcome-email/rollback-live-v40/, verify_jwt false, ezbr 99f5d36b |
| c2 | submit-assessment | v50 edb16eb4a277349df487359f8e087f3f99ecf0c3ebaedadf2b738bc5014d1296 | v51 e375f699c55686cc627356fbc9daabb8f920f20a542001be4cb36f666c58c0d5 | 4:07:01 PM | true = live | 7/7 MATCH (index 58c759f8, mood_block dc510a72, schedule c28532c8, capture d14764c6, footer 0f9d1019, events 49f18652, rate_limit f3a82f1d) | D7 v3 submit-assessment/rollback-live-v50/, entrypoint functions/submit-assessment/index.ts, verify_jwt true, ezbr edb16eb4 |
| c3 | submit-lead-assessment | v36 48c6f464cbff37e67c3e0a60fb450b2e6a949fb9ab59475da5190e2df5a1dddf | v37 9f1279483ad292b87989ac888a3e416565a23ac72bb2d088b5a7948e36f9f099 | 4:08:05 PM | false = live | 6/6 MATCH (index 7132917a, email 5ae2cb84, capture d14764c6, events 49f18652, rate_limit f3a82f1d, t1_narrow_bands 007cbe26) | D7 v3 submit-lead-assessment/rollback-live-v36/, verify_jwt false, ezbr 48c6f464 |

Note: Grant's brief put "mood_block dc510a72" under submit-lead-assessment. Per the set, mood_block.ts belongs to submit-assessment, and it was deployed there (c2). submit-lead-assessment has no mood_block.
The live file hashes come from MCP get_edge_function and are compared to the set by verify_files.py (*-LIVE-FILES-*.txt).
A few small _shared files (capture_methods, events, footer) were passed inline, because MCP allows at most 4 file substitutions per call. Their live hashes match the set, as above.

## Only-the-target-changed proof (diffs of consecutive lists; the files are in this folder)
- 0-BEFORE-d to 1-AFTER-d: only send-renewal-reminders (ezbr and updated_at).
- 1-AFTER-d to 2-AFTER-c1: only send-s1-welcome-email.
- 2-AFTER-c1 to 3-AFTER-c2: only submit-assessment.
- 3-AFTER-c2 to 4-AFTER-c3: submit-lead-assessment (mine) **AND get-coach-roster v26 8945b54b to v27 a61ad780c7b7ca8d1b04010212db1d56d267b60b24d251469a9f44b2ef5975c0, updated_at 4:07:05 PM ET. NOT deployed by me.**
  - I made no call for get-coach-roster. It landed 4 seconds after my submit-assessment deploy, by someone else running in parallel.
  - So the c3 interval cannot prove "only the target changed". The other three intervals are clean.
  - **Grant/Sable: identify who deployed get-coach-roster v27 at 4:07:05 PM ET.** I did not roll it back or touch it.
- Count stays at 42 functions. Nothing else differs from BEFORE.

## Rollback (not run)
Each rollback is a deploy by name of the rollback-live-vN files in the set, with the same entrypoint and verify_jwt. The expected ezbrs are in the table.
Rolling back d re-opens the Dec 2 and Dec 30, 2026 7:00 AM ET reminders naming January 1, 2027 for user 21647e5a (see the L1487 dry run).

## Post-check for Vera (read-only, not done here)
- d: the next cron run is Wed Nov 25, 7:00 AM ET. renewal_reminders should get no new row naming 2027-01-01 for user 21647e5a.
- c: the renders in deploy-set-D7-EMAILS-MAR1-v3/renders/.
