# Score "Nov 17 = 89, -0 vs Nov 10" diagnosis (read-only; no data change, no deploy), 2026-11-24 ~4:30 PM ET
Checked: live io = r9 768947113 (deploy 6afbc0d6) and combined-v3 tag frozen-20261124/combined-io-fg-v3 = 01954ec4. MyBody.tsx and mobilityBands.ts scoring are the same in both.
Not the cause: sorting and created_at. useProfile and MyBody pick a9b06108 (Nov 17) as latest ("Assessed November 17"), and the radar legend order Nov 17 / Nov 10 / Oct 4 is right. rom_total is never read by My Body or My Protocol.
Root cause: the /100 is computed in the browser (mobilityScoreForAssessment, mobilityBands.ts:599) from the saved degrees. It is then clamped into the overall band (displayPercent/clampPercentToBand): if ANY joint is Needs focus, the /100 is capped at 89.
- Nov 17 (a9b06108): unclamped 93 (server rom_total 94 from compute-tiers, which never clamps). It still has 2 Needs focus joints (hip flexion; shoulder ER 70 deg against the 85 target), so it shows 89.
- Nov 10 (b0d68db1): unclamped 89, Needs focus, so 89. The delta chip compares the two clamped numbers: 89 - 89 = "-0" ("-" is the zero glyph).
- Oct 4: 83 (rom_total 81).
Seed-only: NO. Any real user with a Needs focus joint on two assessments in a row sees the /100 stuck at or below 89 and a 0 change, even when their range improved. ROMBot's "Overall ROM score" reads rom_total (unclamped), so ROMBot can say 94 while the app says 89 for the same assessment.
Fix (client; patch for Jules, NOT published): SCORE-DELTA-PATCH.diff against 01954ec4. It adds mobilityRawScoreForAssessment (the same average without the band clamp) to mobilityBands.ts, and MyBody.tsx's "vs <date>" chip uses it. The dial keeps the clamped /100 (Grant's band rule). Verified on these rows: dial 89, chip +4 vs Nov 10. Needs Grant's OK because it changes what the chip means.
Open for Grant (not done; one ai-chat deploy rule): ROMBot's "Overall ROM score" uses unclamped rom_total, while the app uses the clamped /100. Pick one number for both.
Test data: unchanged (b0d68db1 / a9b06108 not touched). The values are internally consistent; the 89 is the app's rule working as written.
Also recorded: Reid's setup screen on ebfe4f3d forced a Terms tick and age group 30-44 (writes on the test account, from Reid's rerun at about 4:19 PM ET). Not changed or reverted here.
