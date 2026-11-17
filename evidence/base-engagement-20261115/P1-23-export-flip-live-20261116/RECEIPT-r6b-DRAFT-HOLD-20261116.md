# Receipt: r6b draft deploy uploaded, NOT published (STOP on file-list check)
Site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b (romrx.io). Written 2026-11-16 ~9:15 PM ET.

## Source
- Tag frozen-20261116/combined-p1-18-18b-26-on-29eb4fa-r6b = object 660980b3b9b9f8aa6b4f176e438d8f3b1195a7a6, peels to 4995d414880ba3636916c31537461c249db2f18b. Branch head not used.
- git archive of the tag -> /workspace/p1-build/v4-r6b-publish-20261116-archive; COMMIT_REF=4995d414... netlify build --context production; EXIT 0; 93 files, 1375 passed / 7 skipped.
- Dist digest (bb2b7f86 command): 27956deb0802e74b2db9b62cade09e16d0cce7252dbce7bcc5fb5a72756926ee, 400 files; manifest byte-identical to bb2b7f86's.

## Draft deploy
- Before (published): 6afba1b9a6f1c859e9d9695c, ready, locked true, published 7:37:46 PM ET. Unchanged; site still locked.
- 2026-11-16 21:09:28-21:09:37 EST: `netlify deploy --no-build --dir . --functions netlify/functions --site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b` (no --prod). New deploy 6afbb75ca236e3f36f4848ab, state ready, context deploy-preview, published_at null, required []. Functions: consent-log, investor-request, meta-capi, partner-inquiry, waitlist (same 5 as 6afba1b9).
- Auto-publish not unlocked. Nothing published.

## File-list check (GET /deploys/6afbb75c.../files, 398 entries, sha1 vs local)
- 397 of 400 manifest files: present, sha1 equal (API paths are lowercased; compared case-insensitively, no collisions).
- Missing from deploy (2): /app/.env.example, /app/.gitignore (CLI does not upload dotfiles). Live 6afba1b9 has neither.
- sha1 differs (1): /netlify.toml. Local adffedb4 (= git 4995d414), deploy 22c8713b. Same pattern on live 6afba1b9: deployed 6d49d356 vs git 29eb4fa6 99a4d966. Not served (draft /netlify.toml = 404).
- Extra in deploy: none.
- STOP per ruling "if anything doesn't match": publish held pending Grant/Vera ruling.

## Read-only smoke on the draft URL (GET only, no submits)
/, /app/, /legal.html, /trust.html, /app/sw.js, /faq.html: all 200.

## Next (on ruling)
restoreSiteDeploy site d9bc6384... deploy 6afbb75ca236e3f36f4848ab, then confirm published id = 6afbb75c and site locked; smoke 200s. Rollback: restore 6afba1b9a6f1c859e9d9695c.
