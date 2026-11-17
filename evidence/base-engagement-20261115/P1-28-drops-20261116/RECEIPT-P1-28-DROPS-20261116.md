# RECEIPT: P1-28 one DROP file per backup table (BUILD ONLY), L1112 / SUMS 4183afb9

Monday Nov 16, 2026, 8:06 PM ET (America/New_York). Avery. BUILD ONLY. No DROP was run against live. No secrets or user emails printed. L1112-pinned files were not overwritten.

## Stopped-run check

P1-28/SHA256SUMS still hashes to 4183afb9fdf98441ac413d9a09928a79bbbbeffe09aaa5d68b7caa3e59981cc2, all 21 entries OK. No per-table DROP files were on disk (only the combined commented P1-28/evidence/drop.sql). Live counts still match. Continued by adding a new folder, not by editing hashed files.

## Branch / commit

- No romrxbjj-v2 code branch (these are not migrations; do not put them under supabase/migrations).
- Evidence will be committed on evidence/receipts-rebuilt-20261115 (see the evidence sha once pushed).
- Patch sha256 / patch-id --stable: n/a (process pack, no repo patch).
- SQL sha256: the eight drop_*.sql hashes below. Rollback sha256: the L1112 per-table restore_*.sql hashes (already pinned; not re-hashed as new files).

## Every DROP file (each `@@ -0,0 +1,24 @@`)

| file | sha256 | table | live rows | CSV sha256 (L1112) | restore sha256 (L1112) |
|---|---|---|---:|---|---|
| drop_rescore_backup_20261021_assessments.sql | 3da6fb4372a313a67c542a3bbc530f5b557d1f022c1d5196c23af59196669260 | public.rescore_backup_20261021_assessments | 21 | 63308fc44f01fdaa76767fa73b71f73c0c01dab2c3c014411f90be85378fa9b3 | bc58ff48a358f01ee44ee51e0965ce2bb3093a785059a49a94dba8ca5e729fb1 |
| drop_rescore_backup_20261021_joint_scores.sql | d71974de0efdc4b22140284f5f8ea42dc9641b98114d0e0728ca03c86be948b0 | public.rescore_backup_20261021_joint_scores | 185 | f78de7456573f78cdf20d9b2c3d27aa4dcc135f9f31cfa1dece6a143c0b1120f | fc789860e3fee6fec87eea7645609fb4e164780a5a2fb2d378881a30aa1725c3 |
| drop_rescore_backup_20261021_protocols.sql | 039a52d12f2379f9e2010c9a357cb5da1d4ccaaa1013853c77a1094f142d66c4 | public.rescore_backup_20261021_protocols | 154 | 16c1c63c8ff974b548850e64cc070a1c1aea89b8be5ce9b6aa24f5d23d3cdb56 | 10fe2ed462b4479b36ea626ba0f340d2202014b3a12ab13c0efd7eb8057e247a |
| drop_lumbar_null_backup_20261021_assessments.sql | 735d08784dbe27ca1647dde87f62aa4beb09394522112fb96f407618c56c6846 | public.lumbar_null_backup_20261021_assessments | 15 | 58cab2dce3b4873c4073424a46ed13b101f1f4d8a1e2252388dee9ad43233ed4 | 219bee2b5c1b36e4c57cd0f07f8a52f839a2f8a0a7f543725891a29204f61792 |
| drop_lumbar_null_backup_20261021_joint_scores.sql | e8d1ec786652013b841ea385db7373c27b38734e1b293289d4c4072665765c3c | public.lumbar_null_backup_20261021_joint_scores | 29 | fdb121f1cb19da49e79b440de975460726e22abd11443c7d21514549543cdee3 | f70167b083d108a0afb260bd762859204cfd3ec04ce3cbd8ffabf8d661805217 |
| drop_lumbar_null_backup_20261021_protocols.sql | 1e6c74168b9783d362fcc951702e863e778fa91a2019ef1087a7ade4a7c05516 | public.lumbar_null_backup_20261021_protocols | 0 | b7fe143438845abe451a3ec56bad4de7a3bdffa52d6321ad22f3918eb52f7372 | a319c881d36bda0de66f4a078c6791ce0a9e6a9e03a736ebdc161361219f181d |
| drop_fg36_rescore_backup.sql | 50bd754bd4d0f81462d08a3da7555797e08e79c7f8c36a6facce7e9dbfe710a2 | public.fg36_rescore_backup | 19 | 523763913d58385a54dcb3843993467b666070a2bb9b2b1c17686b6bb1c46379 | ad2ec93d9ba20cddd9da0d32245d042de2457f4f83aaebbf7010c828df9dd60d |
| drop_fg36_rescore_log.sql | 2ba3ec1382eab0969e6cec9bc15ef3900e8b013e99be9e6fcc15dd927cd0c392 | public.fg36_rescore_log | 18 | 63e2456aa39a1b9ce2c10fee5039c6dd92914ac7cda24d0871cf408c7ce299de | be57122a37ce70187f5a192bb2d1fb03de5160a8418b884f113efefb1ddc358b |

Each file also names pack SUMS 4183afb9fdf98441ac413d9a09928a79bbbbeffe09aaa5d68b7caa3e59981cc2 and restore-all.sql 16aebc1b99aff71710e47d3cb316a521687647d28b181cff961868012f54b203. Statement: `DROP TABLE IF EXISTS public.<table>;` only. No CASCADE.

Note: INVENTORY.md still lists the v1 fg36_rescore_backup.csv sha 59590f0d…; the DROP uses the L1112 pin 52376391… (CORRECTION-INVENTORY-FG36-CSV-SHA.md). INVENTORY.md was not edited.

## Live read-only, 8:02 PM ET

All eight tables present. Counts as in the table above (same as Nov 15). 0 incoming foreign keys. RLS enabled, not forced, 0 policies, no primary key, owner postgres, grants postgres + service_role ALL only.

## Tests

PGlite 0.5.16, **100/100 ALL PASS**, results.json 03953474f960d6e13b8d3100e9215d4cbba85b9ca7c25a32de217e4f7ac5f97d. Isolated drop removes only the target. Restore (pinned file) → drop → DISCARD TEMP → restore restores the pinned counts, including the 0-row lumbar protocols table.

## Open questions

1. Each DROP still needs its own gate line naming the table, its CSV sha, and its restore sha, plus Vera pre and post (L1047(3), L1112). This pack is the bytes for those lines, not the lines themselves.
2. If live row counts drift before apply, STOP and re-export; these files assume the counts above.
3. Apply one table at a time, via a separately gated statement, not a combined drop. Do not use MCP apply_migration for a DROP of a backup table unless the gate line says so; these are one-shot SQL, not schema-history migrations.
4. Account 7c71e421 was not specially queried. The CSVs are full-table dumps already on disk from Nov 15.

## Not done

No DROP has run. Not gated tonight.
