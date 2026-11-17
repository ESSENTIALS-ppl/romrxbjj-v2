# RECEIPT: P1-28 eight backup tables DROPPED (L1237–L1244, L1250)

Written Mon Nov 16, 2026, 8:22 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. MCP execute_sql only, one-shot SQL, exact drop-file content (comments plus one `DROP TABLE IF EXISTS public.<table>;`, no CASCADE). NOT apply_migration, not combined, no other tables touched. Rollback (L1112 restore set, SUMS 4183afb9, restore-all 16aebc1b) was not applied and remains the standby. No secrets or user emails in this receipt or in the executed SQL. main was not touched. Account 7c71e421 was not touched. Cron was not touched. The live product tables public.assessments, public.joint_scores and public.protocols still exist.

## Gate (verified before the first DROP)

### (a) Ledger pins L1237–L1244, Vera PASS, Jim's words

Each of L1237–L1244 pins one table, its drop-file sha256, its CSV sha256 and its restore sha256. All eight MATCH the 2026-11-16 pack at `/workspace/process/batches/base-engagement-20261115/P1-28-drops-20261116/` and the L1112 restore pack at `/workspace/process/batches/base-engagement-20261115/P1-28/`. Pack receipt 740c41cc, pack SUMS 961cc2ed, restore SUMS 4183afb9, restore-all 16aebc1b, as named on each gate line.

| gate | table | pinned rows | drop sha256 | CSV sha256 | restore sha256 |
|---|---|---:|---|---|---|
| L1237 | public.rescore_backup_20261021_assessments | 21 | 3da6fb4372a313a67c542a3bbc530f5b557d1f022c1d5196c23af59196669260 | 63308fc44f01fdaa76767fa73b71f73c0c01dab2c3c014411f90be85378fa9b3 | bc58ff48a358f01ee44ee51e0965ce2bb3093a785059a49a94dba8ca5e729fb1 |
| L1238 | public.rescore_backup_20261021_joint_scores | 185 | d71974de0efdc4b22140284f5f8ea42dc9641b98114d0e0728ca03c86be948b0 | f78de7456573f78cdf20d9b2c3d27aa4dcc135f9f31cfa1dece6a143c0b1120f | fc789860e3fee6fec87eea7645609fb4e164780a5a2fb2d378881a30aa1725c3 |
| L1239 | public.rescore_backup_20261021_protocols | 154 | 039a52d12f2379f9e2010c9a357cb5da1d4ccaaa1013853c77a1094f142d66c4 | 16c1c63c8ff974b548850e64cc070a1c1aea89b8be5ce9b6aa24f5d23d3cdb56 | 10fe2ed462b4479b36ea626ba0f340d2202014b3a12ab13c0efd7eb8057e247a |
| L1240 | public.lumbar_null_backup_20261021_assessments | 15 | 735d08784dbe27ca1647dde87f62aa4beb09394522112fb96f407618c56c6846 | 58cab2dce3b4873c4073424a46ed13b101f1f4d8a1e2252388dee9ad43233ed4 | 219bee2b5c1b36e4c57cd0f07f8a52f839a2f8a0a7f543725891a29204f61792 |
| L1241 | public.lumbar_null_backup_20261021_joint_scores | 29 | e8d1ec786652013b841ea385db7373c27b38734e1b293289d4c4072665765c3c | fdb121f1cb19da49e79b440de975460726e22abd11443c7d21514549543cdee3 | f70167b083d108a0afb260bd762859204cfd3ec04ce3cbd8ffabf8d661805217 |
| L1242 | public.lumbar_null_backup_20261021_protocols | 0 | 1e6c74168b9783d362fcc951702e863e778fa91a2019ef1087a7ade4a7c05516 | b7fe143438845abe451a3ec56bad4de7a3bdffa52d6321ad22f3918eb52f7372 | a319c881d36bda0de66f4a078c6791ce0a9e6a9e03a736ebdc161361219f181d |
| L1243 | public.fg36_rescore_backup | 19 | 50bd754bd4d0f81462d08a3da7555797e08e79c7f8c36a6facce7e9dbfe710a2 | 523763913d58385a54dcb3843993467b666070a2bb9b2b1c17686b6bb1c46379 | ad2ec93d9ba20cddd9da0d32245d042de2457f4f83aaebbf7010c828df9dd60d |
| L1244 | public.fg36_rescore_log | 18 | 2ba3ec1382eab0969e6cec9bc15ef3900e8b013e99be9e6fcc15dd927cd0c392 | 63e2456aa39a1b9ce2c10fee5039c6dd92914ac7cda24d0871cf408c7ce299de | be57122a37ce70187f5a192bb2d1fb03de5160a8418b884f113efefb1ddc358b |

Vera precheck PASS **74b658b0** is recorded at L1250 (8:16 PM ET): file `/workspace/vera-verdicts/vera-P1-28-backup-drops-precheck-20261116.md`, sha256 **74b658b08543a2ba9461e39513f72c7ae337eb62f7fa792aa01ff81d6e0cf4fd** (recomputed tonight). L1250 status: PRECHECK VERIFIED; APPLY PENDING (drop order condition). L1251 records Sable's GO with Grant's order fix (joint_scores before assessments, or the two back to back). The L1237–L1244 status field still reads "GATED, PENDING VERA PRECHECK"; the verified PASS lives on L1250, not as an edit of those eight lines.

Jim's own words covering P1-28 among the 31 Base items:

- L1031 (Sun Nov 15, 8:47 PM ET), Jim, verbatim: "Do all of them. Anything I need to do I'll do tomorrow. After velvet ops gets back do it." Sable's reading, on that line, is that "them" means all 31 Base engagement items in the L1029 project. Status: APPROVED (all 31), per-item gates apply.
- L1178 (Mon Nov 16, 6:50 PM ET) reaffirms that coverage with Jim's own words, 6:46 PM ET: "Let's finish all this stuff that was supposed to get done"; 6:47 PM ET: "For ROMRx", then "Base focus". The line says: "No new approval; already-decided Base work stays covered by L1031."

L1229 (Jim, 7:54 PM ET: "I said go on all 31 things") and L1230 (Sable standing OK after a Vera precheck that passes on content) also cover this apply; L1047(3) / LIVE-TRACKER list P1-28 on the 31-item set.

### (b) Checksums

- Pack `/workspace/process/batches/base-engagement-20261115/P1-28-drops-20261116/SHA256SUMS` sha256 **961cc2ed24056c824a5a2539c6a93d31c4a95db890c31f869ce6f750084d7fe6**. `sha256sum -c`: **16/16 OK**, including receipt 740c41cc8c4c08d09d5cb5a07de16bbc72b425a2a57b93c5de66ff979d8352e5 and all eight drop_*.sql files.
- L1112 pack `/workspace/process/batches/base-engagement-20261115/P1-28/SHA256SUMS` sha256 **4183afb9fdf98441ac413d9a09928a79bbbbeffe09aaa5d68b7caa3e59981cc2**. `sha256sum -c`: **21/21 OK**, including restore-all.sql **16aebc1b99aff71710e47d3cb316a521687647d28b181cff961868012f54b203**, the eight restore_*.sql files, and the eight CSVs.

### (c) Dependencies (read-only, before the first DROP)

Catalog read at **8:19:54.252452 PM ET**. All eight tables existed (relkind r, owner postgres, RLS on, not forced, relacl postgres + service_role ALL only, no primary key).

- Incoming foreign keys: **0**. Outgoing foreign keys: **0**.
- pg_views / pg_matviews definitions naming any of the eight: **0**.
- Policies on the eight tables: **0**. Policies whose qual/with_check names them: **0**.
- Triggers on the eight tables: **0**. cron.job command text naming them: **0**.
- pg_depend: only each table's own composite type, toast table, and (for the two fg36 tables) attrdef. **0** non-internal dependents after excluding those. None of the three referencing functions has a pg_depend row on these tables, so `DROP TABLE IF EXISTS` without CASCADE is not blocked.

Three plpgsql SECURITY DEFINER functions name the tables in prosrc (no write invoke was used to inspect them; source was read via pg_proc.prosrc):

1. `public.erase_backup_copies_for_user(p_user uuid)` (src_len 3443, 9 `to_regclass`, 1 `to_regprocedure`). Each of the six lumbar/rescore tables is reached only after `to_regclass(...) is not null`; otherwise that table is recorded as 0 rows and skipped. It then calls `public.erase_fg36_rescore_data(uuid)` only if `to_regprocedure('public.erase_fg36_rescore_data(uuid)')` is not null.
2. `public.erase_fg36_rescore_data(p_user uuid)` (src_len 608, 2 `to_regclass`). If `to_regclass('public.fg36_rescore_log')` is null **or** `to_regclass('public.fg36_rescore_backup')` is null, it returns 0 and does not delete.
3. `public.export_my_backup_page(p_key text, p_offset integer, p_limit integer)` (src_len 6345, 1 `to_regclass`). If `p_key` is one of the eight names and `to_regclass('public.' || p_key)` is null, it returns empty (the comment in the body: once a safety-copy table is dropped its section is simply empty, never an error). Mid-apply caveat, already flagged by Vera: the `rescore_backup_20261021_joint_scores` branch also reads `public.rescore_backup_20261021_assessments` without its own guard. If assessments were dropped first while joint_scores still existed, a call with that p_key could ERROR. After **all eight** are gone, that branch is unreachable because the top-level `to_regclass('public.' || p_key)` guard returns empty for every one of the eight keys, including joint_scores. The `fg36_rescore_backup` branch also reads `fg36_rescore_log`; Grant's order drops backup before log, and after both are gone the same top-level guard covers it.

**Gate C result:** no live function or view would ERROR after all eight are dropped. Did not stop. Applied in Grant's order: joint_scores then assessments back to back, then the remaining six.

Pre-drop cron fingerprint at **8:19:44.692088 PM ET**: **13** jobs, md5(jobid\|schedule\|command\|active) **a96d2036959f1dc2697d23e7665cb490**. Job 1 send-renewal-reminders-daily, schedule `0 12 * * *`, active true, command md5 **caab15b0a3b771bccfd127f7c3db4df2**.

## Apply

Order (Grant / L1250 / L1251): drop_rescore_backup_20261021_joint_scores, then immediately drop_rescore_backup_20261021_assessments, back to back with no intervening statement. Then protocols, lumbar assessments, lumbar joint_scores, lumbar protocols, fg36_rescore_backup, fg36_rescore_log.

For the joint_scores / assessments pair, both counts were read first (8:20:36.515631 PM ET: 185 and 21, both MATCH). Both DROPs then ran back to back with nothing in between. A single gone-proof read at 8:21:02.183110 PM ET showed `to_regclass(...) IS NULL` for both. For the other six, `SELECT count(*)` ran immediately before each DROP; every count MATCHED the pin, so no stop. Each DROP used the exact file bytes via execute_sql. Because a DROP statement does not return `clock_timestamp`, each drop time is recorded as the closed interval between the pre-count (or, for the pair, the shared pre-count) and the gone-proof `clock_timestamp`, all America/New_York.

| # | table | gate | pinned | count before | count time ET | drop time ET (interval) | gone proof ET | gone (`to_regclass IS NULL`) | drop file sha256 |
|---|---|---|---:|---:|---|---|---|---|---|
| 1 | public.rescore_backup_20261021_joint_scores | L1238 | 185 | 185 | 8:20:36.515631 PM | after 8:20:36.515631 PM, at or before 8:21:02.183110 PM (first of the back-to-back pair) | 8:21:02.183110 PM | true | d71974de0efdc4b22140284f5f8ea42dc9641b98114d0e0728ca03c86be948b0 |
| 2 | public.rescore_backup_20261021_assessments | L1237 | 21 | 21 | 8:20:36.515631 PM | after the joint_scores DROP, at or before 8:21:02.183110 PM (second of the pair; no intervening query) | 8:21:02.183110 PM | true | 3da6fb4372a313a67c542a3bbc530f5b557d1f022c1d5196c23af59196669260 |
| 3 | public.rescore_backup_20261021_protocols | L1239 | 154 | 154 | 8:21:02.183110 PM | after 8:21:02.183110 PM, at or before 8:21:12.544977 PM | 8:21:12.544977 PM | true | 039a52d12f2379f9e2010c9a357cb5da1d4ccaaa1013853c77a1094f142d66c4 |
| 4 | public.lumbar_null_backup_20261021_assessments | L1240 | 15 | 15 | 8:21:12.544977 PM | after 8:21:12.544977 PM, at or before 8:21:19.843083 PM | 8:21:19.843083 PM | true | 735d08784dbe27ca1647dde87f62aa4beb09394522112fb96f407618c56c6846 |
| 5 | public.lumbar_null_backup_20261021_joint_scores | L1241 | 29 | 29 | 8:21:19.843083 PM | after 8:21:19.843083 PM, at or before 8:21:27.335652 PM | 8:21:27.335652 PM | true | e8d1ec786652013b841ea385db7373c27b38734e1b293289d4c4072665765c3c |
| 6 | public.lumbar_null_backup_20261021_protocols | L1242 | 0 | 0 | 8:21:27.335652 PM | after 8:21:27.335652 PM, at or before 8:21:35.392119 PM | 8:21:35.392119 PM | true | 1e6c74168b9783d362fcc951702e863e778fa91a2019ef1087a7ade4a7c05516 |
| 7 | public.fg36_rescore_backup | L1243 | 19 | 19 | 8:21:35.392119 PM | after 8:21:35.392119 PM, at or before 8:21:45.059142 PM | 8:21:45.059142 PM | true | 50bd754bd4d0f81462d08a3da7555797e08e79c7f8c36a6facce7e9dbfe710a2 |
| 8 | public.fg36_rescore_log | L1244 | 18 | 18 | 8:21:45.059142 PM | after 8:21:45.059142 PM, at or before 8:22:03.037089 PM | 8:22:03.037089 PM | true | 2ba3ec1382eab0969e6cec9bc15ef3900e8b013e99be9e6fcc15dd927cd0c392 |

No count drifted. No stop.

## Post-check (read-only, 8:22:03.037089 PM ET)

- All eight `to_regclass('public.<t>') IS NULL` = true. `any_still_present` = false.
- Cron fingerprint **unchanged**: 13 jobs, jobids 1–13, md5 **a96d2036959f1dc2697d23e7665cb490**. Job 1 command md5 still **caab15b0a3b771bccfd127f7c3db4df2**. Job list (id, name, schedule, active, cmd_md5) identical to the 8:19:44 PM ET pre-drop read. Renewal cron job 1 was not touched.
- Live product tables still present: public.assessments, public.joint_scores, public.protocols.
- The three functions are still present with unchanged src_len (3443 / 608 / 6345) and the same `to_regclass` / `to_regprocedure` counts. They were not invoked (erase_* would write; export_my_backup_page requires a signed-in `auth.uid()` and was not called). Behaviour after all eight are gone, from the already-read source plus the now-null `to_regclass` results:
  - `export_my_backup_page`: for any of the eight keys, `to_regclass('public.' || p_key)` is null, so it returns empty and never reaches a branch that would query a missing table.
  - `erase_backup_copies_for_user`: all six lumbar/rescore branches take the `to_regclass is null` path (k := 0). It may still call `erase_fg36_rescore_data`, which now returns 0. The function would return a jsonb of zeros plus total 0. No write invoke was run to confirm that return value live.
  - `erase_fg36_rescore_data`: both fg36 `to_regclass` values are null, so it returns 0 immediately. No write invoke was run.

## Rollback (not applied; standby)

L1112 restore set, pack SHA256SUMS **4183afb9fdf98441ac413d9a09928a79bbbbeffe09aaa5d68b7caa3e59981cc2** (21/21 OK). restore-all.sql **16aebc1b99aff71710e47d3cb316a521687647d28b181cff961868012f54b203**. Per-table files, in the restore-all / CREATE TABLE order:

1. restore_rescore_backup_20261021_assessments.sql **bc58ff48a358f01ee44ee51e0965ce2bb3093a785059a49a94dba8ca5e729fb1**
2. restore_rescore_backup_20261021_joint_scores.sql **fc789860e3fee6fec87eea7645609fb4e164780a5a2fb2d378881a30aa1725c3**
3. restore_rescore_backup_20261021_protocols.sql **10fe2ed462b4479b36ea626ba0f340d2202014b3a12ab13c0efd7eb8057e247a**
4. restore_lumbar_null_backup_20261021_assessments.sql **219bee2b5c1b36e4c57cd0f07f8a52f839a2f8a0a7f543725891a29204f61792**
5. restore_lumbar_null_backup_20261021_joint_scores.sql **f70167b083d108a0afb260bd762859204cfd3ec04ce3cbd8ffabf8d661805217**
6. restore_lumbar_null_backup_20261021_protocols.sql **a319c881d36bda0de66f4a078c6791ce0a9e6a9e03a736ebdc161361219f181d**
7. restore_fg36_rescore_backup.sql **ad2ec93d9ba20cddd9da0d32245d042de2457f4f83aaebbf7010c828df9dd60d**
8. restore_fg36_rescore_log.sql **be57122a37ce70187f5a192bb2d1fb03de5160a8418b884f113efefb1ddc358b**

On disk at `/workspace/process/batches/base-engagement-20261115/P1-28/`. Each restore is a plain `CREATE TABLE` (no IF NOT EXISTS; it errors if the table already exists), OWNER postgres, ENABLE ROW LEVEL SECURITY (no FORCE), REVOKE/GRANT, \\copy of the pinned CSV, INSERT ... SELECT with casts, and a row-count guard. restore-all.sql runs the same eight bodies in one transaction. Do not run a restore without its own gate and Vera precheck.

## Hold-back

CSVs and restore_*.sql / restore-all.sql from the L1112 pack were not copied into this evidence folder or this commit. The CSVs can carry user identifiers (user_id and, in fg36_rescore_backup, a payload column). This commit adds only the apply receipt and SHA256SUMS-P1-28-APPLY (the eight drop_*.sql files were already on the evidence branch from the build pack).

## Anomalies

None on counts, dependencies after all eight were gone, cron, or live product tables. The only recording note is that each DROP's exact instant is a closed interval between two `clock_timestamp` reads, because the executed file content is the DROP only and the joint_scores / assessments pair had no query between the two DROPs, as required.

## Not done

Rollback was not applied. No other table was dropped or altered. No function body was changed. Cron was not changed. No emails were sent. This receipt still needs Vera's post-check.
