# L1487-SUB-MOVE: sub_1UVa8YDou9Iktbw0s4QIPS7b only. STAGED, NOT RUN. BUILD ONLY.
Built Nov 24, 2026, about 3:40 PM ET (EST). Grant 3:15 PM item (b), 3:16 PM deadline, and 3:20 PM J6 add (Stacy 1518 Part G, sha 66272c03).
The 2 test-mode subscriptions (consents 81f1cf44, 9d287227) are not touched. Nothing here touches 7c71e421 or 076ce453.
Deadline: live and Vera post-checked by Mon Nov 30, 2026, 6:00 PM ET. It MUST be done before Wed Dec 2, 2026, 7:00 AM ET. That is the next renewal cron run, and it would otherwise send the 30-day email naming January 1, 2027.

## Key
- Needs env L1487_STRIPE_KEY: the LIVE Stripe secret key (the same secret the functions read as STRIPE_SECRET_KEY / stripe_secret_key), or a restricted rk_live_ key with Subscriptions write.
- The key holder (Jim) supplies it in their own shell. It is never printed, logged, put in argv or committed. The scripts only check that it starts with sk_live_ or rk_live_.
- No read-only Stripe key exists (LIVE-TRACKER.md:391 PENDING). Even the dry run's GET needs the key holder. I have not read the sub from Stripe. The before values come from the DB.

## Order (each step needs a pin, a Vera precheck and Sable's release)
0. Before this: the D3 renewal set is live (its DEPLOY-CALL), then deploy-set-WEBHOOK-ACK-TRIALEND-MAR1, then Vera's trial_end post-check (Grant 3:16 PM: "sub move only after the trial_end post-check").
   D3 must be live first. If the move happened under v32, the renewal code would still plan Dec 2 / Dec 30 from the consent row. D3 makes it prefer users.base_expiry.
1. Read-only precheck: 2-precheck-readonly.sql. Run Nov 24, 3:38 PM ET: is_21647e5a true, base_status active, base_expiry_et 2027-01-01 12:00, consents 1, consent_trial_end 1798822800, reminder_rows 1, sport entitlements 0.
2. Dry run: `deno run --allow-net=api.stripe.com --allow-env=L1487_STRIPE_KEY --allow-write=. l1487_sub_move.ts`
   - It prints BEFORE, SKIP_FLAGS, WARNINGS and WEBHOOK_SYNC. Stop on any skip flag.
   - The hard aborts are: wrong id; not livemode; status not trialing; trial_end not 1798822800; cancel_at_period_end, cancel_at, canceled_at or ended_at set; a schedule or pause; no default payment method; an excluded user; or past Dec 30, 2026 noon ET.
3. Apply: the same command plus `--apply`.
   - One POST /v1/subscriptions/sub_1UVa8YDou9Iktbw0s4QIPS7b with trial_end=1803920400 and proration_behavior=none.
   - Idempotency-Key L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400.
   - Then a GET of the after state, which must show trialing with trial_end 1803920400.
   - It writes L1487-APPLY-RECORD.json with the real Stripe Date header time and the request id. No secrets, no PII.
   - A rerun is a no-op: it prints "ALREADY MOVED" and exits 0. The same key also dedupes at Stripe for 24 h.
   - No invoice is created. proration_behavior none, and a trialing sub has no charge until the new trial_end.
4. users.base_expiry is corrected by the webhook. Stripe sends customer.subscription.updated, and live v59 index.ts:688-700 (unchanged in the combined set) sets base_expiry from subPeriodEndIso. For a trialing sub that is current_period_end = trial_end = 2027-03-01 17:00 UTC.
   - The webhook only does this if the sub metadata has purpose=base and a user_id. The dry run prints WEBHOOK_SYNC.
   - If base_expiry is still Jan 1 10 minutes later, run 4-fallback-base-expiry.sql. It is pinned to a single row on the sub id, the user prefix and the old value, with before and after selects.
   - The original billing_consents row is NEVER modified. The webhook upserts consents only on checkout.session.completed with ignoreDuplicates, so the move cannot rewrite it.
5. J6 amendment (Stacy 1518 Part G). **Sable decides if a fresh Jim yes is needed.**
   - a. Apply the migration 1-migration-20261124210000_billing_consent_amendments.sql. This is a new table only, append-only by trigger, with RLS owner-read.
   - b. `deno run --allow-read=. render_amendment_sql.ts --terms-version <v>`. The terms version is named by Jules/Stacy and has no default. This prints the one-row INSERT from the REAL record; run it via MCP execute_sql.
   - The dry-run output (3-amendment-insert.DRYRUN.sql) has placeholders and cannot run.
   - Notice A version, sha and sent_at stay NULL until Notice A is sent. Notice A is Stacy 1530 (sha 54ca69e6), after the move, by Thu Dec 17, 2026, only with Jim's yes, and there is NO send path in this set. Then they are filled once; the trigger blocks any later change.
6. Vera post-check (read-only):
   - 2-precheck-readonly.sql now shows base_expiry_et 2027-03-01 12:00 and consent_trial_end still 1798822800.
   - The amendment row shows old 1798822800 and new 1803920400.
   - No new renewal_reminders row for 2027-01-01 after the Dec 2, 7:00 AM ET run.

## Rollback (valid only until Wed Dec 30, 2026, 12:00 PM ET; the script refuses 10 minutes before that)
- Stripe: `l1487_rollback.ts`. Dry run by default; `--apply` makes one POST with trial_end=1798822800, proration none, Idempotency-Key L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800.
  - It aborts unless the sub is trialing at 1803920400 with no cancel or schedule.
  - After Dec 30 noon ET, Stripe cannot set a trial_end under 48 h away, so the move is one-way.
- users.base_expiry: the webhook resyncs it. Otherwise use the swapped fallback SQL.
- Amendment: never deleted. Append a second row with `render_amendment_sql.ts --terms-version <v> --rollback` (kind trial_end_move_rollback).
- Migration: none needed. The table is inert if unused. A DROP would be a delete and needs Jim's yes.

## Cascade check (read-only, counts only, Nov 24 3:39 PM ET; concern 7)
- sport_entitlements: 11 rows. 10 active, 1 canceled, across 10 users.
- 3 have a stripe_subscription_id. 0 are on the live Base sub, 0 on any Base sub, 0 on any consent's sub.
- 0 expire on Jan 1, 2027, and 0 before Mar 1, 2027. 2 have a NULL expiry. 0 have cancel flags. 2 rows belong to excluded users (untouched).
- The user on the moved sub has 0 entitlements.
- So the move cascades into 0 pack rows. The "Canceling Base also cancels your packs" copy stays true: v59 cancelAllSportPacksForUser (:260) is unchanged in the combined set.

## Tests (test-output.txt)
- 9 script tests: constants, skip flags, the after check, no PII in the summary, the exact POST body and idempotency header, and the webhook-sync rule.
- 4 SQL tests in PGlite (in-process Postgres, no network DB):
  - one linked row, the original untouched, a rerun is a no-op
  - no delete, frozen columns, Notice A fill-once
  - rollback appends a second row
  - the dry-run SQL cannot run
