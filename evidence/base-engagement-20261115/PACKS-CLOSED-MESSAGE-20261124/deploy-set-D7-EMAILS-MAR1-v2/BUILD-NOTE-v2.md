# BUILD-NOTE-v2 — deploy-set-D7-EMAILS-MAR1-v2 (BUILD ONLY, not deployed)

v1 (SHA256SUMS 9cee9f446906222a75e2495525cdd939a5ae36fbac19d23786532640dd53f843, 9cee9f44) was left untouched in deploy-set-D7-EMAILS-MAR1/. This is a new folder. Nothing in this folder was deployed. The fast-track is on HOLD. No Stripe or secret writes. BEFORE was not recaptured; it will be recaptured at deploy.

## v2 source changes

1. submit-lead-assessment `source/email.ts` (the only email-copy change vs v1). S9 is unchanged. The cancel line is exactly:

   Once you subscribe, you can cancel online anytime in Settings: https://romrx.io/app/dashboard/settings

   Combined line: S9, then one space, then that sentence. Welcome and submit-assessment `index.ts` stay byte-identical to v1 (S9 plus the original short Q2/F27 line, "Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings").

2. submit-assessment `functions/submit-assessment/mood_block.ts` (Grant, 3:49 PM ET). Live v50 / v1 sha 763ca702c1692ab443c95bc9af5185f70d30da88ee8cdc4fe8715af14509885d. The consent check in `moodEmailAllowed` now accepts the existing v2 value `v2-email-20261026` (from `ROMOOD_CONSENT_VERSION` in the current code) OR `v3-rombot-20261028`. Any other value or a missing value still omits the block. Nothing else in the file changes. New sha dc510a72b8b7b1ab78939d0b9e9808f97f3740b28bf517d50246c9c66f75debd (dc510a72).

## Copy sources (first-hand, unchanged from v1)

- Stacy S9: `/workspace/process/evidence/STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md`, sha256 `55c49a8c0bd08b1bd65ea8e38b40b2f1a0883c9f1cb55c7a51303dcf958c9499`.
- Q2/F27 short marketing cancel line (welcome and assessment only): `/workspace/process/evidence/STACY-JULES-MARCH1-FE-RULINGS-20261124-1518.md`, sha256 `66272c03ecbde78f59f1a3a634ec7764e76efe22a381e2d93d07a544d7358c9e`.

## Tests

`deno test --allow-read tests/d7_emails_mar1.test.ts tests/mood_block_consent.test.ts`: 9/9 passed. See tests/test-run.txt. Email tests assert the new lead line and that welcome and assessment index.ts match the v1 shas. Mood tests: v2 includes the block, v3 includes the block, any other or missing consent_version excludes it.

## Renders (Vera live-text read)

Recipient in all fixtures is user@example.com only. Welcome and assessment renders are byte-identical to v1. Lead HTML and text were re-rendered for the v2 cancel line.

- renders/welcome-general.html and renders/welcome-general.txt
- renders/assessment-general.html and renders/assessment-general.txt
- renders/lead-results.html and renders/lead-results.txt (score 85/100 · Building; unlock token example-unlock-token)

## Rollback

Redeploy the live trees (same as v1):

- send-s1-welcome-email/rollback-live-v40/ → ezbr 99f5d36b, verify_jwt false
- submit-assessment/rollback-live-v50/ → ezbr edb16eb4, verify_jwt true (restores mood_block 763ca702 as well as the Jan 1 / Dec 31 betaLine)
- submit-lead-assessment/rollback-live-v36/ → ezbr 48c6f464, verify_jwt false

## Checkout status (not part of this set)

Grant, 3:47 PM ET: create-checkout-session is now v53, ezbr cebd7638. Noted in EXPECTED-AFTER. This set does not touch checkout.
