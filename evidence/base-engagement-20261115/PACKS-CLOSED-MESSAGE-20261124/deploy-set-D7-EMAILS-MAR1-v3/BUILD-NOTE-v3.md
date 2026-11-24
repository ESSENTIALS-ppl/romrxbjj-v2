# BUILD-NOTE-v3 — deploy-set-D7-EMAILS-MAR1-v3 (BUILD ONLY, not deployed)

v1 (SHA256SUMS 9cee9f446906222a75e2495525cdd939a5ae36fbac19d23786532640dd53f843) and v2 (SHA256SUMS 58ca4361ff4d4d6ed3b87797598a479f4a72b0b8e301c95b75b529ff378afd4f) were left untouched. Nothing in this folder was deployed. Do not deploy until a fresh BEFORE is recaptured; another live deploy is in flight. The From fix was pre-approved (Sable via Grant, 3:57 PM ET), no recheck.

## Every change against live

1. send-s1-welcome-email `source/index.ts` (live v40, rollback ezbr 99f5d36b)
   - Base (general) From is `ROMRx <hello@romrx.io>` (`fromName: "ROMRx"`, `fromEmail: "hello@romrx.io"`).
   - Customer send now sets `reply_to: b.fromEmail` (hello@romrx.io for Base). Live had no Reply-To on the customer send.
   - Base `betaLine` is S9 plus the Q2/F27 short cancel line, verbatim: "Cancel online anytime in Settings: https://romrx.io/app/dashboard/settings".
   - BJJ and Bodybuilding from lines are unchanged. Signature for Base now reads "ROMRx" because it uses `fromName`. closeLine is unchanged ("This is my personal email...").

2. submit-assessment `functions/submit-assessment/index.ts` (live v50, rollback ezbr edb16eb4)
   - Base From is `ROMRx <hello@romrx.io>` and Reply-To is `hello@romrx.io`.
   - Base `betaLine` is the same S9 + short cancel line as welcome.
   - BJJ and Bodybuilding from/replyTo lines are unchanged.

3. submit-assessment `functions/submit-assessment/mood_block.ts` (live sha 763ca702)
   - Consent check accepts `v2-email-20261026` (current `ROMOOD_CONSENT_VERSION`) OR `v3-rombot-20261028`. Any other or missing value still omits the block.
   - Unchanged from v2. New sha dc510a72b8b7b1ab78939d0b9e9808f97f3740b28bf517d50246c9c66f75debd.

4. submit-lead-assessment `source/email.ts` (live v36, rollback ezbr 48c6f464)
   - Footnote is S9 plus the lead cancel line, verbatim: "Once you subscribe, you can cancel online anytime in Settings: https://romrx.io/app/dashboard/settings".
   - Unchanged from v2. sha 5ae2cb848d6a28472a1522cce8baaca5353ef4e9abec465b546edffbe1141128.
   - `source/index.ts` is unchanged vs live: From already defaults to `ROMRx <hello@romrx.io>` (`RESULTS_FROM`). No Reply-To was added on the lead send.

## Tests

`deno test --allow-read tests/d7_emails_mar1.test.ts tests/mood_block_consent.test.ts`: 9/9 passed. See tests/test-run.txt. Tests assert From and Reply-To on welcome and assessment, and that lead already uses From `ROMRx <hello@romrx.io>`. Mood: v2 includes the block, v3 includes the block, any other or missing consent_version excludes it.

## Renders (Vera)

All six were re-rendered. Recipient is user@example.com only. Text headers include From `ROMRx <hello@romrx.io>` and Reply-To `hello@romrx.io`.

- renders/welcome-general.html sha256 5a4b5641714f2e287a7eccd5f61960421c8abb3b86567cf9062140ede3a6c8d3
- renders/welcome-general.txt sha256 57a238bd7494aee036913e867da710dd9267d7ebb56ee50e48db24995780cc0c
- renders/assessment-general.html sha256 552d966452083c47bef3f4574b0ffde0e9a0465a189efe7b4721fb2136bd8428
- renders/assessment-general.txt sha256 985283a98ce70169c4f5d149e7b36e3af96a99f8f23109a933292e9792245b70
- renders/lead-results.html sha256 ed751b3fceacfba162d66fd30c30cbbed09498af6c2ab6228c8efdc4f5bed53f
- renders/lead-results.txt sha256 78ac89e94aac65e6da73ce83cbc970fe9142a3b70fcc7559a6faa5475d3c285e

## Rollback

Same live trees as v1/v2: welcome rollback-live-v40 (ezbr 99f5d36b, jwt false); assessment rollback-live-v50 (ezbr edb16eb4, jwt true); lead rollback-live-v36 (ezbr 48c6f464, jwt false).
