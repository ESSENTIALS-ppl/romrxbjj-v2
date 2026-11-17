# RECEIPT, TZ fix publish: romrx-io-web adc6249b (P1-05 follow-on) on romrx.io

Written Mon Nov 16, 2026, 7:19 PM ET by Avery. Site `d9bc6384-fc26-44fb-a51d-32aa8f28dd7b` (romrx.io). One local live-env build, one manual CLI draft, then one publish by restore. Never from main. No Netlify env vars changed. No test submits, sign-ups or emails. No hosted (git-triggered) build.

## Gate
- Ledger **L1188** pin of `adc6249b7a778b2ea5b94afe8d380f1b3482b7b6`. **L1195** cleared this to ship alone. **L1197** names Avery as publisher. Covered by **L1031**.
- Vera precheck **057bff88** clean. Sable OK, relayed by Grant. Grant GO at 7:14 PM ET.
- Prep recorded in `PREP-TZ-adc6249b-20261116.md` (sha256 `fd85377485161f1765fc0008ac505c5839eed7f512910859231c6c8c81cb1846`), written 7:16:41 PM ET, before the deploy.
- Rollback target: deploy **`6afb1b2f452d5c9003a7adf4`** (git sha 8bf3d601, bundle `index-BvI7mSLy.js` sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634`).
- QUICK_CHECK_ON stays false. Turning it on is not covered.

## Source (fresh worktree, not p1-wt, not main)
- Detached worktree `/workspace/tz-publish-adc6249b` from `https://github.com/ESSENTIALS-ppl/romrx-io-web.git` (via `/workspace/p1-wt`). Created 7:13:32 PM ET at `adc6249b7a778b2ea5b94afe8d380f1b3482b7b6`.
- `origin/fix/tz-c225588-on-8bf3d60-20261116` and tag `frozen-20261116/TZ-c225588-on-8bf3d60` peel to this sha.
- `git rev-parse HEAD` = `adc6249b7a778b2ea5b94afe8d380f1b3482b7b6` immediately before the official build (7:15:34 PM ET) and immediately before the draft deploy (7:17:38 PM ET). Porcelain 0 before the official build.
- One commit on live git sha `8bf3d601674fe9bd6ff2252e71409d29a71df662`. Author Jules, commit date Mon Nov 16, 2026 7:00:31 PM ET. TZ fallback v2: unknown device zone uses America/New_York at all three client sites.
- `git diff 8bf3d601674fe9bd6ff2252e71409d29a71df662 HEAD | sha256sum` = `7abbce2c10b3a78f2751ed142ec0d36b78d6407b2ed87afbf32b017484d085d9`. `--shortstat`: 5 files, +101 / -3. `git patch-id --stable`: `c100afea65966991232ac351ff08799f6a957086`.
- `origin/main` is `872c0ad7b51bf9fac78c402df6e96f1dd234c282` and was not checked out or deployed. The Netlify deploy object still shows `branch: main` as the CLI default (same as L1135); the checkout and the `--message` title are adc6249b, and `commit_ref` is null.
- Source flag: `app/src/lib/quickCheck.ts:22` `export const QUICK_CHECK_ON = false`.

## Build (local live-env, no deploy)
- `NETLIFY_SITE_ID=d9bc6384-fc26-44fb-a51d-32aa8f28dd7b netlify build --context production` from the clean worktree. Official run 7:15:34–7:15:54 PM ET, exit 0, Netlify Build 17.3s. Same netlify.toml command as L1135 (`stamp-asset-version`, `npm install`, `npm test`, `tsc -b && vite build`, `rm -f app/index.html`). Site env injected by the CLI. Values not read into this receipt. No env key added, removed or changed. QUICK_CHECK_ON is not a site env var.
- Tests: **83 test files passed (83). 1261 tests passed | 5 skipped (1266).** Typecheck (`tsc -b`) passed as part of `npm run build`.
- Local dist:
  - `app/dist/assets/index-XXlJp1mg.js` sha256 `5e51c67f28abcc7039248fd6fd8f3c89081fd455ea3371858efec7fd647f5c17` (796270 bytes)
  - `app/dist/assets/index-CXMGY_1-.css` sha256 `0c51a456864b5ffa12ef4c76b4c0a1bfa1e7e0655db18aebf8730db8c87d6c4d` (byte-identical to the previous live CSS)
  - `app/dist/index.html` sha256 `477064f72b8054875676afbda711ebd6f146dcb62f3a2d2cf3c8e6ddf8bebd3b`. References `/app/assets/index-XXlJp1mg.js`.
- Dist greps: `America/New_York` 3; `||"UTC"` / `||'UTC'` fallback form 0; QUICK_CHECK_ON 0; "It's a short check" 0; `check_kind` filters present; banned strings 0.
- HEAD remained adc6249b. Expected dirt only: stamp-asset-version on marketing HTML plus removed `app/index.html`.
- Hosted build_id: none (CLI local). Prep build used no Netlify build minutes.

## Pre-deploy stop check (7:16:54–7:17:02 PM ET, read only)
All items PASS. If any had failed, nothing would have been deployed.
- published_deploy `6afb1b2f452d5c9003a7adf4`, state ready, locked true. `build_settings.stop_builds` true.
- listSiteDeploys: ready 92, error 8, non-terminal 0. Only locked deploy is 6afb1b2f. listSiteBuilds: unfinished 0.
- https://romrx.io/app/ (cache-bust) HTTP 200, `index-BvI7mSLy.js` sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634`. No drift.

A second getSite immediately before unlock (7:18:12–7:18:14 PM ET) still showed published_deploy 6afb1b2f, locked true, stop_builds true.

## Draft (no --prod)
- From `/workspace/tz-publish-adc6249b`, detached at adc6249b: `netlify deploy --no-build --dir . --site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b --message "adc6249b7a778b2ea5b94afe8d380f1b3482b7b6 TZ fallback v2 (manual CLI, not from main)" --json`. Never `--prod`. Never a git-triggered build. `app/node_modules` was moved out of the tree first so it could not be uploaded (the CLI also skips `node_modules` when `--dir` is the repo root).
- Started 7:17:38 PM ET, exit 0 at 7:17:47 PM ET. Draft created 7:17:42 PM ET (`created_at` 2026-11-17T00:17:42.294Z). deploy_time 4s, state ready, published_at null, context deploy-preview, deploy_source cli, build_id none, title is the message above (references adc6249b).
- Draft id **`6afb9d261d2f405269bcab7a`**. Draft URL: https://6afb9d261d2f405269bcab7a--incomparable-pastelito-849104.netlify.app
- Draft HTTP 200 at 7:17:56–7:17:59 PM ET: `/app/` HTML, JS and CSS were byte-identical to the local dist (JS sha256 `5e51c67f…`, `America/New_York` 3, QUICK_CHECK_ON 0).

## Publish
- `netlify api unlockDeploy` on `6afb1b2f452d5c9003a7adf4` at 7:18:14 PM ET; locked became false (`updated_at` 2026-11-17T00:18:16.097Z = 7:18:16 PM ET).
- `netlify api restoreSiteDeploy` of `6afb9d261d2f405269bcab7a` at 7:18:16 PM ET. **published_at 2026-11-17T00:18:18.008Z = 7:18:18 PM ET.**
- `netlify api lockDeploy` on `6afb9d261d2f405269bcab7a` at 7:18:18 PM ET. getDeploy 7:18:22 PM ET: locked true, state ready, title still references adc6249b, commit_ref null, build_id none.
- getSite 7:18:20–7:18:22 PM ET: published_deploy `6afb9d261d2f405269bcab7a`, locked true, stop_builds true, url https://romrx.io.

## Live read-back (7:18:37–7:18:43 PM ET, cache-bust, read only)
- https://romrx.io/app/ serves `assets/index-XXlJp1mg.js`, sha256 `5e51c67f28abcc7039248fd6fd8f3c89081fd455ea3371858efec7fd647f5c17` BYTE-IDENTICAL to the clean-checkout dist and to the draft. CSS and `index.html` also byte-identical to dist. index.html references `/app/assets/index-XXlJp1mg.js`.
- The served JS contains `America/New_York` 3 times and QUICK_CHECK_ON 0.
- HTTP 200: `/`, `/app/`, `/app/assessment`, `/app/dashboard/my-protocol`, `/faq.html`.
- Rollback target `6afb1b2f452d5c9003a7adf4` is still listed: state ready, locked false, published_at still 10:04:53 AM ET (its own earlier publish). Restorable. Same pattern as L1135 left the previous live deploy unlocked once it was no longer published.
- Env not changed. QUICK_CHECK_ON still not a site env var.
- NOT DONE (by rule): signed-in smoke, form submits, sign-ups, emails. No Supabase writes. No commits or pushes of the web repo.

## Credits / build minutes
- Hosted Netlify build_id: none. CLI local build + `restoreSiteDeploy`. **0 build minutes, 0 build credits.** Restore does not bill a build. No git-triggered build was started. Account credit usage was not otherwise visible from the read-only deploy/site fields.

## Rollback
Target: Netlify deploy **`6afb1b2f452d5c9003a7adf4`** (git sha 8bf3d601, bundle `index-BvI7mSLy.js` sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634`). Site `d9bc6384-fc26-44fb-a51d-32aa8f28dd7b`. Restore costs no build credits. After this publish, 6afb1b2f is unlocked (it was unlocked for the swap and is no longer published).

Exact restore steps:
1. `netlify api unlockDeploy --data '{"deploy_id":"6afb9d261d2f405269bcab7a"}'`. Confirm locked false.
2. `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afb1b2f452d5c9003a7adf4"}'`.
3. `netlify api lockDeploy --data '{"deploy_id":"6afb1b2f452d5c9003a7adf4"}'`.
4. `netlify api getSite --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b"}'`: published_deploy id `6afb1b2f452d5c9003a7adf4`, locked true, stop_builds true.
5. Read back https://romrx.io/app/: serves `index-BvI7mSLy.js`, sha256 `7fce236243c355a4f16d2adb74c8de134e29ef34295ae913bf43bfc1a7063634`.

Older fallback, not the first rollback target: `6afa758f6527e4ba908c3797` (360510f, bundle `index-BeU6XAhG.js` sha256 `ba5a58c42b9cbd9a6657d8593381a2e0ca793a12bfd903ec55549ec916f26900`).

## Not touched
- QUICK_CHECK_ON stays false. No Netlify env var changed. EXPORT_MY_DATA stays off.
- No deploy from a main checkout. No force-push, deletes or gc. No test submits on live. Supabase not written.
