# RECEIPT, L1134 step 4: compute-tiers from 47aad435 DEPLOYED as v54

Written Mon Nov 16, 2026, 9:48 AM ET by Avery. MCP deploy_edge_function only. Deployed immediately after step 3 (gap 9:42:43 → 9:42:53 AM ET call, about 20 s between the two server updates).

## Pin check (L1138) before deploy: PASS
- Recomputed diff vs live v53 (`diff-vs-live-compute-tiers-v53.diff`, labels live/supabase vs branch/supabase as the gating pack): sha256 **`76cf1e1fa3110c57e8fbb6135b2a339c62c9cf99c7a4551c4ffc65ee74247b4d`** = L1138 pin. MATCH.
- 47aad435 compute-tiers/index.ts sha256 **`d4a94425fdb294b1f6d2f936735a474bf38a9fb84cd9e22b600c254fafdc5355`** (starts d4a94425). MATCH.
- Live v53 was byte-identical to the 8:44 AM prep read at 9:36 AM ET.

## Deploy
- Call issued 9:42:53 AM ET; server updated_at 9:42:59 AM ET; result by 9:43:04 AM ET.
- **v54, ACTIVE, verify_jwt FALSE** (explicit, same as v53), entrypoint source/index.ts (same as v53; resolved path `…_54/source/source/index.ts`, same layout as v53). ezbr **`f4c62a384310b5db2966b566ad1085c61733aa4653853cb34b50c7f17e33170b`**.

## Readback (9:43:13 AM ET): 4 files, byte-identical to the tree
| file | sha256 | vs v53 |
|---|---|---|
| source/index.ts | d4a94425fdb294b1f6d2f936735a474bf38a9fb84cd9e22b600c254fafdc5355 | changed (P1-06 quick guard + previous-read filter) |
| source/joint_totals.ts | a12e0bc3b9dd40737dd7bd1baffbc70d177688344f662fbdc873acfbfb849202 | identical |
| source/pack_recompute.ts | 5bfbafb279635fd4cf153590ae7b5e4f9c61dcb2c121ceae9e3eca60bd2d1e4f | identical |
| _shared/t1_narrow_bands.ts | 007cbe26a4664ae89aec791c7c1f19ce29a6f4dc682096f64b901932f7515127 | identical |

## Rollback target
- **v53**, ezbr `6f4c506ac0df2069b8d7bd93844f68e6dfa99f7919f0d448bf96e442730a06ad`, verify_jwt false. Saved source: `L1134-deploy-20261116/pre-live/compute-tiers-v53/` (4 files), also `deploy-prep-20261116/live-reads-20261116/compute-tiers-v53/`. Redeploy with entrypoint source/index.ts, verify_jwt false (becomes v55 with v53 bytes).

## Post-checks (read only)
- list_edge_functions: only submit-assessment and compute-tiers changed (see step 3 receipt).
- Edge logs from 9:42 AM ET: no compute-tiers rows (no traffic yet, no boot errors seen).
- No assessment writes by me.
- Roll cron (job 13 roll-next-check-at-hourly, '20 * * * *'): first run is **10:20 AM ET**. Result goes in a separate addendum file (ADDENDUM-L1134-ROLL-CRON-1020-20261116.md), not in this receipt.
