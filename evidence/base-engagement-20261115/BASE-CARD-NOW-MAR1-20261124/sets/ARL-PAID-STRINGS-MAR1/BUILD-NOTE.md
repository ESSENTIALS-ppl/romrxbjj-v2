# BUILD NOTE: ARL-PAID-STRINGS-MAR1 (Grant 3:20 PM item 3). BUILD ONLY, NOT DEPLOYED. LIBRARY ONLY.
Built Nov 24, 2026, about 3:50 PM ET (EST). Branch feat/arl-paid-strings-mar1-20261124, tip 97211685 (from 7e40a10, the WEBHOOK-ACK set).
Why separate: _shared/arl_copy.ts is pinned at cd9b2617 in both S1 rev2 (checkout) and deploy-set-WEBHOOK-ACK-TRIALEND-MAR1. The paid strings must not change those Nov 30 pins.
Not deployable alone. Nothing calls the new exports yet. Call-site wiring goes with the v6 late-window set: checkout uses baseCheckoutCopy(), the webhook ack uses baseAckCopy(meta.arl_version), and the remaining 503 is removed. Plan only; due before Feb 27, 2027, 11:50 AM ET.

## Hunks vs cd9b2617 (DIFF-vs-cd9b2617.patch: 1 hunk, append only, +59 lines; the first 200 lines are byte-identical, checked with cmp)
1. @@ end of file: adds
   - ARL_DISCLOSURE_VERSION_PAID "ca-arl-3b-2027-03-01-paid-v1" and ARL_ACK_VERSION_PAID "ca-arl-3c-2027-03-01-paid-v1"
   - inPaidPeriod(now), which is the same as now >= 1803920400 * 1000
   - disclosureBasePaid (D1), consentTextBasePaid (D3), ackLinesBasePaid / ackHtmlBasePaid / ackTextBasePaid (D4)
   - baseCheckoutCopy(price, now): returns version, disclosure, consent and trialEndUnix (null when paid)
   - baseAckCopy(price, sessionVersion, now): paid if the session version is the paid version, or if there is no version and now >= 1803920400
   - The v5 ack/disclosure output is unchanged.
## Wording
- D1, D3 and D4 are Stacy 1518 Part D verbatim. A script compared lines 212, 214 and 216-221 of the 1518 file at $60 with the test literals: all True.
- D2 (the app disclosure) is app code. It is the same as D1 with $${base}, and goes with the v6 app change.
- Flag for Stacy: D4 has no "Canceling Base also cancels any sport packs." line, while v59 still cascades (concern 7). Verbatim as given; Stacy may add it.
## Tests: tests/test-output.txt, 5 passed / 0 failed
- the versions
- the switch at exactly 1803920400 (one ms before is v5 with trial_end 1803920400; at the instant it is paid with no trial_end)
- D1 and D3 verbatim
- D4 verbatim, with the session-version keying (a v5 session delivered after noon still gets the v5 ack)
- no "free", "trial", "March 1, 2027" or "first charge" in any paid string
## Rollback: none needed (inert until called). The base-cd9b2617/arl_copy.ts bytes are the prior file.
