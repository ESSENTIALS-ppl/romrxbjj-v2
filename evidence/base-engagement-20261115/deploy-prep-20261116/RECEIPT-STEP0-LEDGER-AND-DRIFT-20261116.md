# PREP RECEIPT, Step 0 + drift check (Mon Nov 16, 2026, 8:43 to 8:50 AM ET). Avery. PREP ONLY.

Nothing applied, deployed or written to Supabase. Reads only: list_edge_functions, get_edge_function, list_migrations, execute_sql SELECTs. Project cqzvqzwwevnflinxgnpp.

## Ledger (/workspace/ledger/JIM-DECISIONS-LEDGER.md, sha256 d557d65c4d80198912f890e22ee06fa61ec47a7eb11fd9c4ca23f72a163058cf, mtime Sun Nov 15 10:39 PM ET, 1408 lines)

- L1031 (line 1210), first part verbatim: `L1031 | 2026-11-15 8:47 PM ET | ROMRx | JIM DECISION | Jim, verbatim: "Do all of them. Anything I need to do I'll do tomorrow. After velvet ops gets back do it."` ... `| Owner: Grant | Status: APPROVED (all 31), per-item gates apply.`
- L1104 (line 1356): the Sunday-window rule. "every P1 apply, deploy or publish not finished by 11:59 PM ET tonight waits for next Sunday, or for Jim's own words in Monday's packet."
- **NO ledger line dated 2026-11-16 exists.** The last line is L1130 (Sun Nov 15 10:39 PM ET). The phrase "Didn't I say go" does not appear anywhere in the ledger. So nothing in the ledger yet records Jim lifting L1104 on Mon Nov 16. Grant's relay (Jim, Mon 8:42 AM ET, via Sable: "Didn't I say go?") needs a Margot line before any step is gated.

## Drift check: live edge functions vs the Sun Nov 15 ~10:59 PM ET reads (P1-06-07-08-gating-20261115/live-reads/)

| Function | Version now | ezbr_sha256 now | Updated (ET) | verify_jwt | Source vs the 10:59 PM read |
|---|---|---|---|---|---|
| submit-assessment | v44 | 110f365775b57b68977c68627ef2cda1645aae09a4ef23944555de8fcb0ff19a | Tue Oct 27, 2026 11:18:08 AM ET | true | IDENTICAL (6 files, `diff -r` empty) |
| lifecycle-emails | v2 | aa79a1dc7f114e23d9d2b9d4b85aeb7e430046c6509eda5ac83b5e0794665e96 | Sun Nov 15, 2026 10:04:28 PM ET | false | IDENTICAL (10 files) |
| unsubscribe | v12 | 97503ff467084edfe1780bf5d5a8bebfe06939dbfe429da0cd11e4741f790e86 | Tue Nov 3, 2026 12:57:16 AM ET | false | IDENTICAL (5 files) |
| compute-tiers | v53 | 6f4c506ac0df2069b8d7bd93844f68e6dfa99f7919f0d448bf96e442730a06ad | Tue Nov 3, 2026 6:27:22 PM ET | false | IDENTICAL (4 files) |

FYI only (not part of this set):

| Function | Version | ezbr_sha256 | Updated (ET) |
|---|---|---|---|
| stripe-webhook | v54 | 3c60342df64e5fed71d945683faf07ec0c2a291e69f3b59d86878685a3fe43e0 | Sun Nov 15, 2026 10:03:22 PM ET (= L1115) |
| create-checkout-session | v45 | 2b7dd0ce33acb5300763a9898afca6d67b3f02709b265dd3d951df459551239c | Tue Oct 6, 2026 1:12:33 PM ET |

Small note: the gating pack's metadata.json labels submit-assessment updated_at as "Tue Nov 27"; the epoch (1793114288188) is Tue Oct 27, 2026 11:18:08 AM ET, as the pack's own table says. Label typo only, no drift.

## Migrations (list_migrations)

- 179 applied. Head 20261116030659 (p1_22_retention_measurement). Same count Vera logged in L1127.
- NOT applied (by version and by name): 20261116030000, 20261116031000, 20261116031100, 20261116031200. Also not applied: 20261116040300 (coaches, held) and 20261116040100 (P1-27).
- Ordering note (L1115): MCP apply_migration stamps the real apply time, so these files apply after head 030659 whatever their planned names. No CLI db push.

## Saved
- live-reads-20261116/ (4 function trees + live-meta.json + list_migrations.json + list_edge_functions.json), SHA256SUMS inside.
- schema-snapshots-20261116/pre-apply-snapshot.json (cron jobs 1-12 with command md5, assessments columns/indexes/triggers, counts), live-defs-replaced-by-031100-031200.json, lifecycle-cron-responses-20261116.json.
