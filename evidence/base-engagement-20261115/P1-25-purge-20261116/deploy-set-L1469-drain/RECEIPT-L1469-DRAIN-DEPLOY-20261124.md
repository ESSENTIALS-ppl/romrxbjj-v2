# RECEIPT: L1469 drain deploy, p1-25-storage-drain v1 (Tue Nov 24 2026)

By Avery. Release: Sable 3:13 PM ET, relayed by Grant; Vera be40c03f VERIFIED (vera-6afa64fa-P1-33-rollback-and-drain-v2-20261124.md, check 2); Margot pin L1501; Jim L1031 / L1229. All times ET (America/New_York, EST).

## Pre-checks
- SHA256SUMS-v2 = 5df1dff91a08c1c2347bce0c644b6b72cc8ba18000057b233e90c423bbe4a343; `sha256sum -c` 11/11 OK.
- Bytes: source/index.ts bc562dfc, _shared/p1_25_storage_drain_core.mjs a94089d0, rollback-stub/source/index.ts ee6639be. DEPLOY-CALL-v2.txt eca74b23.
- list_edge_functions right before the deploy (DEPLOY-BEFORE-function-list.txt/.json): 41 functions, 0 differences from BEFORE-v2 (96c77cba) on version, ezbr, updated_at, verify_jwt and status. create-checkout-session v52 ezbr 36abc3ba. No p1-25-storage-drain.

## Deploy
- MCP user-Supabase deploy_edge_function, project cqzvqzwwevnflinxgnpp, name p1-25-storage-drain, entrypoint_path source/index.ts, verify_jwt false, no import map. Files: source/index.ts and _shared/p1_25_storage_drain_core.mjs, sent as the exact staged bytes (2498 and 6213 bytes). Exactly per DEPLOY-CALL-v2.
- **Deployed Tue Nov 24 2026 3:15:13 PM ET.** id 9ab2467f, **version 1**, status ACTIVE, **verify_jwt false**, **ezbr 208fad0837b65463f4cde9cf7c8ec9083f4bfb3f66ad6527a907867553b47def**.

## After
- list_edge_functions (DEPLOY-AFTER-function-list.txt/.json): **42 functions; only p1-25-storage-drain added**. 0 changes to the other 41 (version, ezbr, updated_at, verify_jwt, status). **create-checkout-session still v52, ezbr 36abc3ba.**
- get_edge_function readback (DEPLOY-READBACK-get_edge_function.txt): source/index.ts bc562dfc and _shared/p1_25_storage_drain_core.mjs a94089d0, both MATCH the staged bytes. Entrypoint path nests as source/source/index.ts, same as checkout v52.

## Not done (by instruction)
- No invoke of any kind (no hand invoke, no D1, no curl, no cron_call_edge). Cron 8827ec3f NOT applied. No other write. No secret read or printed.

## Rollback (not run)
- deploy_edge_function same name, entrypoint_path source/index.ts, verify_jwt true, single file source/index.ts = rollback-stub/source/index.ts ee6639be6d4c40df98f8c47ef75ed324dd8b559ed0e800a92696a15332705a9b. The stub always returns 503 and touches no Storage, database or env. Delete is not used (needs Jim). Expect version 2, verify_jwt true after a rollback.
