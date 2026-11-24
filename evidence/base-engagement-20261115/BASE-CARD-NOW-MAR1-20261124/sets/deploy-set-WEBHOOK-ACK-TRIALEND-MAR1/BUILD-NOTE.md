# BUILD NOTE: deploy-set-WEBHOOK-ACK-TRIALEND-MAR1 (stripe-webhook). BUILD ONLY, NOT DEPLOYED.
Built 2026-11-24, about 3:28 PM ET (EST), by Avery. Grant asked for it at 3:25 PM ET.
Branch fix/webhook-ack-trialend-mar1-20261124, tip 7e40a102a484a463b40dd3804bd01f218c9dae7d (plain push, checked with ls-remote).
Parent b5ae1a4 = live v59 index.ts byte-exact (sha256 0f895087, the same bytes as da087bb), on main 4ea5edd7.

## Starting point (live)
- list_edge_functions (3:24 PM ET): stripe-webhook v59, ezbr 3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0, verify_jwt false, import_map false, entrypoint source/index.ts. Unchanged since the v59 capture.
- get_edge_function today: the MCP output was cut off at display, so the v59 bytes come from the earlier full capture (live-webhook-v59/files, = git da087bb). That capture's ezbr matches today's list.
- Other _shared imports: the webhook imports only ../_shared/events.ts (logEvent) and ../_shared/arl_copy.ts.
  - events.ts 49f18652 = live v59.
  - email_footer.ts 0f9d1019 = live v59. It is kept in the file set so the layout matches live. The new arl_copy no longer imports it.

## Hunks vs live v59 (DIFF-vs-live-v59.patch, 8 hunks)
source/index.ts (4 hunks):
1. @@ -205 +205: adds trialEndIsoFromSub(sub), which returns the Stripe subscription's trial_end as ISO, or null. Adds subTrialEndIso(stripe, subId), which does a subscriptions.retrieve and returns null on failure (logged, no secrets). writeBillingConsent gains a trialEndIso parameter.
2. @@ -223 +239: in the billing_consents row, `trial_end: new Date(1798822800 * 1000).toISOString()` becomes `trial_end: trialEndIso`.
3. @@ -491 +507: the Base/combo checkout.session.completed call site passes `await subTrialEndIso(stripe, subId)`.
4. @@ -551 +567: the sport_unlock call site passes `await subTrialEndIso(stripe, subId)`. A sport sub with no trial now records NULL; v59 wrongly recorded Jan 1.

_shared/arl_copy.ts (4 hunks; the file is EXACTLY cd9b2617, copied from deploy-set-S1-ARL-MAR1-rev2 and sha-verified):
5. @@ -7 +7: drops `import { POSTAL_LINE } from "./email_footer.ts"`. Versions become ca-arl-3b-2027-03-01-v5 and ca-arl-3c-2027-03-01-v5.
6. @@ -38 +36: disclosureBase becomes S1. BETA_TRIAL_END_UNIX becomes 1803920400 (in hunk 5's context; the webhook does not import it).
7. @@ -63 +61: Base ackLines become S8 verbatim. The combo ack is kept as before (packs closed). The cascade line stays.
8. @@ -103 +117: ackFooter changes from `${POSTAL_LINE}. hello@romrx.io. Full terms: ...` to `ROMRx LLC, Dublin, Ohio. hello@romrx.io. Full terms: ...`.
   FLAG for Vera/Stacy: the webhook ack footer loses the street address. That matches what create-checkout-session's arl_copy (live v50 copy) already had. This is a visible change in the ack email.

## Behavior
- Base and combo acks now render S8 (ca-arl-3c-2027-03-01-v5). email_sent.template_version = ca-arl-3c-2027-03-01-v5.
- billing_consents.trial_end is the subscription's real trial_end: 1803920400 for a trial sign-up, the late-window value inside the last 48 h, and NULL when paid at sign-up or when the retrieve fails. The Jan 1 literal is gone.
- customer.subscription.updated is unchanged. users.base_expiry follows Stripe's current_period_end, so after the L1487 move it becomes Mar 1.
- Everything else is byte-identical in behavior. The test compares every external call vs live v59, except the consent trial_end and the ack email/event.

## Tests (tests/test-output.txt, 13 passed / 0 failed; Deno harness with Stripe, Supabase and Resend mocked, no network)
- arl_copy sha256 = cd9b2617...
- The Base ack text and HTML contain all 8 S8 lines, with no "January 1, 2027", "December 31, 2026" or "Free period". template_version is v5.
- Consent row trial_end is "2027-03-01T17:00:00.000Z" (= 1803920400), and disclosure_text_version is v5 from the session metadata.
- users.base_expiry is 1803920400 on completed, and Mar 1 on customer.subscription.updated after the move.
- v59 on the same session writes Jan 1. That is the bug, shown on the pin.
- No-trial and sport sessions get NULL. A retrieve failure gets NULL. A late-window value is copied exactly.
- Mutants (tests/mutants-output.txt): 7/7 killed; the control survived.

## Not in this set
- The send-renewal-reminders D3 logic is in D3-WEBHOOK-TRIALEND/1-send-renewal-reminders. Its webhook part (2-stripe-webhook) is SUPERSEDED by this combined set; deploy this one, not that one.
