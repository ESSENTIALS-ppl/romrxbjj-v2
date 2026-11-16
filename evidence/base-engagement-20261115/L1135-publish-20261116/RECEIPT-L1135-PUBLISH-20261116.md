# RECEIPT, L1135 PUBLISH: romrx-io-web 8bf3d601 (P1-06 client) on romrx.io

Written Mon Nov 16, 2026, 10:08 AM ET by Avery. Site `d9bc6384-fc26-44fb-a51d-32aa8f28dd7b` (romrx.io). One draft build, then one publish by restore. Never from main. No Netlify env vars changed. No test submits, sign-ups or emails.

## Gate
- Ledger **L1135** (line 1418): covers ONLY `8bf3d601674fe9bd6ff2252e71409d29a71df662`. CONDITIONS: publish only after migration 031000 is live and post-checked; build from a clean checkout of this sha, not the `/workspace/p1-wt` working tree; QUICK_CHECK_ON stays false (turning it on needs its own line); receipt with rollback to the 360510f deploy; Vera precheck and post-check.
- Covered by L1031 and L1132 (as logged in L1135).
- Vera L1134 post-check **VERIFIED**, sha256 `df937f1e85adaa63c1bc77c075c0937e530380720fc51e5011d2856a28af500c` (sha8 df937f1e), 0 FAIL. File `/workspace/vera-verdicts/vera-47aad435-L1134-server-steps-postcheck-20261116.md`. **031000 FIRST: PASS.** Live version `20261116143905` (`assessment_check_kind`). Receipt `L1134-deploy-20261116/RECEIPT-L1134-2b-031000.md`. Logged as L1167. This is Vera's HARD condition (precheck 3c): the client does not degrade safely if published before 031000.
- Vera L1135 precheck **VERIFIED** (precheck only, strictly after 031000), sha256 `b43bc81ae98b6c49abd56a31d6298c042d9f8f098c71d511b8dc4f5babf43637` (sha8 b43bc81a). File `/workspace/vera-verdicts/vera-8bf3d601-L1135-P1-06-client-precheck-20261116.md`. Conditions for publish, all met:
  1. 030000 and 031000 applied by MCP and post-checked first (`assessments.check_kind` present). Met: L1167 / df937f1e, 031000 live as 20261116143905.
  2. Build from a clean checkout of 8bf3d601 with Netlify site env. Receipt records the published index JS hash and rollback target (360510f deploy, live JS ba5a58c4). Met, below.
  3. QUICK_CHECK_ON stays false. Met, below. Turning it on is NOT covered.
  4. Signed-in results, Settings history and post-login redirect are NOT TESTED here (no sign-in). Someone with a real login should open results once after publish.
- Sable's separate OK for L1135, relayed by Grant at 10:00 AM ET (ledger L1169, 10:01 AM ET): publish 8bf3d601 exactly as pinned.

## Source (fresh checkout, not p1-wt, not main)
- Fresh clone of `https://github.com/ESSENTIALS-ppl/romrx-io-web.git` into `/workspace/romrx-io-web-8bf3d601-publish` (new dir; reference-dissociated from the 360510f publish clone, then `git fetch --tags origin`). Detached at `8bf3d601674fe9bd6ff2252e71409d29a71df662`.
- `git rev-parse HEAD` = `8bf3d601674fe9bd6ff2252e71409d29a71df662`. `git status --porcelain` empty (0 lines) immediately before the build.
- Merge commit, parents `4c86e77fcd816f00dfa0a4183e0e61eb23178c5e` and `50e1d2a5094e97be1311ea0e73c85b49ed0a2d58`. 360510f and UI v5 50e1d2a are ancestors. Author Jules, 2026-11-15 11:13:40 PM ET. Tag `frozen-20261115/P1-06-deploy-candidate` peels to this sha (not used as the checkout source; the origin object was).
- `git diff 360510fe3a3d165d20fe11392715cfedec47eb9c HEAD | sha256sum` = `5a26ffa1490f18914b577812212efbf16a16b17d840b30d2b68dad6272550acf`. `--shortstat`: 16 files, +812 / -18. MATCH to L1135 and Vera 1c. (ba5a58c4 is the previous live JS hash, not a git sha; the pinned diff is vs 360510f.)
- origin/main is `0399cd6df1acc6c5de63733a61fe5ffdc23499c2` and was not checked out or deployed.
- Source flag: `app/src/lib/quickCheck.ts:22` `export const QUICK_CHECK_ON = false`.

## Pre-publish live (10:02 to 10:04:42 AM ET, read only)
- getSite: published_deploy `6afa758f6527e4ba908c3797`, state ready, locked true, stop_builds true. published_at 2026-11-16T03:17:28.941Z = 10:17:28 PM ET Nov 15 (L1125 / 360510f).
- https://romrx.io/app/ served `assets/index-BeU6XAhG.js`, sha256 `ba5a58c42b9cbd9a6657d8593381a2e0ca793a12bfd903ec55549ec916f26900` MATCH to the 360510f publish receipt. No drift.
- Netlify env key names only (values not read into this receipt): CONSENT_ANON_HMAC_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL. QUICK_CHECK_ON is not a site env var. No env key was added, removed or changed.

## Build and draft (no --prod)
- Same method as the 360510f publish: from the clean checkout, `netlify deploy --build --site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b --json` (no `--prod`). Runs the netlify.toml command: `stamp-asset-version`, `cd app`, `npm install`, `npm test`, `npm run build`, `rm -f index.html`. Site env injected by the CLI. Exit 0. Node v24.22.1, npm 11.21.1.
- Started 10:03:08 AM ET (`git rev-parse HEAD` still 8bf3d601, porcelain 0). Draft created 10:03:11 AM ET, deploy_time 21s, state ready, published_at null, context deploy-preview, deploy_source cli, build_id none (CLI local build). Locked window not yet (draft).
- Draft id **`6afb1b2f452d5c9003a7adf4`**. Draft URL: https://6afb1b2f452d5c9003a7adf4--incomparable-pastelito-849104.netlify.app
- Local dist (after the CLI build) and the draft were byte-identical:
  - `app/dist/assets/index-BvI7mSLy.js` sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634` (796231 bytes)
  - `app/dist/assets/index-CXMGY_1-.css` sha256 `0c51a456864b5ffa12ef4c76b4c0a1bfa1e7e0655db18aebf8730db8c87d6c4d`
  - `app/dist/index.html` sha256 `9d1b99ee69d87a1bd8ba05316c518f834bd2639ffb60c05c8629c43b4de60c45`
- Dist / draft greps: QUICK_CHECK_ON 0, "It's a short check" 0 (tree-shaken; flag is false), `check_kind.is.null` 1 and `check_kind.neq.quick` 1 (the 031000-dependent filter), "Card required" 0, "mid-February" 0, `{{P1` 0, "export-my-data" 0, "Export my data" 0. `/dashboard/quick-check` appears once (route string; the UI copy is not in the bundle). U+2014 count 1, inside supabase-js debug text ("access token still valid — preserving session"), not user-facing (same as Vera 5c).
- Draft HTTP 200: `/`, `/app/`, `/app/assessment`, `/app/dashboard/my-protocol`, `/app/dashboard/quick-check`, `/faq.html`. App routes serve `index-BvI7mSLy.js`.
- Source under `app/src` was not modified by the build. Working-tree dirt is stamp-asset-version on marketing HTML plus the removed `app/index.html`, as the netlify.toml command intends. HEAD remained 8bf3d601.

## Publish
- Pre: live still `6afa758f6527e4ba908c3797`, locked true, stop_builds true (getSite 10:04:42 AM ET).
- `netlify api unlockDeploy` on `6afa758f6527e4ba908c3797` at 10:04:49 AM ET; locked became false (updated_at 2026-11-16T15:04:51.976Z).
- `netlify api restoreSiteDeploy` of `6afb1b2f452d5c9003a7adf4` at 10:04:52 AM ET. **published_at 2026-11-16T15:04:53.768Z = 10:04:53 AM ET.**
- `netlify api lockDeploy` on `6afb1b2f452d5c9003a7adf4` at 10:04:54 AM ET. getDeploy 10:04:56 AM ET: locked true, state ready.
- getSite 10:04:56 AM ET: published_deploy `6afb1b2f452d5c9003a7adf4`, locked true, stop_builds true, url https://romrx.io.

## Live read-back (10:05:11 to 10:05:20 AM ET, read only)
- https://romrx.io/app/ serves `assets/index-BvI7mSLy.js`, sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634` BYTE-IDENTICAL to the clean-checkout dist and to the draft. CSS and `app.html` also byte-identical to dist.
- HTTP 200: `/`, `/app/`, `/app/assessment`, `/app/dashboard/my-protocol`, `/app/dashboard/quick-check`, `/faq.html`. App routes serve the new bundle.
- Live bundle greps: same as the dist (QUICK_CHECK_ON 0, quick-check copy 0, check_kind filter 1, banned strings 0). The quick-check UI is not reachable: the flag is false in source, was not a Netlify env, and the copy is tree-shaken out of the published JS. The route string remains so day-7 / day-14 links have a path; with the flag off the page does not render the UI.
- Env key names unchanged after publish; QUICK_CHECK_ON still absent. No env var was changed.
- NOT DONE (by rule): signed-in smoke, form submits, sign-ups, emails. No Supabase writes. No commits or pushes of the web repo. Vera condition 4 remains for someone with a real login (results, Settings history, post-login redirect).

## Rollback
Target: Netlify deploy **`6afa758f6527e4ba908c3797`** (git sha 360510f, bundle `index-BeU6XAhG.js` sha256 `ba5a58c42b9cbd9a6657d8593381a2e0ca793a12bfd903ec55549ec916f26900`). Site `d9bc6384-fc26-44fb-a51d-32aa8f28dd7b`. Restore costs no build credits. After this publish, 6afa758f is unlocked (it was unlocked for the swap and is no longer published), same pattern as L1125 left 6afa6a79.

Exact restore steps:
1. `netlify api unlockDeploy --data '{"deploy_id":"6afb1b2f452d5c9003a7adf4"}'`. Confirm locked false.
2. `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afa758f6527e4ba908c3797"}'`.
3. `netlify api lockDeploy --data '{"deploy_id":"6afa758f6527e4ba908c3797"}'`.
4. `netlify api getSite --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b"}'`: published_deploy id `6afa758f6527e4ba908c3797`, locked true, stop_builds true.
5. Read back https://romrx.io/app/: serves `index-BeU6XAhG.js`, sha256 `ba5a58c42b9cbd9a6657d8593381a2e0ca793a12bfd903ec55549ec916f26900`.

Older fallback, not the L1135 target: `6afa6a79356b51c2d5593214` (61f948b3, bundle `index-BgdxSK4P.js` sha256 `92e48470e3e086e9b2a2dc0fe4687b18bac590cb20f9e6da59a207533d69dd23`).

## Not touched
- QUICK_CHECK_ON stays false. No Netlify env var changed. EXPORT_MY_DATA stays off.
- No deploy from main. No force-push, deletes or gc. No test submits on live. Supabase not written.
- c225588 (Jules TZ v2) was not an ancestor and was not published. If it ships later it must be rebased onto 8bf3d601 under a new sha and a new ledger line (L1135 note). The P1-17 client similarly needs a rebase onto 8bf3d601 (L1169).
