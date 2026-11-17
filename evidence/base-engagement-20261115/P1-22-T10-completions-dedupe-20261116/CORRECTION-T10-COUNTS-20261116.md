# CORRECTION to RECEIPT-P1-22-T10-COMPLETIONS-BY-DAY-20261116.md (counts only)

Dated Mon Nov 16, 2026, 7:09 PM ET (America/New_York). Written by Avery. The hashed receipt is NOT edited (receipt sha256 700f12dbeddee3355492a179b0284a5508ccc1b910b2fd0a6212b02366f67077; SHA256SUMS-BUILD 1a5fd2ab95202e4e75180e5ebfd9747dbc9d7f8bca9f80589e53d2aa7b0d32ae; SHA256SUMS c77c82afdc3234b8ba4b070f22cf683738139dcf51be1ac76be32adf2d8ec816; all three left unchanged).

Authority: ledger L1191 (Sable OK, conditional; Vera precheck sha8 1036c989), under gate line L1184 and Jim's L1031. Live numbers were re-read (read-only MCP execute_sql only) at 7:09 PM ET (America/New_York) on project cqzvqzwwevnflinxgnpp before this file was written. The live numbers match the figures below. No apply in this step. No secrets or user emails.

## What is stale in receipt 700f12db

The receipt was written at 6:55 PM ET, before L1170 was applied (7:00 PM ET, live id 20261117000045). At that time ops.internal_accounts had 0 rows, so the new view body and live ops.value_actions both returned 22 completion user-days, and M1 was 1:8/5/4, 7:8/3/3, 14:8/3/3, 30:7/2/2 (from live-read/live-counts.json, read 6:53:20 PM ET).

L1170 inserted exactly 5 ids into ops.internal_accounts (prefixes 2ecf5946, 3a024218, 7c71e421, 9b89b8c3, c414e503; live count 5 at 7:09 PM ET). ops.is_excluded_from_metrics now excludes those accounts. Account 7c71e421 has 7 protocol_completions rows. No other listed account has a completion row. 22 minus 7 is 15.

## Corrections (verified live, read-only, 7:09 PM ET)

- The new view body (ops.protocol_completion_days is not created yet; this is a SELECT of the exact view SQL) returns **15** user-days, not 22. Live public.protocol_completions is still 22 rows. Live ops.value_actions still has 22 protocol_completion rows, because T10 is not applied yet; after apply the completion arm will show 15. max raw_rows per day on the 15 is 1.
- Current M1 (ops.retention_m1, live): **1:7/4/3, 7:7/2/2, 14:7/2/2, 30:6/1/1** (eligible / returned_any_action / returned_value_action). T10 must leave these M1 values unchanged.
- **STRIKE** the receipt claim in "What the new view would return on live" (last sentence): "No listed account has a completion row today." That claim is false after L1170. Account 7c71e421 has 7 completion rows. The related clause "ops.internal_accounts has 0 rows today" is also stale: the count is now 5.
- Other stale context in the same receipt, not the count claims but now outdated: "The staff-list insert (L1170, SQL b152a965) is not live" — it is live as 20261117000045. Live list_migrations head is now **20261117000244** p1_22_checkout_deduped_exclude_test (not 20261116144054). Live ops.value_actions viewdef md5 is still **758e3d8ad5cd04297470b0a4af8e3d3b**; columns `user_id:uuid,at:timestamp with time zone,kind:text`, owner postgres, ACL `{postgres=arwdDxtm/postgres,service_role=r/postgres}`, reloptions none. ops.protocol_completion_days does not exist yet.

## Unchanged

Migration bytes 1bd25b2ab28de131727ccfa52cdab91180c3043ac85cc6688fc563b7a1b42af6 and rollback e24bc60be22ac760a8aec1670aa0b444b53477f438b9e2c6dc60cd31ec696f17 are unchanged. This correction does not apply T10 and does not change any data.
