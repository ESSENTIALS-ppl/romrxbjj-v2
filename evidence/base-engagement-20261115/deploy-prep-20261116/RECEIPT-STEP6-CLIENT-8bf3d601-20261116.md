# PREP RECEIPT, Step 6: Jules's client 8bf3d601 (romrx.io web app). PREP ONLY, NOT PUBLISHED.

Written Mon Nov 16, 2026, about 9:15 AM ET by Avery. Publish only after migration 031000 (Step 2b) is live and post-checked. QUICK_CHECK_ON stays false.

## Where it is
- Repo **ESSENTIALS-ppl/romrx-io-web** (local /workspace/p1-wt). It is NOT in romrxbjj-v2.
- Commit `8bf3d601674fe9bd6ff2252e71409d29a71df662` (tree 5707c2fde5d29edd72533e06454dc6ff33df206c), author Jules, Sun Nov 15, 2026 11:13:40 PM ET. "Merge P1-06 UI v5 (f57431b, 143d2e9, 50e1d2a) into deploy candidate on 360510f".
- Origin branch `feat/p1-06-deploy-candidate-on-360510f-20261115` (tip = 8bf3d601). Annotated tag `frozen-20261115/P1-06-deploy-candidate` (tag object b582610978779f7f66a5379358101ca7f7aff02b → 8bf3d601).
- **It is a merge commit with 2 parents:**
  - first parent `4c86e77fcd816f00dfa0a4183e0e61eb23178c5e` = merge of live `360510fe3a3d165d20fe11392715cfedec47eb9c` + quick pair v2 `d03047571bd8b8f2df3b0205bdb9cc705e3e392e` (0a4dc45 + d030475, P1-06b assessment reads skip quick rows).
  - second parent `50e1d2a5094e97be1311ea0e73c85b49ed0a2d58` = P1-06 UI v5 (on 143d2e9 → f57431b), "match Avery's final server set (tip 47aad435) exactly".
- Contains live 360510f (ancestor check passes). Commits in 360510f..8bf3d601: f57431b, 0a4dc45, d030475, 143d2e9, 50e1d2a, 4c86e77, 8bf3d601.
- Patch shas: combined merge diff is empty (clean merge, e3b0c442…). First-parent patch (`git show -m --first-parent --format= --patch`) `94f571aa3653b08694f411d1f1041467daa4cd1b9307d0c9710718575eac3ffa`.

## Diff vs live (360510f)
- `diffs-vs-live/8bf3d601-client-vs-live-360510f.diff`, sha256 `5a26ffa1490f18914b577812212efbf16a16b17d840b30d2b68dad6272550acf`. Stat: 16 files changed, 812 insertions(+), 18 deletions(-). The diff contains no email addresses.
- Files: App.tsx (+2, the /dashboard/quick-check route), components/QuickCheckBanner.tsx (new), hooks/useProfile.ts, lib/assessmentDraftStore.ts, lib/assessmentReads.ts (+test, new), lib/postAuthDest.ts, lib/quickCheck.ts (+test, new), lib/quickCheckLoad.ts (new), lib/quickCheckWindow.test.ts (new), pages/AssessmentMeasureScreen.tsx, pages/MyProtocol.tsx, pages/QuickCheck.tsx (new), pages/ResultsPreview.tsx, pages/Settings.tsx.

## Why it depends on 031000 being live (hard dependency)
Not behind the flag: `skipQuick()` adds the PostgREST filter `or=(check_kind.is.null,check_kind.neq.quick)` to assessments reads in MyProtocol TodayCard (cycle start), Settings history and postAuthDest (login destination). Against a table without `check_kind`, those reads return an error. The Today card date and the Settings history would break, and login would fall back to DEFAULT_HOME. useProfile also filters get_my_profile output client-side (null-safe). So: **031000 live first**, and 031200 ideally too (server reads skip quick). The schedule/quick reads in quickCheckLoad.ts (user_mobility_schedule, from 030000) run only behind QUICK_CHECK_ON.

## QUICK_CHECK_ON (read-only)
- It lives in the source as a hard-coded constant, not an env var or Netlify setting: `app/src/lib/quickCheck.ts:22  export const QUICK_CHECK_ON = false` at 8bf3d601. Both quickCheck.test.ts:14 and quickCheckWindow.test.ts:26 assert it is false. QuickCheckBanner returns null and QuickCheck.tsx redirects to Today while it is false.
- Live today: romrx.io/app/ serves `index-BeU6XAhG.js`, sha256 ba5a58c42b9cbd9a6657d8593381a2e0ca793a12bfd903ec55549ec916f26900 (= L1125/L1128, no drift). It has no QUICK_CHECK_ON and no quick-check route. Turning it on would need a new commit, its own gate and Stacy's words. It is not part of this step.

## Tests
I did not run the vitest suite today (the web node_modules are not installed, and the box inode budget is tight). Jules's numbers are in the ledger for the earlier pieces (L1126: UI v3 1233 pass / 5 skip; quick pair v2 1228; stacked 1239). There is no recorded run for the exact merge 8bf3d601 in the ledger. Vera's precheck should ask Jules for the 8bf3d601 run (and the build hash).

## Backup / rollback
Rollback = Netlify restoreSiteDeploy `6afa758f` (the live 360510f deploy, bundle ba5a58c4, L1125). The older fallback is 6afa6a79 (61f948b3). Site d9bc6384…

## Publish form (Jules / whoever holds the Netlify step, after Grant relays the OK)
A clean build clone at HEAD exactly `8bf3d601674fe9bd6ff2252e71409d29a71df662` (not p1-wt's working tree), one publish, record the deploy id and bundle hash, then lock (the 360510f pattern, L1125). Never from main.

## Post-check plan (read-only)
1. romrx.io/app/ serves the new bundle, and its hash equals the clone's dist.
2. The bundle has `check_kind.is.null,check_kind.neq.quick` and does not have QUICK_CHECK_ON true. The /dashboard/quick-check route redirects (flag false).
3. Supabase API logs (`query_logs`, read-only) for `/rest/v1/assessments` requests with `check_kind` show no 4xx after publish.
4. Signed-in flows: NOT TESTED unless someone with a real login checks (same limit as L1128).
