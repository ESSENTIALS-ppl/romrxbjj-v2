# Receipt: r6b publish of 6afbb75c, then ROLLBACK to 6afba1b9 (check failed)
Site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b (romrx.io). Written 2026-11-16 ~9:16 PM ET. Hold receipt e5391a88 left unchanged.
Authority: Jim first-hand, card t2043s6428, 2026-11-16 9:02 PM ET; L1319, L1323; Vera r6b delta precheck f863c1f1; Sable standing OK; Grant's 9:13 PM ET ruling (accepts the 3 file-list differences; publish 6afbb75c via restoreSiteDeploy; no unlock; roll back on any failed check).

## Source (unchanged from hold receipt)
Tag 660980b3b9b9f8aa6b4f176e438d8f3b1195a7a6 -> 4995d414880ba3636916c31537461c249db2f18b; dist 27956deb0802e74b2db9b62cade09e16d0cce7252dbce7bcc5fb5a72756926ee (400 files). Draft 6afbb75ca236e3f36f4848ab.
397/400: 397 files present with equal sha1. 2 dotfiles (/app/.env.example, /app/.gitignore) not uploaded by the CLI. /netlify.toml sha1 rewritten by Netlify and never served. Same pattern on 6afba1b9. Accepted by Grant 9:13 PM ET.

## Publish
- Before: published 6afba1b9a6f1c859e9d9695c, locked true.
- 2026-11-16 21:13:36-21:13:37 EST: `netlify api restoreSiteDeploy` site d9bc6384... deploy 6afbb75ca236e3f36f4848ab. rc 0. published_at 02:13:37Z (9:13:37 PM ET).
- 21:13:44 EST getSite: published 6afbb75ca236e3f36f4848ab, ready, locked true. Auto-publish not unlocked.

## Checks at 21:13:48 EST (GET only, cache-busting query, no submits)
- / 200, /app/ 200, /legal.html 200, /trust.html 200, /faq.html 200, /app/sw.js 200. HTML stamps ?v=4995d414880b. PASS.
- /app/.env.example: 200, NOT 404. FAIL as written. Body is text/html, sha1 c4a3765d, byte-identical to /app/ (the SPA shell from the /app/* force rule); 0 "VITE_" strings; the dotfile itself was never uploaded or served.

## Rollback (required by the ruling on any failed check)
- 2026-11-16 21:14:11-21:14:13 EST: `netlify api restoreSiteDeploy` deploy 6afba1b9a6f1c859e9d9695c. rc 0. published_at 02:14:12Z (9:14:12 PM ET).
- 21:14:24 EST getSite: published 6afba1b9a6f1c859e9d9695c, ready, locked true.
- Post-rollback GETs: / 200, /app/ 200, /legal.html 200, /trust.html 200, /faq.html 200 (stamps ?v=29eb4fa66f92); /app/sw.js 200 and /app/.env.example 200, both the SPA shell (sha1 92fcc3f9 = /app/).
- Baseline finding: live 6afba1b9 also answers 200 (SPA shell) for /app/.env.example, so the 404 expectation can't be met by either deploy while the /app/* force rule exists. The check needs restating (e.g. "body is the SPA shell / contains no env file content") before the re-publish.
- r6b live window: about 35 s (9:13:37-9:14:12 PM ET).

## State now
romrx.io published = 6afba1b9a6f1c859e9d9695c (locked). Draft 6afbb75ca236e3f36f4848ab kept, ready, unpublished. EXPORT_MY_DATA stays on (receipt 62f8abdb). Re-publish = restoreSiteDeploy 6afbb75c once the check is re-ruled.
