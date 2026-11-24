# BUILD NOTE: D3-WEBHOOK-TRIALEND (send-renewal-reminders part). BUILD ONLY, NOT DEPLOYED.
Built 2026-11-24, about 3:30 PM ET (EST), by Avery.
Branch fix/base-d3-webhook-trialend-20261124, tip 11821b85 (plain push, checked with ls-remote).
Live start: v32 ezbr 3bcc783c. get_edge_function today returned the 4 files with sha256 6979f0da / 1741f4b7 / e629702b / 0f9d1019, which match /tmp capture and main 4ea5edd7 byte for byte.
The webhook half is SUPERSEDED by ../deploy-set-WEBHOOK-ACK-TRIALEND-MAR1. It is the same :226 fix, plus the S1 rev2 arl_copy.

## Source of the charge date (Grant 3:15 PM item i)
- users.base_expiry is written by stripe-webhook from the Stripe subscription: subPeriodEndIso, v59 index.ts:301-309. The order is current_period_end, then items[0].current_period_end, then trial_end. It is written on checkout.session.completed and on customer.subscription.created/updated (:662-685).
- For a trialing subscription, current_period_end = trial_end. So after the L1487 move it is 1803920400.
- billing_consents.trial_end is the as-disclosed record. It is used only if base_expiry is NULL.

## Hunks vs live v32 (1-send-renewal-reminders/DIFF-vs-live-v32.patch, 8 hunks)
logic.ts:
1. @@ -42: Reminder gains first_charge: boolean.
2. @@ -72: chargeAt prefers base_expiry. If base_expiry is set and in the past, chargeAt returns null with no consent fallback. The consent trial_end is used only when base_expiry is NULL. Adds isFirstCharge(): the sub's consent has a trial_end and the charge falls within -1 to +180 days of it.
3. @@ -118: planReminders sets first_charge.
4. @@ -128: formatUsd() returns "$60", for P6 {price}.
index.ts:
5. @@ -9: imports. Adds STRIPE_SECRET (same names as the webhook, never logged) and cardOnFile(subId), a read-only Stripe GET with expand default_payment_method that returns brand/last4 or null.
6. @@ -72: the dry-run output includes first_charge.
7. @@ -89: first-charge sends use firstChargeSubject and the buildFirstCharge* templates, for any brand, with "Hi {first name or there}", formatUsd and cardPhrase. Other sends are unchanged.
email.ts:
8. @@ -181: appended only. firstChargeSubject, cardPhrase, firstChargeParagraphs, buildFirstChargeText and buildFirstChargeEmail. The live v26 sport and Base templates are byte-unchanged.

## Wording (Stacy, exact)
- The body is Stacy 1414 P6 with the first sentence replaced by Stacy 1518 concern 15: "Your ROMRx Base beta launch trial period ends on {renewal_date}, and your plan starts automatically." The rest of P6 is unchanged, including the cancel how-to, which 1518 Q2 requires in every email that states a price or charge date.
- <STACY CONFIRM> 1: the subject. P6's subject says "renews" and 1518 gives none, so this uses "Your ROMRx Base beta launch trial period ends on {date}".
- <STACY CONFIRM> 2: when Stripe returns no card, "{card_brand} ending {last4}" falls back to "the card on file".
- <STACY CONFIRM> 3: P6 says "for one more year", which reads oddly for a first charge. Kept verbatim per "rest of P6 unchanged".
- The later yearly renewals (Mar 1, 2028) still use the live v32 renewal template. P6 proper is due by Jan 16, 2028; separate work.

## Reminder dates (tests, America/New_York; cron 12:00 UTC = 7:00 AM EST)
| charge | 45-day | 30-day | 2-day |
|---|---|---|---|
| moved sub (base_expiry 2027-03-01 12:00 PM ET; consent still Jan 1) | Fri Jan 15, 2027, 7:00 AM ET | Sat Jan 30, 2027, 7:00 AM ET | Sat Feb 27, 2027, 7:00 AM ET |
| control: unmoved (base_expiry Jan 1) | (Nov 17 already sent) | Wed Dec 2, 2026, 7:00 AM ET | Wed Dec 30, 2026, 7:00 AM ET |
| P6 Mar 1, 2028 (1835542800) | Sun Jan 16, 2028 | Mon Jan 31, 2028 | Mon Feb 28, 2028 |
- Live v32 run against the moved row on Dec 2, 2026 still plans 30_day for 2027-01-01. That is the bug (test live_v32_bug, run against the rollback bytes). D3 plans nothing in December for that row.
- None of these is Notice B (Feb 8-26, 2027). Notice B stays draft only, with no send path.

## Tests
- tests/test-output.txt: 20 passed / 0 failed. 10 renewal date and wording tests, 1 live-v32 bug proof, and the 9 webhook tests from the same branch.
- tests/mutants-output.txt: 12/12 killed; the control survived.
- Renders for Vera: renders/2027-01-15-45_day, 2027-01-30-30_day and 2027-02-27-2_day (.html and .txt). They use this branch's template code, $60, March 1, 2027, a placeholder recipient user@example.com, placeholder name "Alex" and placeholder card Visa ending 4242. No customer data. Nothing was sent.

## Notes
- The first-charge path makes one read-only Stripe GET per first-charge send. If the key or the call is missing, the wording falls back to "the card on file", and the send still happens.
- The live sub's 45-day row (Nov 17, for 2027-01-01) stays in renewal_reminders. A new 45_day row for 2027-03-01 is a different key, so it sends on Jan 15.
