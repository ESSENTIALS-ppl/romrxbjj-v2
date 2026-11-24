# RECEIPT: L1487 J6 amendment (LIVE DB WRITE), project cqzvqzwwevnflinxgnpp
Released by Sable via Grant at 3:48 PM ET, Nov 24, 2026 (Jim L1487; Sable L1495(3) and L1529). Done by Avery, 3:50-3:53 PM ET (EST).
Set L1487-SUB-MOVE: SUMS e8d56ee7, `sha256sum -c` OK (11/11) before starting.
Writes went through MCP only: 1 apply_migration and 1 execute_sql INSERT. No CLI db push. No Stripe write. No send. No function invoke.
7c71e421 and 076ce453 were not touched (0 amendment rows for them).

## 0. Stripe checked first-hand (read-only MCP, livemode, acct_1T2zsZDou9Iktbw0). It matches before.json (2b40a836) and after.json (d3ac2f8a)
- sub_1UVa8YDou9Iktbw0s4QIPS7b: metadata user_id 21647e5a-cca0-48c8-8203-1786db2f39d3, purpose base. Status trialing.
- trial_end, billing_cycle_anchor and the item current_period_end are all 1803920400 (Mar 1, 2027 12:00 PM ET). Before, all were 1798822800.
- Price 6000 / year ($60). 1 invoice (in_1UVa8YDou9Iktbw0xzuiiSKH) at total $0, paid, subscription_create. 0 charges. No cancel. Card on file.
- Real Stripe update time: event evt_1UfQc7Dou9Iktbw0e4nsgWG4, created 1795553215 = Nov 24, 2026, 3:46:55 PM ET. It is the only customer.subscription.updated event, with previous trial_end and anchor 1798822800. Request req_Zk5MfeLxZpWOr9, idempotency key 8175e3b9-4e8c-4776-bb73-6592ca922ca6.
  - after.json has no Stripe-issued update time; its captured_at, 3:47:23 PM ET, is a later capture. The Stripe event time is the one used.

## 1. BEFORE (3:51:20 PM ET)
- billing_consents 08071ffd-8810-444b-a801-595c9ac6557d (the only row for this user and sub): offer base, livemode, amounts [6000], trial_end 1798822800, version ca-arl-3b-2026-09-29-v3. Row sha256 5969fb48d7f3a2cb7dde913feda67031e6a5c6b65b05fc643eea3ceafe9cc5c8.
- users 21647e5a-cca0-48c8-8203-1786db2f39d3: base_status active, base sub as above, base_expiry ALREADY 2027-03-01 17:00 UTC (1803920400). The live webhook synced it from the 3:46:55 PM event. Not canceled, tier free, no legacy markers. Row sha256 252e5441179a129cad87320f817fb4ec1cd6941227d050d73713216a16e0cba6.
- renewal_reminders 3edf1fb8-e464-4810-a22d-97369ac4e226: 45_day, subscription_expiry 2027-01-01, sent Nov 17, 2026, 7:00 AM ET. The only row.
- billing_consent_amendments did not exist, so migration ec40c332 was genuinely needed.

## 2. WRITES
- apply_migration `billing_consent_amendments`: the set file 1-migration-20261124210000_billing_consent_amendments.sql (ec40c332, 4063 bytes). Recorded as version 20261124205135. The table has RLS on (owner read) and the append-only trigger billing_consent_amendments_guard.
- INSERT, 1 row: billing_consent_amendments **8e32fba3-96f8-4dbe-b9d7-5f05160a4034**. It was guarded on the parent id, user, sub, livemode, offer, trial_end 1798822800 and the parent row's sha 5969fb48.
  - parent_consent_id 08071ffd-8810-444b-a801-595c9ac6557d, kind trial_end_move
  - old_trial_end 1798822800, new_trial_end 1803920400
  - reason 'L1487 beta launch trial period moved to March 1, 2027' (exact)
  - stripe_changed_at 2026-11-24 20:46:55+00 (3:46:55 PM ET, the Stripe event); recorded_at 2026-11-24 20:51:45.302658+00 (3:51:45 PM ET, the insert time)
  - stripe_idempotency_key 8175e3b9-4e8c-4776-bb73-6592ca922ca6, stripe_request_id req_Zk5MfeLxZpWOr9
  - notice_version, notice_sha256 and notice_sent_at NULL
  - terms_version **terms-2026-12-31-v1**, terms_effective_date 2026-12-31, livemode true
  - Row sha256 2c56e7a77bce84fc0b1609cf3d18d7caa47b814967f7def64d76e0541fede993.
- users: NO write. base_expiry was already 1803920400 (step 3 of the set: "webhook syncs base_expiry"). The fallback SQL was not needed.
- billing_consents: NO write.

## terms_version source
- Grant 3:48 PM: 'terms-2026-12-31-v1', said to come from Jules's Terms branch header "Last updated November 24, 2026. Effective December 31, 2026."
- First-hand check: on ESSENTIALS-ppl/romrx-io-web, branch feat/march1-terms-s2s6-20261124 (b075d9c, Nov 24, 3:22 PM ET), legal.html has "Last updated October 28, 2026" (:29) and "Last updated November 16, 2026" (:92).
  - It has NO "Last updated November 24, 2026. Effective December 31, 2026." header, and the string terms-2026-12-31-v1 is not in it.
  - No other 20261124 branch on romrx-io-web has it in legal.html. No branch matching terms or legal is on romrxbjj-v2.
- **The mismatch is reported. I used Grant's string, as instructed.**

## 4. AFTER (3:51:55 PM ET)
- billing_consents 08071ffd: sha256 5969fb48d7f3a2cb7dde913feda67031e6a5c6b65b05fc643eea3ceafe9cc5c8, byte-identical to before. trial_end still 1798822800. 1 consent for the user.
  - The other 2 consents (026893c3 0a95e0ec, e77ed677 e82d8c78) were not touched.
- users 21647e5a: sha256 252e5441179a129cad87320f817fb4ec1cd6941227d050d73713216a16e0cba6, the same as before.
- renewal_reminders: unchanged (only 3edf1fb8).
- billing_consent_amendments: 1 row (8e32fba3, sha 2c56e7a7).

## 5. Dry-run READ of the reminder selection (dryrun_reminders.ts over the real AFTER rows; output in dryrun-output.tsv; nothing sent, nothing invoked)
| run, 7:00 AM ET | live v32 (deployed now) | D3 v2 (staged, not deployed) |
|---|---|---|
| Wed Dec 2, 2026 | **SELECTS 30_day, naming 2027-01-01** | not selected |
| Wed Dec 30, 2026 | **SELECTS 2_day, naming 2027-01-01** | not selected |
| Fri Jan 15, 2027 | 45_day for 2027-03-01 (old renewal template) | 45_day for 2027-03-01, first_charge |
| Sat Jan 30, 2027 | 30_day for 2027-03-01 | 30_day for 2027-03-01, first_charge |
| Sat Feb 27, 2027 | 2_day for 2027-03-01 | 2_day for 2027-03-01, first_charge |

**The Dec 2 check FAILS under the live code.**
- live v32 chargeAt (logic.ts:76-83) prefers a future consent trial_end. The consent must stay untouched, so 08071ffd still says Jan 1.
- No allowed DB write fixes this. users.base_expiry is already Mar 1.
- The fix is deploying D3 (send-renewal-reminders) before Wed Dec 2, 2026, 7:00 AM ET. With D3, Dec 2 and Dec 30 are not selected, and Jan 15, Jan 30 and Feb 27 are.
- I did not invent a workaround, for example pre-claiming renewal_reminders rows, because that was not released.

## 6. Rollback: ROLLBACK-NOT-RUN.sql (by id; NOT run)
- Valid until Wed Dec 30, 2026, 12:00 PM ET. It raises after that, and it goes with the Stripe rollback only.
- It appends a trial_end_move_rollback row linked to 8e32fba3. No delete; the trigger forbids it.
- It has an optional single-row users.base_expiry revert by id.
