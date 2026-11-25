# Base fixes publish: My Protocol length tiers + ROMBot iPhone layout (romrx.io)

Result: PASS. Published 7:53:57 PM ET Nov 24 2026; site d9bc6384 LOCKED.
Order: Jim via Sable 1:1 ("There is no difference between standard and full... Wouldn't we add more?", "Also ROMBot doesn't fit the phone screen"), under his ship-tonight order; relayed to Avery 7:51 PM ET.

## Source
- Tag frozen-20261124/base-fixes-tiers-rombot-layout, object 513d65784a471ec5ba81852ce13a392b0beb2e39 -> 873a2152be6896e43e9e21b96f770afab3977a70 (ls-remote origin), off 50b92ee3 (ancestor: OK).
- Commits: 42eee7b8 (length tiers), 873a2152 (ROMBot iPhone layout).
- Files vs 50b92ee3: app/index.html (viewport-fit=cover), app/src/index.css, app/src/hooks/useFitToViewport.ts, app/src/pages/ROMBot.tsx, app/src/lib/sessionLength.ts(+test), app/src/pages/MyProtocol.tsx, app/src/lib/__fixtures__/baseLibrary-20261124.json (catalog rows only), protocolLengthTiers.test.ts, rombotLayout.test.tsx. Tiers + ROMBot layout only.
- Unchanged: app/public/sw.js, pushSubscribe.ts, pushCopy.ts, Settings.tsx, ReminderOptIn.tsx. Pack paths touched: 0. Emails added: 0.
- Jules receipt /workspace/process/evidence/JULES-BASE-FIXES-20261124-RECEIPT.md sha256 f2972f9f52ec5e9120cb4f61a2656f335c9e5ac40ddc935e0bdfa4b3bd1d7d70.

## Build (same method as the r10b publish)
- git archive 873a2152 + netlify build --context production: EXIT 0; tests 1559 passed / 7 skipped (106 files).
- Dist manifest sha256 a6e26bbb2a80a87ce1a021c86bbdc4e5fafbb1543bb36f01d76c6057ff976eaa (422 files) = Jules: MATCH.
- Bundle app/assets/index-CcRbZNxV.js sha256 481aeaf3ffaae489cd1bf10cceb15bb38cb177e49e107190631d7652484c00c8.
- sw.js sha256 bff352dd03d7a8ecdef8f2acb66907a7ecd46319f34ef388a34eac94a6796979, byte-identical to the r10b build (cmp).
- Scans: build log JWT 0 / service_role 0 / sk_ 0 / private key 0. Dist: sk_ 0, VAPID_PRIVATE 0, private key 0; "service_role" appears as a word in 5 repo files (same 5 as r10b: 3 netlify functions, 1 migration, 1 test), no key values.

## Netlify (site d9bc6384-fc26-44fb-a51d-32aa8f28dd7b)
- Before (7:53:30 PM ET): published 6b06243dc00d349b1519723a, locked true, stop_builds true; live bundle index-ClqnSsyf.js, sw.js bff352dd.
- Draft (never --prod): 6b06318efa611ea6a3f31b5e. Draft /app/ 200; bundle and sw.js hashes equal to local build; live unchanged.
- restoreSiteDeploy 6b06318efa611ea6a3f31b5e at 7:53:57 PM ET; lockDeploy -> locked true.
- After: published 6b06318efa611ea6a3f31b5e, locked true, stop_builds true (rechecked 7:58 PM ET). Auto-publish not unlocked.
- Rollback: netlify api restoreSiteDeploy {site_id d9bc6384..., deploy_id 6b06243dc00d349b1519723a}, then lockDeploy 6b06243dc00d349b1519723a, then getSite readback.

## Post-publish checks
- listSiteFiles 420: sha1 equal to local build 419; differs 1 (/netlify.toml, as in r10b); missing 0. Netlify lower-cases paths, so the compare is case-insensitive.
- romrx.io/app/ 200, serves index-CcRbZNxV.js sha256 481aeaf3ffaae489; CSS index-BoIyvgsV.css equals local; /app/sw.js bff352dd03d7a8ec = before (unchanged).

## Tiers (read-only, live bundle logic)
Method: the live bundle's own functions (alias map, toRx, dedupe, groupByJoint, movement key, planSession, rotation) extracted verbatim from romrx.io index-CcRbZNxV.js (verify/tiers/extracted-live-functions.js) and run on ebfe4f3d's saved protocol (assessment a9b06108, Nov 17; 8 rows) plus the Base catalog (149 rows, sports general), both read by SELECT at 7:55 PM ET. No session, no writes, no ROMBot messages.

| Day | Area | Quick | Standard | Full | "2 rounds" | Q<S<F |
|---|---|---|---|---|---|---|
| Mon | Hip Flexion | 1: 90/90 Hip Lift | 2: 90/90 Hip Lift; Supine Knee-to-Chest Stretch | 4: 90/90 Hip Lift; Goblet Squat with Pause; Standing Knee Drive with Band; Supine Knee-to-Chest Stretch | no | yes |
| Tue | Shoulder ER | 2: Band Face Pull ER; Doorway Pec Stretch | 3: + Posterior Shoulder/Infraspinatus Release with Ball | 6: + Prone Y Raise; Side-Lying Shoulder ER with Band; Posterior Shoulder Release with Lacrosse Ball | no | yes |
| Wed | Shoulder Flexion | 2: Kettlebell Arm Bar; Supine Overhead Stretch with Band | 3: + Lat Foam Roll | 6: + Wall Slide (Forearm Version); Prone Y Raise; Child's Pose Lat Stretch | no | yes |
| Lower back extension (catalog; ebfe4f3d has no lumbar joint) | Lumbar Ext | 1: McKenzie Press-Up | 2: McKenzie Press-Up; Prone Sphinx Hold | 2 x 2 rounds (same 2) | Full only | yes |

Hip Flexion has no foam roll in the catalog, so its Standard is 2 and Quick is 1. Doses are the DB rows unchanged; ROMBot 3x10 untouched.

## ROMBot layout (headless Chromium on the LIVE bundle)
Fake signed-in session for a fake user (user@example.com); all 28 Supabase requests answered locally by the script (none reached the server, including 2 analytics POSTs). Keyboard simulated by focusing the input and shrinking the viewport.

| Size | State | Input box (top-bottom) | Send button | On top (hit test) | Result |
|---|---|---|---|---|---|
| 390x844 | keyboard closed | 800-844 | 800-844 | yes | PASS |
| 390x844 | keyboard 336 px | 464-508 of 508 | 464-508 | yes | PASS |
| 375x667 | keyboard closed | 623-667 | 623-667 | yes | PASS |
| 375x667 | keyboard 260 px | 363-407 of 407 | 363-407 | yes (overlay mode) | PASS |

Page scrollY 0 in all four. Note: in headless the input sits flush on the bottom edge (env(safe-area-inset-bottom) = 0); on an iPhone the safe-area padding adds space. No real iPhone was tested.

## ROMBot mood (relayed finding, evidence d48bfd10)
ROMBot mood: not a bug. ROMBOT_MOOD is on. Jim has 2 check-ins (Oct 27, Oct 28) but only the v2 email consent, not the v3 ROMBot consent, so ROMBot correctly reads nothing. The 'no mood data' reply dates from Oct 28. Nothing changed. He needs to turn the ROMood opt-in back on. Evidence d48bfd10.

## Not done
No edge functions, SQL, secrets, emails or ROMBot messages. 7c71e421 and 076ce453 not touched.
