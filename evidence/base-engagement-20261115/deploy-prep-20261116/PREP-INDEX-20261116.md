# PREP INDEX: Base engagement deploy prep, Mon Nov 16, 2026 (Avery). PREP ONLY.

Folder: /workspace/process/batches/base-engagement-20261115/deploy-prep-20261116/. Written about 9:20 AM ET.
Nothing applied, deployed, published or written to Supabase. No Stripe or Supabase settings touched. No force-push, gc, prune, reflog expire, or branch or tag deletion. No existing file overwritten. /workspace/SHA256SUMS untouched.

Gate for every step: Margot pins the sha → Vera prechecks → Sable OK, relayed by Grant → Avery applies → Vera post-checks.
**Ledger gap:** no 2026-11-16 line exists yet. "Didn't I say go" is not in the ledger (last line L1130, Sun 10:39 PM ET). Margot needs to log Jim's Mon 8:42 AM ET words before the first gate.

## Drift (8:44 AM ET): NONE
submit-assessment v44, lifecycle-emails v2, unsubscribe v12 and compute-tiers v53 have the same ezbr as Nov 15, and the sources are byte-identical to the 10:59 PM ET reads. 179 migrations, head 20261116030659. 030000/031000/031100/031200 are NOT applied. FYI: stripe-webhook v54, create-checkout-session v45.

## Tag (done)
`not-for-deploy-20261116/32633db8`: annotated tag object `2ae520b52cca3fc039dac088d8f7f1fc6aa05ff0` → commit 32633db8e8d4a69987cd9efbcf4899d4d473bf97. Message "Never deploy. Superseded; lifecycle NY fallback carried in 8c9f9120. Grant 2026-11-16." Plain-pushed. `git ls-remote` shows both refs on origin.

## Receipts (sha256)
| Step | File | sha256 |
|---|---|---|
| 0 | RECEIPT-STEP0-LEDGER-AND-DRIFT-20261116.md | `3317bd6cf0bb2f202f2fed66a9f90831cc65438e270303b209bc5935a3d7f1ca` |
| 1a | RECEIPT-STEP1a-UNSUBSCRIBE-e5488088-20261116.md | `1d36d03bcfa0e516b3f6f2d5cb41bf93a7de4644d853690ff8735f5e55594ba7` |
| 1b | RECEIPT-STEP1b-LIFECYCLE-EMAILS-e5488088-20261116.md | `d6ff9aa23b0e57d3a0a796939686f42b526ab0c8aa2f8d5464e6c7aed038db78` |
| 2a | RECEIPT-STEP2a-MIGRATION-030000-20261116.md | `06e0cd75e90f6376b46c0822a4cad62fd04fed88468b8250341820e801f5f906` |
| 2b | RECEIPT-STEP2b-MIGRATION-031000-20261116.md | `37703233ef9df1d7a8226641ba700eee03e6132b72d5d0cf220ab2ac95c0af0a` |
| 2c | RECEIPT-STEP2c-MIGRATION-031100-20261116.md | `b86f653f7862c771ecbb982f5feb7f37f76f2a3fafd25b03b78eeb3df607dc76` |
| 2d | RECEIPT-STEP2d-MIGRATION-031200-20261116.md | `b7a7249af11c2c4cad0369a90750f128fd856299dda8868c3d4167d097af23ec` |
| 3 | RECEIPT-STEP3-SUBMIT-ASSESSMENT-47aad435-20261116.md | `d0bccc4a92e0e45be2107730d4d347399cd7722c6d4f4c15e3a2e5af6ba480c1` |
| 4 | RECEIPT-STEP4-COMPUTE-TIERS-47aad435-20261116.md | `201126cbbf4577c8c9786f052e59b1b899443670e66fdba4a39ec438bc025c76` |
| 5 | RECEIPT-STEP5-HELD-8c9f9120-ANALYSIS-20261116.md | `1d1fd35e27f76c7270a7a7d3ab1b0ff6f2e8907b7d8267b7585cc43d33bb7b07` |
| 6 | RECEIPT-STEP6-CLIENT-8bf3d601-20261116.md | `e7e1be3771c4e8bab36f9c51119f2121405916b7e180e11681cea234510ce3e5` |
| COACHES | NOTE-COACHES-139ebdfc-HOLD-20261116.md | `7cd3584ddbd6e062dc60e70727261de162027013526c4e2cd77037d6a738a61e` |

## Order (Grant) with sources
1a unsubscribe e5488088 → 1b lifecycle-emails e5488088 → 2a 030000 → 2b 031000 → 2c 031100 → 2d 031200 (all from the 47aad435 tree, MCP apply_migration, a pure-rename commit after each) → 3 submit-assessment 47aad435 → 4 compute-tiers 47aad435 → 6 client 8bf3d601 (after 031000). Step 5 (8c9f9120 unsubscribe + lifecycle) HELD for Jim's sender/renewal yes. Coaches 139ebdfc HELD (L1098).

## Things Grant should see
1. Step 1b does not by itself start lapsed emails. Today's cron runs are dry run: send_enabled false, audience canary, 0 canary ids, 0 due. Lapsed sends start only when LIFECYCLE_EMAILS_SEND (plus the audience) is turned on, which is a separate settings step.
2. Step 3 then 4 leaves a short gap where live compute-tiers v53 would rescore a quick row. No app path sends quick. Deploying 4 right after 3 (or before it) closes the gap.
3. Step 5: 8c9f9120 keeps all of e5488088 (a superset; tokens cross-verify, lapsed→protocol). No fix branch was needed. But 8c9f9120 contains NO From/Reply-To change. If Jim's "sender yes" means switching to the new ROMRx address, that change is not built yet.
4. Until Step 5, lifecycle-emails keeps the live Chicago fallback, while the 030000 roll uses New York. Today 0 users have an empty stored timezone, so the impact is limited to invalid stored zones.
5. The deploy_edge_function tool defaults verify_jwt to TRUE. unsubscribe, lifecycle-emails and compute-tiers must be passed false explicitly. submit-assessment stays true.
6. The repo's compute-tiers/test suite is stale (pre-existing, unchanged since 543cabf) and fails on live v53 bytes too. It is not a gating suite.

## Folder contents
- live-reads-20261116/ (live trees + live-meta.json, list_migrations.json, list_edge_functions.json; SHA256SUMS e67f0262…)
- staged/ (exact deploy file sets per sha/function; listed in staged-files.sha256 c6e13d3a…)
- diffs-vs-live/ (tests-excluded diffs; hunks identical to the gating pack's)
- migrations-47aad435/ (the 4 migrations + rollbacks, byte copies)
- schema-snapshots-20261116/ (pre-apply snapshot, ACLs, live defs replaced by 031100/031200, lifecycle cron responses, baseline counts)
- test-evidence-20261116/, step5-evidence/
- _stage.sh, _extract_live.py (helpers)
- SHA256SUMS (all files except itself)
