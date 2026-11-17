# Receipt: r7 published to romrx.io (site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b)
Written 2026-11-16 ~9:34 PM ET (America/New_York). Earlier receipts e5391a88, fa4a8de5 and 1c236032 left unchanged.
Authority: Jim first-hand card t2043s6428 (9:02 PM ET; L1229, L1319). Vera r6b post-check 62978bd7 PASSED (vera-6afbb75c-r6b-publish-postcheck-20261116.md; L1390 "r7 CLEARED", may publish from tag ad46ed58). Grant GO (batched GOs item 2): draft from tag ad46ed58, restoreSiteDeploy that exact id, keep the lock, rollback 6afbb75c, same checks as r6b.

## Source and dist
- Tag frozen-20261116/combined-p1-18-18b-26-on-29eb4fa-r7 = object ad46ed587ea67fb7f29211bbc1d19290f53792c2, peels to 2604cc7eaf3c887865f4d74304c32862a50da065, tree f5a184f520bb8c3f6b1757f0cd832d3fe9d9c843 (= Jules's r7 tree). ls-remote: tag object and peel MATCH. Branch head not used.
- Method as r6b: `git archive` of the tag -> /workspace/p1-build/v4-r7-publish-20261116-archive (new dir); `.netlify/state.json` siteId only; `COMMIT_REF=2604cc7eaf3c887865f4d74304c32862a50da065 netlify build --context production`, 9:30:24 to 9:30:44 PM ET, EXIT 0. Stamp v=2604cc7eaf3c (99 refs, 38 files). Tests 93 files, 1375 passed / 7 skipped. Log /workspace/p1-build/v4-r7-publish-20261116-build.log.
- Dist digest (bb2b7f86 command: find . -type f minus node_modules, app/node_modules, .netlify; LC_ALL=C sort -z; sha256sum > manifest; sha256sum manifest): **11d8b932805eedb561db7b21534288c111b0983dc2882258dabfb317fd3434a4**, 400 files. Manifest byte-identical (cmp) to Jules's process/evidence/JULES-COMBINED-P1-18-18b-26-r7-DIST-MANIFEST-20261116.txt (11d8b932...). MATCH, no STOP.

## Draft deploy
- getSite before (9:30:56 PM ET): published 6afbb75ca236e3f36f4848ab, state ready, locked true, published_at 9:17:37 PM ET.
- 9:31:03 to 9:31:10 PM ET: `netlify deploy --no-build --dir . --functions netlify/functions --site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b --json` (no --prod). New deploy **6afbbc6bb158e8248d6e38b9**, state ready, context deploy-preview, published_at null, required []. Functions: consent-log, investor-request, meta-capi, partner-inquiry, waitlist (same 5 as r6b). Site still published 6afbb75c, locked true after upload.

## Draft file check (DEVIATION in method, same result class as r6b)
- The deploy file list (GET /deploys/{id}/files) is not a `netlify api` method in CLI 27.9.0 (listDeployFiles invalid). I did not call the REST API with a token by hand. Instead every one of the 400 manifest paths was fetched from the draft URL (GET only, cache-buster) and sha256-compared with the local dist:
  - **148 match** byte-for-byte: every non-/app file, plus the 4 app/dist files via their served routes (/app/ = app/dist/index.html, /app/sw.js, /app/assets/index-C2D-LtSC.js, /app/assets/index-DdqwQUyf.css).
  - **1 not served**: /netlify.toml 404 (same as r6b; its deployed sha is CLI-normalized and not served).
  - **251 /app/* source files** (incl. /app/.env.example and /app/.gitignore) return the /app/ shell under the /app/* force rule, so their deployed bytes cannot be read over HTTP. None is reachable by a visitor. The CLI skips dotfiles, so /app/.env.example and /app/.gitignore are expected not uploaded, as in r6b.
  - **0 mismatches.** Results: /workspace/export-flip/r7-draft-http-filecheck.json.

## Publish
- 9:32:38 to 9:32:41 PM ET: one `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afbbc6bb158e8248d6e38b9"}'`, rc 0, published_at 02:32:40.582Z = **9:32:40 PM ET**.
- getSite after (9:32:46 PM ET, re-read 9:33:12 PM ET): published **6afbbc6bb158e8248d6e38b9**, state ready, **locked true**. Auto-publish not unlocked.

## Checks (9:32:55 PM ET, GET only, cache-buster, no submits)
- / 200, /legal.html 200, /trust.html 200, /faq.html 200: each carries ?v=2604cc7eaf3c, 0 old 4995d414880b stamps; each is byte-equal to the dist file. PASS.
- /app/ 200, served sha1 c4a3765df961941908d6d4cdb4da67305628f5fe = draft app/dist/index.html sha1. PASS.
- /app/sw.js 200, served sha1 38dd0c8ffd744a8ae9e7537b6f3b4ae9997b7b43 = draft app/dist/sw.js sha1. PASS.
- /app/.env.example 200 text/html, sha256 09a53dff62b63a03..., cmp byte-equal to /app/ on this deploy; 0 "VITE_" strings; 0 KEY=VALUE lines. PASS (Grant's restated check).
- Extra: /index.html, /beta.html, /dashboard.html, /science.html, /about.html, /articles/index.html 200; /netlify.toml 404. Home title "ROMRx Base: Range of Motion Check for 10 Joints".
- No check failed, so no rollback was run.

## Corrections to earlier r6b receipts
- Receipt fa4a8de5 (RECEIPT-r6b-PUBLISH-ROLLED-BACK-20261116.md) wrongly said 6 pages were stamped. Only the 4 static pages (/, /legal.html, /trust.html, /faq.html) carry the ?v= stamp; /app/ and /app/sw.js are matched by hash, not stamp.
- Hold receipt e5391a88 (RECEIPT-r6b-DRAFT-HOLD-20261116.md) "NOT published" was superseded by the 9:17:37 PM ET publish of 6afbb75c (receipt 1c236032).

## State now
romrx.io published = 6afbbc6bb158e8248d6e38b9 (r7), locked. Rollback = one restoreSiteDeploy of 6afbb75ca236e3f36f4848ab (r6b). Vera post-check of r7 not yet run.
