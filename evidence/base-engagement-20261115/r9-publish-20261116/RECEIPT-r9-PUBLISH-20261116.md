# Receipt: r9 published to romrx.io (site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b)
Written 2026-11-16 ~9:53 PM ET (America/New_York) by Avery's executor. Staged receipt `RECEIPT-r9-DRAFT-STAGED-20261116.md` (sha256 240a04946d56899ad1af9b8da6e872b12f5524faacf1bd935aa8e2e8689d9f59) is a separate file and unchanged. r7 receipt unchanged.
Authority: Grant GO to publish (relayed), after Vera VERIFIED the r7 post-check (0505060f). Jim's 9:02 PM ET card / L1319.

## Source and dist (from the staged receipt)
- Tag `frozen-20261116/combined-r9-p1-12-on-r7` = object 0dfb186155a0214fdf29e3ccfce79852459bd087 -> commit 768947113ae39d1031bdd59ceb845657a39e1867, tree 02afb6a59f7555d5ceb61798fbd51094834c0959; ls-remote MATCH.
- `git archive` + `COMMIT_REF=768947113ae39d1031bdd59ceb845657a39e1867 netlify build --context production`, 9:49:18 to 9:49:38 PM ET, exit 0. Dist digest **8318327d008e99c6683637ddbeae628a894f3feb98b8935f08837c4ecf8152c8**, **400 files**, manifest cmp-identical to Jules's r9 manifest.
- Draft **6afbc0d63fb2af5613761122** uploaded 9:49:55 to 9:50:02 PM ET (no --prod). Draft file check: 148 match, 1 not served (/netlify.toml), 251 /app/* source paths serve the /app/ shell (force rule), 0 mismatches. Draft static pages: 4/4 200 with ?v=768947113ae3, byte-equal to dist.

## Publish
1. getSite before (9:51:16 PM ET): published `6afbbc6bb158e8248d6e38b9` (r7), **locked true**. Expected, proceed.
2. 9:51:17 to 9:51:20 PM ET: ONE `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afbc0d63fb2af5613761122"}'`, rc 0, published_at 02:51:19.632Z = **9:51:19 PM ET**.
3. getSite after (9:51:24 PM ET): published **6afbc0d63fb2af5613761122**, state ready, **locked true**. Auto-publish not unlocked.

## r7 checks on romrx.io (9:51:37 PM ET, GET only, cache-buster, no submits) - all PASS
- / 200 (stamp refs 3), /legal.html 200 (2), /trust.html 200 (2), /faq.html 200 (3): each carries ?v=768947113ae3, 0 r7 stamps (v=2604cc7eaf3c), byte-equal to the dist file.
- /app/ 200, sha1 6e160ddd78cb5133d5f7d95196289cca232c8579 = dist app/dist/index.html sha1.
- /app/sw.js 200, sha1 38dd0c8ffd744a8ae9e7537b6f3b4ae9997b7b43 = dist app/dist/sw.js sha1.
- /app/.env.example 200 text/html, sha256 323c3f6a149fba4f983c6982d81048a747657ea2bfacfccc25ec6ca4744f8dbe, cmp byte-equal to /app/; 0 "VITE_" strings; 0 KEY= lines.

## calendar-ics unauthenticated smoke (9:51:49 PM ET; no token, no apikey sent)
URL https://cqzvqzwwevnflinxgnpp.supabase.co/functions/v1/calendar-ics
- GET, no auth header: **401** (expected 401). Body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` (gateway, verify_jwt true). CORS on the 401: access-control-allow-origin `*`, access-control-allow-headers `authorization, x-client-info, apikey`, access-control-expose-headers `sb-error-code`.
- OPTIONS, Origin https://romrx.io, Access-Control-Request-Method GET: **204** (expected 204), empty body. access-control-allow-origin `https://romrx.io`, access-control-allow-methods `GET, OPTIONS`, access-control-allow-headers `authorization, x-client-info, apikey, content-type`, vary `Accept-Encoding, Origin`.

No check failed, so no rollback was run.

## State now
romrx.io published = 6afbc0d63fb2af5613761122 (r9), locked. Rollback = one restoreSiteDeploy of 6afbbc6bb158e8248d6e38b9 (r7), then confirm locked.
