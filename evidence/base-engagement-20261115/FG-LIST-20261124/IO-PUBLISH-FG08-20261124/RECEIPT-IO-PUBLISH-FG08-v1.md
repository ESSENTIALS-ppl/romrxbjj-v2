# Receipt: io publish, FG-08 trend lines + score chip on live base 01954ec4 (Nov 24, 2026)
Approval: Jim in Sable's 1:1 ("Why wait until tomorrow morning?" re score fix + trend lines), relayed by Grant 6:39 PM ET. Cut by Jules: tag frozen-20261124/fg-08-on-live-v3 (object 462a601d), tip 113f1d45a1fd9a1ac2981a9cd60d485276c67fbc, dist c95a7c5f (414 files), his receipt 9768445e.
Before: deploy 6b0600ce41ac0f5c3cb14eb6 (combined-io-fg-v3 01954ec4), locked, stop_builds on. push_subscriptions 0 (6:46:03 PM ET).
After: deploy 6b0621cab87dcb66dccff633 (113f1d45), published 6:46:40 PM ET via restoreSiteDeploy, lockDeploy confirmed, locked true, stop_builds true. push_subscriptions 0 (6:47:06 PM ET).
Rollback: restoreSiteDeploy site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b deploy 6b0600ce41ac0f5c3cb14eb6, then lockDeploy 6b0600ce41ac0f5c3cb14eb6, then getSite readback.
Verify (verify_cut.sh, prep SUMS f4b7110c, evidence b5de9707), all PASS:
- 01954ec4 is an ancestor; 4 picks of 778b34e6, e389902, 0be2ab5, 311538a1; only the 8 FG-08/chip files differ from live; sw.js, pushSubscribe.ts, pushCopy.ts, Settings.tsx, legal.html unchanged; SHOW_PUSH = false.
- Tree b2fb699a, identical to Avery's unpushed reference cherry-pick a2b50f4.
- Local production build from git archive (COMMIT_REF 113f1d45): dist c95a7c5f89051e0e4d4215ef8a89510b0d654aad99a6352b32add91d1ade6a13, 414 files, MATCH with Jules.
- Push markers, built vs live bundle: requestPermission 2/2 (both DeviceOrientationEvent, ROMeter, as Jules said), Notification.requestPermission 0/0, save-push-subscription 0/0, pushManager.subscribe 0/0, "Push notifications" 0/0, serviceWorker.register 0/0. Expectations agreed with Jules, so none changed. check_markers-v1.sh replaces verify_cut.sh step 10, which stopped after its first marker (grep with no match under pipefail); recorded here, verify_cut.sh left unchanged.
- Secret scan of the built app/dist: 0 hits.
- Draft 6b0621ca: /app/ 200, index-C_xDmddr.js sha256 equal to local build; live unchanged while draft.
Read-back after publish:
- listSiteFiles: 412 published files, 411 sha1 equal to the local build, 0 missing; netlify.toml differs (the deploy step rewrites it, same as the v3 publish). Local-only: app/.env.example, app/.gitignore (dotfiles not uploaded).
- romrx.io/app/ serves index-C_xDmddr.js, sha256 e979fd21... equal to the verified local build; contains "Where you started" and "Where you are now".
My Body check on ebfe4f3d (check/mybody_check.mjs on 113f1d45, the code now live; data from the my_joint_history / my_joint_start_vs_now rpcs read-only): PASS. Dial 89; chip +4 vs Nov 10 (not -0, not +5); Where you started Oct 4, 2026 -> now Nov 17, 2026, Body score +10; 10 joint trends, each Oct 4 / Nov 10 / Nov 17 with %, from the my_joint_history rpc (e.g. Shoulder Flex 34% -> 82% -> 96%).
Not touched: push flags, VAPID, auto-publish lock, crons, any send.
