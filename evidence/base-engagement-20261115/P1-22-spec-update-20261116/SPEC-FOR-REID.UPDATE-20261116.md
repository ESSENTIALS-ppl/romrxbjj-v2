# SPEC-FOR-REID.md: dated status update, Mon Nov 16, 2026, ~10:13 AM ET (Avery)

This file sits next to SPEC-FOR-REID.md (sha256 8ab12f53…c500, listed in this folder's SHA256SUMS). The original is not edited. Where the two disagree, this update wins.

## Status correction: P1-22 is LIVE
- The spec header ("Migration is UNAPPLIED") is out of date.
- **P1-22 retention measurement is LIVE as migration 20261116030659** (p1_22_retention_measurement, applied Sun Nov 15, 10:06:59 PM ET via MCP). Apply receipt: P1-22-apply-20261115/RECEIPT-P1-22-APPLY-5162a3c3-20261115.md, sha256 **9db2a9cb**…. Vera's post-check: /workspace/vera-verdicts/vera-5162a3c3-P1-22-apply-postcheck-20261115.md, sha256 **c53d6aa0**…, VERIFIED.
- **20261116030255** (p1_22_stripe_checkout_claims) is also LIVE.
- Superseded: 1f07be53 was rolled back and never counted. The live code is 5162a3c3, renamed to its live id in 5366b22c. 040400 (distinct days) and 040600 (revokes) are NOT applied.
- Re-checked on live list_migrations Mon Nov 16 9:51 AM ET: 030255 and 030659 are present; head is 20261116144054.

## Follow-ups (Nov 16): A is built, B is stopped. Neither is applied.
- **A. ops.checkout_completed_deduped excludes test fixtures. BUILT, NOT APPLIED.**
  - Branch fix/p1-22-checkout-dedupe-exclude-test-20261116, commit 3fe9badd6e41f75a042f7ea3d804a6ca488843af, unapplied migration 20261116150000.
  - It uses the same exclusion as ops.v_real_assessed (ops.is_excluded_from_metrics).
  - Read-only, it would return 2 rows (the one real buyer) instead of 4.
  - Receipt: ../P1-22-checkout-dedupe-exclude-test-20261116/RECEIPT-P1-22-CHECKOUT-DEDUPE-EXCLUDE-TEST-20261116.md.
- **B. T10 completions double-count. NOT BUILT, NOT APPLIED.** I stopped because which fix counts as "the T10 fix" is a decision: metric-level completion days, a DB row delete, or writer plus RPC. The question is with Grant in ../P1-22-T10-completions-dedupe-20261116/T10-STOPPED-QUESTION-20261116.md. Until it ships, Grant's ruling stands: report completion days, not rows. The writer isn't live yet, and all 22 live rows are session-level, so no doubles exist today.
- "How to check after apply", checkout line: the live view returns 4 rows today (2 of them fixtures). After A is applied it should return 2.
