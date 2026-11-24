# LIVE: Terms version bump + romrx.io combined-io-fg-v3 publish (Base only)
Nov 24 2026, 4:23-4:27 PM ET. GO: Grant 4:23 PM ET (Sable cleared text, Base pages only). Order: SQL first, then io publish.
Nothing on BJJ/BB sites. No edge deploys. No sends, no invokes, no real signup. No secrets printed.

## Pre-verify (all PASS, before any write)
- Tag frozen-20261124/combined-io-fg-v3: object 379f8e75f871cdbe09268e8d3b165f96a94caf03 -> commit 01954ec4f9e7c512617c4ee97804ac6c7de80343.
- Rebuild like r10b: git archive of 01954ec4, COMMIT_REF = tip, `netlify build --context production` with the live site env
  (NETLIFY_SITE_ID d9bc6384, read only). EXIT 0; vitest 98 files, 1403 passed, 7 skipped.
- Dist manifest (all files, no node_modules/.netlify): 410 files, sha256 548d3c5dfb5669390cdfce1598244495f13dcc147149011dc0e9a0d7a63183da
  = Jules's JULES-COMBINED-IO-FG-V3-DIST-MANIFEST-20261124.txt byte for byte (receipt sha 01cea0fc...).
- Bundle app/dist/assets/index-BP9LXJi1.js (sha256 b4b0043a519e4a3aff55db8fe1a2447bd75e6336c9846145efc030171f15cb1e):
  TERMS_VERSION Cg=`terms-2026-12-31-v1`, used by signup metadata (terms_version:Cg) and re-accept (p_terms_version:Cg);
  gate lookup .in(`terms_version`,[`2026-10-19`,`terms-2026-12-31-v1`]), no .eq on terms_version.
  Push UI: "Reminder notifications" 0, pushManager 0.
- r9..tip: 37 files, +969/-197. No pack/coach/athlete page or file added; pack pages are r9 bytes. Added lines naming packs are
  the approved Terms s2/s6 sentences; the coach line in Privacy already exists in r9.
- "free until March 1, 2027": 12 hits (index, faq, about, universe, beta, app bundle).
- Addresses in deployable files: only romrx.io role addresses, an example.com placeholder, and owner addresses, all already in r9. No customer addresses.
- Live TERMS before md5s (4:23 PM ET) = staged live-before values.

## 1. SQL (applied 4:25:06 PM ET)
- MCP apply_migration name terms_version_20261231_v1 -> applied id 20261124212506.
  File sha256 42ebcff94f336521a1c82a75beabe48b0447a289a4682f448f73612d1c201be6; applied-id copy 20261124212506_terms_version_20261231_v1.sql (same bytes).
- Before md5: current_terms_version c5a7810a30ab09223beb2648fda071af; record_signup_terms_consent a7ab226f5eb70ca2633c6965c915599e;
  record_terms_reaccept fc925f42b5592001d8003d1adeb20fa3; accepted_terms_version absent.
- After md5 (= expected-after-md5.txt): accepted_terms_version bc5a058300ec4029ea02a2496111d0be; current_terms_version 247f8567ba059ceef859fd8774899e3c;
  record_signup_terms_consent 2a9c1ac04978054083bf2a01195adcb6; record_terms_reaccept f45533176090ce0e7bfa832265c8006a.
- current_terms_version() = terms-2026-12-31-v1; accepted_terms_version('2026-10-19') = true.
- Consents counts: no rows changed by this. 2026-10-19 went 4 -> 5 between 4:15 and 4:25 PM ET (one normal signup before the bump).

## 2. io publish (site d9bc6384, romrx.io)
- Before: published 6afbc0d63fb2af5613761122, locked true, stop_builds true.
- 4:25:30 PM ET: `netlify deploy --dir . --no-build` (draft, not --prod) -> deploy 6b0600ce41ac0f5c3cb14eb6. Live unchanged after upload.
- 4:26:07 PM ET: restoreSiteDeploy 6b0600ce41ac0f5c3cb14eb6. The response already said locked true; lockDeploy 4:26:09 PM ET confirmed (no-op).
  Auto-publish was never unlocked.
- After: published 6b0600ce41ac0f5c3cb14eb6, locked true, stop_builds true.
- Live files vs local rebuild (listSiteFiles sha1): 408 served, 407 identical, 0 missing; only /netlify.toml differs (post-build config, same as r9).
  The 2 manifest files not served are dotfile-type app/.env.example and app/.gitignore (CLI skips them).

## 3. Live read-back (4:26:40 PM ET)
- https://romrx.io/legal#privacy (200): FG-05 line x1; FG-21 line x1; "progress photos" 0; header
  "Last updated November 24, 2026. Effective December 31, 2026." x1; data-terms-version="terms-2026-12-31-v1" x1; id="privacy" x1; ?v=01954ec4 stamp.
- https://romrx.io/app/ (200) loads index-BP9LXJi1.js; served bundle sha256 = local b4b0043a. /app/signup 200.
  The signup sends terms_version terms-2026-12-31-v1 (served bundle, terms_version:Cg with Cg=`terms-2026-12-31-v1`). No real signup made.
- Draft URL: https://6b0600ce41ac0f5c3cb14eb6--incomparable-pastelito-849104.netlify.app

## Rollback (this order)
1. `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afbc0d63fb2af5613761122"}'`, then lockDeploy 6afbc0d6; read back published+locked.
2. Then MCP apply_migration of terms_version_20261231_v1.rollback.sql (restores the 3 before md5s, drops accepted_terms_version).
   No consent rows are deleted. Doing SQL first would make signups from the new io bundle fail.
