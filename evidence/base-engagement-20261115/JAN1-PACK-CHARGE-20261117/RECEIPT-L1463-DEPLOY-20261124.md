# Receipt: L1463 create-checkout-session v51 deployed, 2026-11-24

Owner: Avery (Foundation Eng). Project cqzvqzwwevnflinxgnpp. Function create-checkout-session only. Tip 22c490f885350b8dd4ecf1e41fbc82bcf5c6e22c ONLY (643e27f0 was not part of this deploy). Account 7c71e421 was not touched. No Stripe calls. No checkout sessions were created.

Authority: Sable released L1463 and OK'd the file set at 2:29 PM ET (EST) (deploy-set SUMS sha256 1838e47697407523713fad651235282031de1d0044b778bb5b9efd412b6d2d24), relayed by Grant. Vera precheck VERIFIED 8c56c7be. Jim's first-hand words (L663 plus ledger line 408) were verified by Grant's relay before the deploy ran.

## Before checks (all passed; would have stopped on a mismatch)

- `sha256sum -c` on deploy-set-L1463/SHA256SUMS: all 11 files OK. SUMS file sha256 still 1838e47697407523713fad651235282031de1d0044b778bb5b9efd412b6d2d24.
- Fresh MCP list_edge_functions + get_edge_function at 2:29 PM ET (EST): create-checkout-session still v50, ezbr 2b7dd0ce33acb5300763a9898afca6d67b3f02709b265dd3d951df459551239c, verify_jwt=true, updated 2026-10-06 1:12:33 PM ET (EDT).
- All 41 functions matched the 2:25 PM ET baseline (name, version, ezbr, updated_at, verify_jwt). No added, removed, or changed functions.

## Deploy (MCP deploy_edge_function, once)

Time: **2026-11-24 2:30:46 PM ET (EST)** (updated_at 2026-11-24T19:30:46.492Z).

Call (as written in DEPLOY-CALL.txt): project_id cqzvqzwwevnflinxgnpp, name create-checkout-session, entrypoint_path source/index.ts, verify_jwt true, five files with the staged bytes. import_map_path omitted. Not a CLI deploy.

Staged files uploaded:

| path | origin | sha256 | sha8 |
|------|--------|--------|------|
| source/index.ts | 22c490f8 | 3bef27ee4c0774a5885b35eae55d0bcb06abc9c7931d6ea37c8a588731a9660c | 3bef27ee |
| source/packs_gate.ts | 22c490f8 | 7ed5a3dacbc5789705f2379aaec8b8b7cfaf7be7f291f3056bde7141b1af0279 | 7ed5a3da |
| _shared/arl_copy.ts | live v50 | c06bd3153d91dbcd4c9ba9458e7c601dbbb763a3cd07322757ddf7046408b3f3 | c06bd315 |
| _shared/events.ts | live v50 | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 | 49f18652 |
| _shared/rate_limit.ts | live v50 | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 | f3a82f1d |

## After checks (PASS; no rollback)

MCP list_edge_functions + get_edge_function on create-checkout-session immediately after the deploy:

- create-checkout-session **version 51**, ezbr **7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16**, **verify_jwt=true**, updated **2026-11-24 2:30:46 PM ET (EST)**, status ACTIVE, import_map false, entrypoint source/index.ts.
- Each of the five downloaded files was re-hashed and matched the staged sha256 values above (including arl_copy c06bd315, not repo 6b550c27).
- Full 41-function list delta: **only create-checkout-session changed**. No other function changed name, version, ezbr, updated_at, or verify_jwt. None were added or removed.

  before: v50, ezbr 2b7dd0ce33acb5300763a9898afca6d67b3f02709b265dd3d951df459551239c, verify_jwt=true, 2026-10-06 1:12:33 PM ET (EDT)
  after:  v51, ezbr 7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16, verify_jwt=true, 2026-11-24 2:30:46 PM ET (EST)

Rollback was not run. If needed: redeploy the live v50 files (index e5f7576b, packs_gate 5883c28a, plus the same three _shared files), entrypoint_path source/index.ts, verify_jwt true, and confirm ezbr returns to 2b7dd0ce33acb5300763a9898afca6d67b3f02709b265dd3d951df459551239c.

## Smoke tests (read-only; 2:31:45 PM ET)

URL https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/create-checkout-session. No apikey, no JWT, no Stripe, no checkout session, account 7c71e421 not used.

- OPTIONS preflight (Origin https://romrx.io, Access-Control-Request-Method POST): **200**, empty body. CORS: access-control-allow-origin `*`, allow-methods `POST, OPTIONS`, allow-headers `authorization, x-client-info, apikey, content-type`.
- Unauthenticated POST with `{}` and no Authorization header: **401**, body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` (gateway, verify_jwt true). No session created.

## State now

create-checkout-session is live **v51**, ezbr **7a78d2a6a1a5f9390cf47018af5572dacc6aeb91354e83961efeace0fb085d16**, verify_jwt **true**. PACKS_CHECKOUT_OPEN was not changed. Base-only trial and the Dec 30 503 are unchanged by this deploy.
