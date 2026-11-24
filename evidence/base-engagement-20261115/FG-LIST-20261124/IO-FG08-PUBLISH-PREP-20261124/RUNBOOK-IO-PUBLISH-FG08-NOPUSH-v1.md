# io publish: FG-08 + score chip on live base 01954ec4 (no push client)

Input from Jules: TAG, TIP, DIST. Site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b stays locked; publish only via restoreSiteDeploy.
Live now (read 6:40 PM ET): deploy 6b0600ce41ac0f5c3cb14eb6 = combined-io-fg-v3 01954ec4, locked, stop_builds on. ROLLBACK = 6b0600ce41ac0f5c3cb14eb6.

## A. Verify the cut (read-only)
1. `./verify_cut.sh <TAG> <DIST>` (full run, local build). Stop on any FAIL. It checks:
   - tag -> commit; 01954ec4 is an ancestor; the 4 picks of 778b34e6, e389902, 0be2ab5, 311538a1 listed
   - diff vs 01954ec4 = only the 8 FG-08/chip files; sw.js, pushSubscribe.ts, pushCopy.ts, Settings.tsx, legal.html unchanged; SHOW_PUSH = false
   - tree vs Avery's unpushed reference cherry-pick a2b50f4 (tree b2fb699a): IDENTICAL expected; any difference is shown and needs a reason before going on
   - My Body check on TIP (check/mybody_check.mjs): dial 89, chip +4 vs Nov 10, started Oct 4 -> now Nov 17 Body score +10, 10 joint trends with dated %
   - local `netlify build --context production` from git archive with COMMIT_REF = TIP; manifest sha256 = DIST (MISMATCH = stop)
   - built index-*.js push markers equal the live bundle (requestPermission 2, save-push-subscription 0, pushManager.subscribe 0, "Push notifications" 0)
2. Secret scan of verify-<TAG>/build/app/dist (service_role, sk_live, sk_test, VAPID private): 0 hits.

## B. Before
3. `netlify api getSite --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b"}'` -> published_deploy.id 6b0600ce41ac0f5c3cb14eb6, locked true, stop_builds true. Anything else: stop.
4. SQL (read-only): `select count(*) from public.push_subscriptions;` (0 at 6:43 PM ET).

## C. Publish
5. Draft: `cd verify-<TAG>/build && netlify deploy --dir . --no-build --site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b --message "FG-08+chip <TAG> <TIP8> (dist <DIST8>)" --json` (never --prod). Record deploy_id.
6. Draft check on its deploy URL: /app/ 200; its index-*.js sha256 equals the local build file.
7. `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"<NEW>"}'`
8. `netlify api lockDeploy --data '{"deploy_id":"<NEW>"}'`

## D. After
9. getSite again: published_deploy.id = NEW, locked true, stop_builds true.
10. `netlify api listSiteFiles` sha1 vs local build sha1 for every published file; romrx.io/app/ serves the new index-*.js.
11. push_subscriptions count again: unchanged.
12. My Body on ebfe4f3d: `node check/mybody_check.mjs <TIP>` plus the live bundle level check: the live index-*.js equals the verified local build (so the PASS from A.1 applies to live).

## E. Rollback
`netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6b0600ce41ac0f5c3cb14eb6"}'` then `netlify api lockDeploy --data '{"deploy_id":"6b0600ce41ac0f5c3cb14eb6"}'`, then getSite readback.

## F. Receipt
RECEIPT-IO-PUBLISH-FG08-v1.md + SHA256SUMS (sha256sum -c passes), committed on evidence/receipts-rebuilt-20261115. Then STEP 2: ai-chat v108 per STAGED-ai-chat-v108-20261124/RUNBOOK-DEPLOY-v108.md.
