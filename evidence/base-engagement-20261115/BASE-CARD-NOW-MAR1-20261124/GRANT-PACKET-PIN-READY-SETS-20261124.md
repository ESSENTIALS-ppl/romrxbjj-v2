# Grant packet: pin-ready sets for "Base takes a card now, no charge before Mar 1, 2027". BUILD ONLY.
Nov 24, 2026, about 3:55 PM ET (EST). Nothing deployed. No Stripe writes, no DB writes, no emails. 7c71e421 and 076ce453 were not touched.
The plan files are on the evidence branch, tip in the final reply. Prior plan tip 76b1ece4.

## Deploy order (deadline Mon Nov 30, 2026, 6:00 PM ET: all live AND Vera post-checked; each step has its own pin and precheck)
1. D3-WEBHOOK-TRIALEND: send-renewal-reminders v32 to v33.
2. create-checkout-session S1 rev2 (already staged in PACKS-CLOSED-MESSAGE-20261124; referenced, not duplicated). Then, within minutes, deploy-set-WEBHOOK-ACK-TRIALEND-MAR1 (stripe-webhook v59 to v60).
3. Vera trial_end post-check: a new consent row gets trial_end 1803920400 and the ack is S8 v5.
4. L1487-SUB-MOVE: sub_1UVa8YDou9Iktbw0s4QIPS7b only. Dry run, then --apply. The webhook syncs base_expiry. Then the J6 amendment (Sable decides on a fresh Jim yes).
5. Vera L1487 post-check.
Hard stop: step 4 must be done before Wed Dec 2, 2026, 7:00 AM ET (the next cron run). Otherwise the 30-day email names January 1, 2027.
Later, not by Nov 30:
- Notice A (Stacy 1530, 54ca69e6): after step 5, by Thu Dec 17, Jim's yes. No send path built.
- v6 late-window set plus paid-strings wiring: before Feb 27, 2027, 11:50 AM ET. Plan only.

## Set 1. deploy-set-WEBHOOK-ACK-TRIALEND-MAR1 (stripe-webhook)
- SUMS: 56303a3f2610e99cc5fa1e55887a41bc079f66915b658df4c8e120c2007904f1 (56303a3f). 17 files. -c OK. 0 comment lines.
- Branch fix/webhook-ack-trialend-mar1-20261124, tip 7e40a102a484a463b40dd3804bd01f218c9dae7d.
- Files:
  - source/index.ts 9d7fb502
  - _shared/arl_copy.ts cd9b2617 (= S1 rev2, exact)
  - _shared/email_footer.ts 0f9d1019 (= v59)
  - _shared/events.ts 49f18652 (= v59)
- Deploy: by name stripe-webhook, entrypoint source/index.ts, verify_jwt false (= live), 4 files.
- Rollback: rollback-live-v59/ (index 0f895087, arl 6b550c27, footer, events) = v59 ezbr 3c60342d.
- Diff vs v59 (8 hunks):
  - index.ts (4): trialEndIsoFromSub and subTrialEndIso; writeBillingConsent takes trialEndIso, so :226 no longer hardcodes 1798822800; both call sites pass the subscription's trial_end.
  - arl_copy.ts (4): the S1 rev2 hunks, v5 versions, the constant 1803920400, the S8 v5 ack.
- Tests: 13 passed / 0 failed. Mutants 7/7 killed; the control survived. The ack renders S8 v5, and the consent row gets 1803920400.
- Flag: the ack footer POSTAL_LINE becomes "ROMRx LLC, Dublin, Ohio" (from S1 rev2).

## Set 2. D3-WEBHOOK-TRIALEND (send-renewal-reminders)
- SUMS: fa743209bc2afd70d1d469628f1ff5177681a24a06cb7f9c41ffc176d2281036 (fa743209). 24 files. -c OK. 0 comments.
- Branch fix/base-d3-webhook-trialend-20261124, tip 11821b856f801830b8ff5550abd2a6c3f4b38d91. Its webhook half is superseded by Set 1, and that folder was removed before hashing.
- Files:
  - source/index.ts c9eea026
  - source/logic.ts 7f360f7b
  - source/email.ts 414ed435
  - _shared/email_footer.ts 0f9d1019 (= live)
- Deploy: by name send-renewal-reminders, entrypoint source/index.ts, verify_jwt false (= live), 4 files.
- Rollback: rollback-live-v32/ (6979f0da / 1741f4b7 / e629702b / 0f9d1019) = v32 ezbr 3bcc783c.
- Diff vs v32 (8 hunks):
  - logic.ts (4): first_charge, chargeAt prefers users.base_expiry, isFirstCharge, formatUsd.
  - index.ts (3): a read-only Stripe GET for the card; dry-run first_charge; first-charge template selection.
  - email.ts (1): an appended first-charge template using Stacy's trial-ending wording, plus the cancel how-to.
- Tests: 20 passed / 0 failed. Mutants 12/12 killed; the control survived.
- Renders for Vera: renders/ for Jan 15, Jan 30 and Feb 27, 2027 at $60, .html and .txt, placeholder user@example.com.
- Stacy confirm: the subject ("...ends on" vs Notice B's "...ends"), the "the card on file" fallback, and "for one more year".

### Reminder date table (cron 12:00 UTC = 7:00 AM ET)
| case | 45-day | 30-day | 2-day |
|---|---|---|---|
| moved sub (trial_end Mar 1, 2027 12:00 PM ET) | Fri Jan 15, 2027, 7:00 AM ET | Sat Jan 30, 2027, 7:00 AM ET | Sat Feb 27, 2027, 7:00 AM ET |
| control, not moved | (sent Nov 17) | Wed Dec 2, 2026 | Wed Dec 30, 2026 |
| first renewal Mar 1, 2028 | Sun Jan 16, 2028 | Mon Jan 31, 2028 | Mon Feb 28, 2028 |
| live v32 with the moved sub (bug) | - | Dec 2, 2026, naming Jan 1, 2027 | Dec 30, 2026 |

## Set 3. L1487-SUB-MOVE (sub_1UVa8YDou9Iktbw0s4QIPS7b only; the 2 test subs are untouched)
- SUMS: e8d56ee7290530399a0448e77f47dcbb792268f1d4d83e2867522b2d285c224c (e8d56ee7). 11 files. -c OK. 0 comments.
- Files:
  - l1487_sub_move.ts f5342057
  - l1487_rollback.ts 03616a6d
  - render_amendment_sql.ts 60064e74
  - 1-migration billing_consent_amendments ec40c332 (NOT applied)
  - 2-precheck-readonly.sql da2b97e2
  - 3-amendment-insert.DRYRUN.sql ce8967fe
  - 4-fallback-base-expiry.sql 0706053e (NOT applied)
  - RUN-ORDER.md beb5ac73
  - tests 35d3ecd0 / 67412e05
  - test-output d69957cb
- Move:
  - The default is a dry run: GET and print the before state.
  - --apply makes one update with trial_end=1803920400, proration_behavior=none, and key L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400, then a GET of the after state.
  - Skip flags abort unless the sub is trialing with trial_end 1798822800 (and it is live, has no cancel or schedule, and has a card).
- Rollback: back to 1798822800 with key L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800. Valid only until Wed Dec 30, 2026, 12:00 PM ET.
- Key: a LIVE Stripe secret (STRIPE_SECRET_KEY) or an rk_live_ restricted key with Subscriptions write, set as env L1487_STRIPE_KEY by the key holder and never printed. No read-only key exists (LIVE-TRACKER:391 PENDING).
- base_expiry: the v59/v60 webhook on customer.subscription.updated syncs it if the sub metadata has purpose=base and user_id; the dry run prints WEBHOOK_SYNC. Otherwise use the pinned single-row fallback SQL.
- The consent row is never modified. J6 adds an append-only amendment row with: the parent link, old/new trial_end, Stacy's G2 reason, the real Stripe time, the key and request id, Notice A fields left NULL until sent, the Terms version, and an effective date of Dec 31, 2026. **Sable decides if a fresh Jim yes is needed.**
- Precheck run 3:38 PM ET: base_expiry Jan 1, 2027 12:00 ET, 1 consent at 1798822800, 1 reminder row, 0 entitlements.
- Tests: 13 passed / 0 failed (9 script, 4 SQL in PGlite).

## Set 4. ARL-PAID-STRINGS-MAR1 (library only; not in the Nov 30 batch)
- SUMS: b822a8bfc056c2d071aa83c26ee223ed2e1bc954d95d670e10358953271901f0 (b822a8bf).
- Branch feat/arl-paid-strings-mar1-20261124, tip 97211685dc505a1e98b2fed5bdc0cac8885ab63b.
- arl_copy.ts is c10d534c: cd9b2617 plus 59 appended lines (1 hunk), with the prefix byte-identical. Stacy D1/D3/D4 verbatim, ca-arl-3b/3c-2027-03-01-paid-v1, keyed on now >= 1803920400. The ack is keyed on the session's arl_version.
- Tests: 5/5.
- Wiring rides with the v6 set.

## Notes (NOTES-STACY-1518-SCOPE-ADD-v1.md, 7a6a7637)
- 409 guard design.
- Combo is Base only while PACKS_CHECKOUT_OPEN is not "true". Vera should confirm the env; it is not readable read-only.
- Cascade counts: 10 active pack rows, 0 tied to any Base sub, 0 affected by the move. The cascade copy stays true.
- v6 late-window plan; it removes the remaining Feb 27 noon 503.
- Notice A = Stacy 1530 (54ca69e6), already carrying the Terms sentence.
- Owner ops addresses (jim@...) appear only inside live function source bytes that are already on main. There are no customer addresses.
