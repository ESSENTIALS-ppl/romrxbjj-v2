# Receipt: L1468 create-checkout-session v52 deployed, 2026-11-24

Owner: Avery (Foundation Eng). Project cqzvqzwwevnflinxgnpp. Function create-checkout-session only. Tip 643e27f048a69aa3752940fc3aac1c62e200d91b (one commit on L1463 22c490f8). Account 7c71e421 was not touched. No Stripe calls. No checkout sessions were created. PACKS_CHECKOUT_OPEN was not changed.

Authority: Sable OK'd the staged deploy-set-L1468 file set at 2:41 PM ET (EST) Nov 24, 2026 (America/New_York), relayed by Grant. Vera VERIFIED the L1463 post-check (dc7ac76f). Vera VERIFIED the L1468 precheck (b53b3e5d). Jim's words, read first-hand from ledger L1001 (file line 1150) before this receipt: Jim, verbatim: "Keep Coming Spring 2027."

## Before checks (all passed; would have stopped on a mismatch)

- `sha256sum -c` on deploy-set-L1468/SHA256SUMS: all 11 files OK. SUMS file sha256 still 0208cd4f2e659680829e1497c3df9759755c02956bc9e7608dae09780353c523 (sha8 0208cd4f).
- Fresh MCP list_edge_functions at 2:42 PM ET (EST): create-checkout-session was v51, ezbr 7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16, verify_jwt=true, updated 2026-11-24 2:30:46 PM ET (EST). All 41 functions matched the L1463 after-list (name, version, ezbr, updated_at, verify_jwt). No added, removed, or changed functions.

## Deploy (MCP deploy_edge_function, once)

Time: **2026-11-24 2:43:33 PM ET (EST)** (updated_at 2026-11-24T19:43:33.773Z).

Call (as written in DEPLOY-CALL.txt): project_id cqzvqzwwevnflinxgnpp, name create-checkout-session, entrypoint_path source/index.ts, verify_jwt true, five files with the staged bytes. import_map_path omitted. Not a CLI deploy.

Staged files uploaded:

| path | origin | sha256 | sha8 |
|------|--------|--------|------|
| source/index.ts | 643e27f0 | 3b706ba85582d52336ec375d045477e4e29a0b1277487fe10ca1034478969666 | 3b706ba8 |
| source/packs_gate.ts | 643e27f0 | 21bc6a5fae3e325a97fce7ab4efd9e2c846d8db4b17e588e9b78fa4b589b4ed5 | 21bc6a5f |
| _shared/arl_copy.ts | live v50 | c06bd3153d91dbcd4c9ba9458e7c601dbbb763a3cd07322757ddf7046408b3f3 | c06bd315 |
| _shared/events.ts | live v50 | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 | 49f18652 |
| _shared/rate_limit.ts | live v50 | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 | f3a82f1d |

## After checks (PASS; no rollback)

MCP list_edge_functions + get_edge_function on create-checkout-session immediately after the deploy:

- create-checkout-session **version 52**, ezbr **36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9**, **verify_jwt=true**, updated **2026-11-24 2:43:33 PM ET (EST)**, status ACTIVE, import_map false, entrypoint source/index.ts.
- Each of the five downloaded files was re-hashed and matched the staged sha256 values above (including arl_copy c06bd315, not repo 6b550c27).
- Full 41-function list delta: **only create-checkout-session changed**. No other function changed name, version, ezbr, updated_at, or verify_jwt. None were added or removed.

  before: v51, ezbr 7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16, verify_jwt=true, 2026-11-24 2:30:46 PM ET (EST)
  after:  v52, ezbr 36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9, verify_jwt=true, 2026-11-24 2:43:33 PM ET (EST)

Rollback was not run. If needed: rollback (a), message-only, redeploy the 22c490f8 / deploy-set-L1463 sources (index 3bef27ee, packs_gate 7ed5a3da, plus the same three _shared files), entrypoint_path source/index.ts, verify_jwt true, and confirm ezbr returns to 7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16.

## Smoke tests (read-only; 2:44:33 PM ET (EST))

URL https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/create-checkout-session. No apikey, no JWT, no Stripe, no checkout session, account 7c71e421 not used.

- OPTIONS preflight (Origin https://romrx.io, Access-Control-Request-Method POST): **200**, empty body. CORS: access-control-allow-origin `*`, allow-methods `POST, OPTIONS`, allow-headers `authorization, x-client-info, apikey, content-type`.
- Unauthenticated POST with `{}` and no Authorization header: **401**, body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` (gateway, verify_jwt true). No session created.

## State now

create-checkout-session is live **v52**, ezbr **36abc3ba418b2b0a10b65cc0d0aaad23fed5151b8adb8491adb3fb995cc717d9**, verify_jwt **true**. PACKS_CLOSED_MESSAGE is "Sport packs are coming Spring 2027." PACKS_CHECKOUT_OPEN was not changed. The L1463 pack-charge floor and Base-only trial path remain in place.
