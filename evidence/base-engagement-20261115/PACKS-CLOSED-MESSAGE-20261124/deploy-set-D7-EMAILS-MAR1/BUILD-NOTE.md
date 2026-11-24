# BUILD-NOTE — deploy-set-D7-EMAILS-MAR1 (BUILD ONLY, not deployed)

Sable accepted D7 as its own set (via Grant, 3:36 PM ET Nov 24, 2026). The fast-track is on HOLD. Nothing in this folder was deployed. No Stripe or secret writes.

## Copy (first-hand)

- Stacy S9 from `/workspace/process/evidence/STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md`, sha256 `55c49a8c0bd08b1bd65ea8e38b40b2f1a0883c9f1cb55c7a51303dcf958c9499` (verified).
- Cancel how-to from `/workspace/process/evidence/STACY-JULES-MARCH1-FE-RULINGS-20261124-1518.md`, sha256 `66272c03ecbde78f59f1a3a634ec7764e76efe22a381e2d93d07a544d7358c9e` (verified), Q2 F27, the marketing short line.

S9, verbatim:
ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel.

Q2/F27 marketing cancel how-to, verbatim:
Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings

The staged customer line is S9, then one space, then the cancel line. No other words.

## Lead context

submit-lead-assessment sends this footnote to an anonymous lead who has not signed up (the CTA is Unlock My Dashboard). S9 and the Settings cancel line were still applied, not rewritten, because 66272c03 Q2 names "the welcome, post-assessment and lead emails that carry the F27 line" and gives this exact short marketing line for those emails. BJJ and Bodybuilding welcome / great-job beta lines stay empty, as live.

## Source

Live bytes from MCP get_edge_function, not the repo. One string replaced in each of:

- send-s1-welcome-email v40 `source/index.ts` general `betaLine` (live line 167)
- submit-assessment v50 `functions/submit-assessment/index.ts` general `betaLine` (live line 100, not 99)
- submit-lead-assessment v36 `source/email.ts` footnote (live line 175)

## Tests

`deno test --allow-read tests/d7_emails_mar1.test.ts`: 5/5 passed. See tests/test-run.txt.

## Renders (Vera live-text read)

Recipient in all fixtures is user@example.com only. From/reply-to in the saved HTML uses hello@romrx.io so the fixture stays address-safe; live source from-addresses are unchanged.

- renders/welcome-general.html and renders/welcome-general.txt
- renders/assessment-general.html and renders/assessment-general.txt
- renders/lead-results.html and renders/lead-results.txt (score 85/100 · Building; unlock token example-unlock-token)

## Rollback

Redeploy the live trees:

- send-s1-welcome-email/rollback-live-v40/ → ezbr 99f5d36b, verify_jwt false
- submit-assessment/rollback-live-v50/ → ezbr edb16eb4, verify_jwt true
- submit-lead-assessment/rollback-live-v36/ → ezbr 48c6f464, verify_jwt false
