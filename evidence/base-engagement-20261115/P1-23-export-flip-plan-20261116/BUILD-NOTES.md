# BUILD-NOTES: P1-23 EXPORT_MY_DATA / SHOW_EXPORT_MY_DATA flip plan

Monday Nov 16, 2026, 8:06 PM ET (America/New_York). Avery. BUILD ONLY. No flip, no publish, no secret change, no deploy, no function invoke tonight.

A previous run of this work was stopped by a rate limit. Checked first: no P1-23-export-flip-plan-20261116 folder, no unhide branch, evidence origin still at a1dce4e. Continued from that baseline. Existing Nov 15 P1-23 backend receipts were not overwritten.

## Hunks (new files in this pack only; no repo code commit)

1. FLIP-PLAN.md @@ -0,0 +1,56 @@ — the plan: live state, flag semantics, order (secret first, then unhide publish), exact one-line Settings.tsx hunk, out of scope, gate needs.
2. ROLLBACK.md @@ -0,0 +1,11 @@ — UI restore first, then set the secret to not-on, 503 read-back.
3. HELD-BACK-FROM-GIT.md @@ -0,0 +1,7 @@ — no Settings.tsx / yourDataCopy.ts patch in git (address rule).
4. RECEIPT-P1-23-EXPORT-FLIP-PLAN-20261116.md @@ -0,0 +1,38 @@ — this receipt.
5. SHA256SUMS — hashes of the files in this folder (not /workspace/SHA256SUMS).

No SQL. The backend flag is an Edge Function secret, not a table setting. SQL + rollback sha256: n/a; rollback is ROLLBACK.md.

## Tests

None to run for a plan pack. Live list_edge_functions and the 29eb4fa6 Settings.tsx constant were read only. The 503/401 read-back was not repeated tonight (would require using the anon key; the Nov 15 post-check already established the off behavior, and the secret was not touched).

## Not changed

EXPORT_MY_DATA, SHOW_EXPORT_MY_DATA, SHOW_DELETION_STATUS, live functions, romrx.io, cron, other send flags, /workspace/SHA256SUMS, hashed Nov 15 P1-23 files.
