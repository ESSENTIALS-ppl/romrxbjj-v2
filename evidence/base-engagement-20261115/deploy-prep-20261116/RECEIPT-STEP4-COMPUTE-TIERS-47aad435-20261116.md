# PREP RECEIPT, Step 4: compute-tiers from 47aad435. PREP ONLY, NOT DEPLOYED.

Written Mon Nov 16, 2026, about 9:05 AM ET by Avery.

## Source
- `47aad4358c73f333e34f25e53002fcef432a78a1`, parent `832056dd40bd192a29a176b55dc167ff642dc91f`. The compute-tiers tree is identical at 3b30ab57 (patch a45060c4…) and 47aad435.

## Exact files (live v53 layout; staged `staged/47aad435-compute-tiers/`)
| Deploy name | repo path | sha256 | vs live v53 |
|---|---|---|---|
| source/index.ts (entrypoint) | supabase/functions/compute-tiers/index.ts | d4a94425fdb294b1f6d2f936735a474bf38a9fb84cd9e22b600c254fafdc5355 | changed |
| source/joint_totals.ts | supabase/functions/compute-tiers/joint_totals.ts | a12e0bc3b9dd40737dd7bd1baffbc70d177688344f662fbdc873acfbfb849202 | identical |
| source/pack_recompute.ts | supabase/functions/compute-tiers/pack_recompute.ts | 5bfbafb279635fd4cf153590ae7b5e4f9c61dcb2c121ceae9e3eca60bd2d1e4f | identical |
| _shared/t1_narrow_bands.ts | supabase/functions/_shared/t1_narrow_bands.ts | 007cbe26a4664ae89aec791c7c1f19ce29a6f4dc682096f64b901932f7515127 | identical |

## Diff vs live v53
- `diffs-vs-live/47aad435-compute-tiers-vs-live-v53.diff` sha256 `7f2b60f1117e14dfa056519c697a66ab3efd6acafe158eed42aeb90ba39e1599`. Stat: 1 file changed, 28 insertions(+), 1 deletion(-). Hunks are identical to the gating pack's `76cf1e1f…`.
- Hunk 1 `@@ -205,6 +205,21 @@`: P1-06 guard. If the inserted assessment has check_kind 'quick', it returns 200 `skipped: quick_check_no_rescore` with no rescore or plan rewrite. It runs after the Row 19 caller check and is a no-op when the column is missing.
- Hunk 2 `@@ -212,13 +227,25 @@`: the previous-assessment read adds `.or("check_kind.is.null,check_kind.neq.quick")`. On error (column missing) it falls back to the exact v53 read.

## Tests
- deno check source index.ts: clean (`test-evidence-20261116/47aad435-deno-check.txt`).
- The repo's `compute-tiers/test/*.test.ts` fail on the 47aad435 tree (0/2 runnable under --no-check, type errors under check: `test-evidence-20261116/47aad435-compute-tiers-deno-test*.txt`). They are stale: unchanged since 543cabf and written for older compute-tiers (missing export HIP_FLEX_UNSCORED; header regex /compute-tiers v4\d/), while joint_totals.ts here is byte-identical to live v53. This is pre-existing and not caused by this change. The quick guard is covered by p1-06-quick-test (PGlite 5/5, Nov 15 gating evidence). FYI for Vera.

## Backup / rollback
Live v53 in `live-reads-20261116/compute-tiers-v53/` (4 files). ezbr `6f4c506ac0df2069b8d7bd93844f68e6dfa99f7919f0d448bf96e442730a06ad`, verify_jwt false, entrypoint `source/index.ts`. Redeploy to roll back.

## Deploy command form
MCP `deploy_edge_function`: name `compute-tiers`, entrypoint_path `source/index.ts`, **verify_jwt false (explicit; the tool default is true)**, files = the 4 above from 47aad435. Expected: v54.

## Post-check plan (read-only)
1. `list_edge_functions` / `get_edge_function`: v54, verify_jwt false, 4 files with the sha256 above.
2. `query_logs` for compute-tiers: no boot errors. On the next real full assessment, the call returns success with no `skipped` key, and worst_joints/rom_total get filled: `select id, rom_total is not null, worst_joints is not null, check_kind from public.assessments order by created_at desc limit 1;`
3. No test inserts.
