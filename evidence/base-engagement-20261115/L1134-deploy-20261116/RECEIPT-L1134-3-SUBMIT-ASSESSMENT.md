# RECEIPT, L1134 step 3: submit-assessment from 47aad435 DEPLOYED as v45

Written Mon Nov 16, 2026, 9:47 AM ET by Avery. MCP deploy_edge_function only. Gate as in RECEIPT-L1134-2a-030000.md. Deployed only after all four migrations (2a to 2d) were live and read back.

## Source
- Commit `47aad4358c73f333e34f25e53002fcef432a78a1` (fresh worktree from origin), patch (comment-only tip) 6308bf22…
- Diff vs live v44 (recomputed today, `diff-vs-live-submit-assessment-v44.diff` sha256 cf2567498d1573b2020abda32371715770d7be4974557f0ec1535217d39b62d7; labels live/functions vs branch/functions): 2 files changed, +275 -2 (index.ts changed, schedule.ts new), same hunks as prep 630bf123 / gating pack d43f3976 (labels differ only).

## Deploy
- Call issued 9:42:21 AM ET; server updated_at 9:42:39 AM ET; result by 9:42:43 AM ET.
- **v45, ACTIVE, verify_jwt TRUE** (passed explicitly, same as v44), ezbr **`edb16eb4a277349df487359f8e087f3f99ecf0c3ebaedadf2b738bc5014d1296`**.
- entrypoint_path `functions/submit-assessment/index.ts` (prep receipt form; same file names as the live v44 readback). Note: the server's resolved path is now `…_45/source/functions/submit-assessment/index.ts`, where v44's was `…_39/source/supabase/functions/submit-assessment/index.ts` (v44's layout came from an older CLI-style deploy). Same entry file and same relative `../_shared/` imports; flagged for Vera as a layout note, not a code change.
- 4 files by file reference, 3 pasted (events.ts, email_footer.ts, capture_methods.ts); readback proves bytes.

## Readback (9:42:51 AM ET): 7 files, each byte-identical to the 47aad435 tree
| file | sha256 |
|---|---|
| functions/submit-assessment/index.ts | ef5f8407987fd79ea6c67a2f8b6e7761d1832eb8094d330a117bda798f6bc1b2 |
| functions/submit-assessment/schedule.ts (new) | c28532c8f029ea9e96eb9f7f5cfdc78ce1db5230b9bf4056f3f40e902b015962 |
| functions/submit-assessment/mood_block.ts | 763ca702c1692ab443c95bc9af5185f70d30da88ee8cdc4fe8715af14509885d |
| functions/_shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 |
| functions/_shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 |
| functions/_shared/email_footer.ts | 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b |
| functions/_shared/capture_methods.ts | d14764c60e06cb82853b2d16aca203e188c227fe6544dae9f266054fab282c4e |

## Rollback target
- **v44**, ezbr `110f365775b57b68977c68627ef2cda1645aae09a4ef23944555de8fcb0ff19a`, verify_jwt true. Saved source: `L1134-deploy-20261116/pre-live/submit-assessment-v44/` (6 files, SHA256SUMS-pre-live c9e4111d…), also `deploy-prep-20261116/live-reads-20261116/submit-assessment-v44/`. Redeploy those 6 with verify_jwt true (becomes v46 with v44 bytes). Roll this back BEFORE any 030000 rollback (Vera W4).

## Post-checks (read only)
- list_edge_functions (39): only submit-assessment (44→45) and compute-tiers (53→54) changed vs the L1133 post-deploy list. unsubscribe v13, lifecycle-emails v3, send-renewal-reminders v26, stripe-webhook v54, create-checkout-session v45 unchanged.
- Edge logs from 9:42 AM ET: no rows for submit-assessment (no traffic yet, so no boot yet; no boot errors seen). First real boot comes with the next real submit.
- No assessment writes by me, no test submits. assessments 22, check_kind full 22 / quick 0.
- QUICK_CHECK_ON stays false; client 8bf3d601 not deployed by me (L1135, separate gate).
