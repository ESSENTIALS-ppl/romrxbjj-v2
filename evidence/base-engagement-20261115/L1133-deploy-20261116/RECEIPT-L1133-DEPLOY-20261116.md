# RECEIPT, L1133 DEPLOY: lapsed standalone e5488088 (unsubscribe, then lifecycle-emails)

Written Mon Nov 16, 2026, 9:13 AM ET by Avery. Project cqzvqzwwevnflinxgnpp. Deployed via Supabase MCP deploy_edge_function only.
Approval: Jim L1031 ("Didn't I say go?", Mon 8:42 AM ET via Sable), gate line L1133, Vera precheck VERIFIED 46227c6c, Sable OK relayed by Grant. Covers ONLY this sha and these two functions.

## Source
- Commit `e5488088136e3deb2ca513251f9398fbdf1c23ad`, parent `17c5c9f37d5c4e6f68d0a84e9d06b4efd1f6a7d1`, branch origin/fix/lapsed-unsub-standalone-20261115 (fresh detached worktree /tmp/wt-l1133-e5488088 from origin).
- Patch sha256 (`git show --format= --patch e5488088 | sha256sum`): `54730c72271ed47284501004e278db66e8ce222a85934a65bb47e5205c3d926d` = L1133 pinned value: MATCH.

## Pre-checks (8:56:43 AM ET live read)
- unsubscribe live v12, ACTIVE, verify_jwt false, ezbr `97503ff467084edfe1780bf5d5a8bebfe06939dbfe429da0cd11e4741f790e86`.
- lifecycle-emails live v2, ACTIVE, verify_jwt false, ezbr `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`.
- Live bytes byte-identical to the Nov 15 rollback copies (lapsed-unsub-standalone-20261115/live-reads) and the 8:44 AM read (deploy-prep-20261116/live-reads-20261116). No drift.
- Tree vs live diffs recomputed: unsubscribe `d2dcd112a445ab9d97a8166163157ca50679d41aea7a9f3b330c29d857f301fd` (MATCH receipt 8adba1ed), lifecycle-emails `eca1ee399109582803d5563e0ba3953caa8032e79fc8094acf78693e13ba975b` (MATCH receipt 8adba1ed; hunk content = gating pack 9f4e99ac). Files: diff-vs-live-unsubscribe.diff, diff-vs-live-lifecycle-emails.diff.
- Baseline 8:57:03 AM ET (baseline-pre-deploy.json): email_sends 24 (last send Oct 28), prefs off 7/4/48, cron.job md5 08757cf0..., job 11 runs 7:30 and 8:30 AM ET succeeded.

## Deploys
| | unsubscribe | lifecycle-emails |
|---|---|---|
| Deploy call start (ET) | ~8:57:2x AM (issued after the 8:57:03 baseline read; exact second not clocked). An earlier call at ~8:57:1x was rejected by the tool before sending (too many file refs), so nothing deployed then. | ~8:58:4x AM (issued after the 8:57:41 unsubscribe readback; exact second not clocked) |
| Server updated_at (ET) | 8:57:30 AM | 8:58:53 AM |
| Deploy result returned (ET) | by 8:57:33 AM | by 8:58:57 AM |
| New version | **v13**, ACTIVE | **v3**, ACTIVE |
| New ezbr_sha256 | `cfb084bb0afa91b1399a0fa8e269ad736ae445bd46f535cfd7aeb5c92fba7157` | `d68e443bbcefeafc523b1452bd5fcee82aed76e546e0074e1e78213dbafaf91e` |
| verify_jwt | false (passed explicitly) | false (passed explicitly) |
| entrypoint | source/index.ts (same as live) | source/index.ts (same as live) |
| Readback vs e5488088 tree | byte-identical (5 files, read 8:57:41 AM) | byte-identical (10 files, read 8:59:03 AM) |

## Files deployed (sha256, from readback = tree; tests not uploaded)
unsubscribe v13:
- f78d43b429e93a9f96c6c28a57a398c76b24b6ae7eeeb4417684438fa026377b source/index.ts
- bafad0e893f512a0ae6e1c7e7bdab44af6be49d145aa8410c3465b38fcf5671b source/token_path.ts
- 26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424 _shared/unsub_token.ts
- 7bae6d34db82052977c138ea16c6e993d5afddc0e378f9b2df387241d27cf302 _shared/rate_limit.ts
- 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 _shared/events.ts

lifecycle-emails v3 (only _shared/unsub_token.ts differs from v2):
- c4ec33969ffb7d3396f7450f6c28ab115d9982d91cb635ea8a8a9dd3303d8629 source/index.ts
- 0c920063f0cbceb8a1ebe900ba08c5c8514ae0c936c7acb299005f682692e957 source/handler.ts
- 0c13c9ae9b96e21cf0f2eaace1a26e29b2b74bab38be8de316102b47f2fd4b13 source/logic.ts
- 51c9558cef1eb6ca65a97f99666e8bf0df1bb28ef2063caae731aa80d4c4e40c source/email.ts
- d3d03dd640c1e2df42f3cffbd8b485f1f5ac8ae2dc5742310a621315997cd69c source/score.ts
- edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b source/deletion.ts
- 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b _shared/email_footer.ts
- bb76634e7385bcefdda143a82589e6a387c0de0890e121c0d5ddf7602119a738 _shared/mobility/mobilityBands.ts
- d1845820bf98d7825f5e8a170a4ee714a7e631140ecf75312ede9822ed33870c _shared/mobility/lumbarFlag.ts
- 26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424 _shared/unsub_token.ts

## Rollback targets
- lifecycle-emails: **v2**, ezbr `aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96`. Saved source: `L1133-deploy-20261116/pre-live/lifecycle-emails-v2/` (10 files, SHA256SUMS-pre-live), also `lapsed-unsub-standalone-20261115/live-reads/lifecycle-emails-v2/`. Redeploy with entrypoint source/index.ts, verify_jwt false (becomes v4 with v2 bytes). Roll this back FIRST if both go back.
- unsubscribe: **v12**, ezbr `97503ff467084edfe1780bf5d5a8bebfe06939dbfe429da0cd11e4741f790e86`. Saved source: `L1133-deploy-20261116/pre-live/unsubscribe-v12/` (5 files), also `lapsed-unsub-standalone-20261115/live-reads/unsubscribe-v12/`. Redeploy same way (becomes v14 with v12 bytes).
- Raw pre-live and post-deploy source copies stay on the box only (they carry product From/Reply-To addresses); not pushed to evidence.

## Post-checks (read only; functions never called by me)
- list_edge_functions (39 functions) vs the 8:44 AM read: ONLY unsubscribe (12→13) and lifecycle-emails (2→3) changed. Both ACTIVE, verify_jwt false. submit-assessment v44, compute-tiers v53, stripe-webhook v54, create-checkout-session v45, send-renewal-reminders v26 unchanged.
- Edge logs since deploy: no function log rows at all in the window from 8:57 AM ET (no invocations yet, so no boot yet), hence no boot errors seen. Boot is first exercised by the next cron run.
- 9:12:27 AM ET counts (post-deploy/postcheck-counts-0912.json): email_sends 24 (unchanged, last send Oct 28), prefs off 7/4/48 (unchanged), cron.job md5 08757cf0... (unchanged; renewal cron untouched).
- **9:30 AM ET lifecycle-emails-hourly (job 11) run: PENDING, to be appended in a separate addendum file** (expected: succeeded, 200, send_enabled false, dry_run true, canary_count 0; email_sends still 24; no boot errors).

## Not touched
- LIFECYCLE_EMAILS_SEND was NOT touched (not read, set or changed). No secret or flag values were read or set.
- Renewal cron, send-renewal-reminders and RENEWAL_BASE_SEND not touched. No migrations. 32633db8 and 8c9f9120 NOT deployed. No DB writes, no test submits, no emails.

## STOP
L1134 (migrations) not started. Waits for Vera's post-check and Sable's next OK via Grant.
