# Receipt: r6b republish of 6afbb75c (romrx.io, site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b)
Written 2026-11-16 ~9:19 PM ET. Earlier receipts e5391a88 (hold) and fa4a8de5 (publish+rollback) left unchanged.
Authority: Jim first-hand card t2043s6428 (9:02 PM ET); L1319, L1323; Vera r6b precheck f863c1f1; Sable standing OK; Grant 9:17 PM ET ruling (check restated: /app/.env.example body byte-equal to /app/ on the same deploy, no env-file content; GO one restoreSiteDeploy of 6afbb75c; rollback 6afba1b9).

## Publish
- Before (21:17:3x EST): published 6afba1b9a6f1c859e9d9695c, locked true.
- 21:17:35-21:17:38 EST: `netlify api restoreSiteDeploy` deploy 6afbb75ca236e3f36f4848ab, rc 0, published_at 02:17:37.698Z (9:17:37 PM ET). One call only.
- 21:17:44 EST getSite: published 6afbb75ca236e3f36f4848ab, state ready, locked true. Auto-publish not unlocked.

## Checks at 21:17:4x-21:17:52 EST (GET only, cache-busting query, no submits)
- / 200, /legal.html 200, /trust.html 200, /faq.html 200: each carries ?v=4995d414880b. PASS.
- /app/ 200: Vite app shell (no ?v stamp by design; hashed assets, src /app/assets/index-C2D-LtSC.js). Served sha1 c4a3765d = draft file /app/dist/index.html sha1 c4a3765d. PASS.
- /app/sw.js 200: served sha1 38dd0c8f = draft /app/dist/sw.js sha1 38dd0c8f. PASS.
- /app/.env.example: 200 text/html, sha256 09a53dff62b63a03... byte-identical (cmp) to /app/ on this deploy; 0 "VITE_" strings; 0 KEY=VALUE lines. PASS under the restated check.

## State now
romrx.io published = 6afbb75ca236e3f36f4848ab, locked. Rollback = restoreSiteDeploy 6afba1b9a6f1c859e9d9695c. r7 (tag ad46ed58) waits for Vera's r6b post-check.
