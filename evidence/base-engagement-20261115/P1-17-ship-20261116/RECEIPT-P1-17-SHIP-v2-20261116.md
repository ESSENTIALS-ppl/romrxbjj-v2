# v2 note: same receipt as RECEIPT-P1-17-SHIP-20261116.md (sha256 4efe2c35b59550f526cfc0c9683d9a22d5dc7ceae93fb3ee7ec9add355de36f8), with one wording change only. v1 named an example.com placeholder address in the held-back list, which would break the git address rule, so v1 stays on disk only. Nothing else changed.

# RECEIPT: P1-17 ship. rombot-checkin 11803fee (Supabase) + romrx.io client 29eb4fa6 (Netlify), Mon Nov 16 2026

Written 7:39 PM ET by Avery's executor. Supabase project `cqzvqzwwevnflinxgnpp`; Netlify site `d9bc6384-fc26-44fb-a51d-32aa8f28dd7b` (romrx.io). Never from main, no git-triggered build, no `--prod`. No env or secret change, no cron change, no function invoked, no test submit, sign-up or send. QUICK_CHECK_ON stays false. Nothing hashed was overwritten; every file here is new. /workspace/SHA256SUMS not touched.

## Gate
- Pin **L1213** (romrx-io-web 29eb4fa6, tag frozen-20261116/P1-17-combined-v5-on-adc6249 = tag object 567a3f15, tree d3e3798b2b60, diff vs adc6249b 30472209; server rombot-checkin 11803fee). **L1219** logged the seed-dump receipt v3 (acdec9d7). Coverage L1031 ("Do all of them") and L930 (privacy text must match code). Lines read from the ledger before any apply.
- Vera precheck plus seed-dump addendum ce57949a passed; Sable's ship OK relayed by Grant (GO).
- ORDER: the P1-08 deploy receipt `P1-08-qc-guard-20261116/RECEIPT-P1-08-QC-GUARD-DEPLOY-20261116.md` already existed at the first check (7:32:42 PM ET), so no wait was needed. lifecycle-emails and unsubscribe were not touched (still v4 / v14 in the post list).
- Date rule: shipped before 11:59 PM ET Nov 16, so "Last updated November 16, 2026" needs no rebuild.

## Step 1: rombot-checkin (Supabase MCP only)
Source worktree `/workspace/p1-17-wt`: `git rev-parse HEAD` = `11803fee4157f23435d0b97e6aaa08eddb020565`, `git status --porcelain` empty (checked 7:33 PM ET).

verify_jwt: **false**. Basis: the 11803fee source header (`supabase/functions/rombot-checkin/source/index.ts` line 1: "verify_jwt false (cron-only)") and RECEIPT-P1-17-DAY3-20261116.md line 27 ("cron-only, verify_jwt false when deployed"). `supabase/config.toml` at 11803fee has no rombot-checkin entry. The handler does its own check (`cronOk`, 403 otherwise), the same way lifecycle-emails does (verify_jwt false).

| Step | Time (ET) | Result |
|---|---|---|
| Pre-check | 7:33:24 PM (cron), 7:33 PM (get), 7:34:02 PM (list) | cron 13 jobs, jobids 1-13, md5 `a96d2036959f1dc2697d23e7665cb490` (same as the P1-08 receipt), no job mentions rombot. `get_edge_function rombot-checkin` = NotFoundException. 39 functions, none named rombot-checkin. PASS |
| Deploy | **7:35:14 PM** (function created_at/updated_at) | one `deploy_edge_function` call, entrypoint `source/index.ts`, verify_jwt false, 8 files, no import map or deno.json (none at 11803fee). Not retried. |
| Read-back | 7:35 PM, again 7:38:30 PM | v1 ACTIVE, verify_jwt false, ezbr below, 8/8 files MATCH, same file set. PASS |
| Post-check | 7:35:42 PM | 40 functions: the only change is rombot-checkin added. All 39 others are unchanged (version, ezbr, verify_jwt, updated_at). cron unchanged. PASS |

**Prior live version: NOT DEPLOYED** (see `rollback/live-rombot-checkin-NOT-DEPLOYED.md`). There are no rollback bytes to save.

**Deployed:** rombot-checkin **v1**, id `ca5b47bf-a761-4c18-ae38-958c055fd190`, ezbr_sha256 **`fbad002179ca31898451e69b0b9a34c9add02a0ed0d09de83d7659553befdd19`**, verify_jwt **false**, status ACTIVE.

Bytes came from `git show 11803fee:<path>` into `deploy/11803fee-bytes/` (test/ excluded). That covers the function folder and the two shared files it imports from its own `_shared/`. 4 `$file:` refs, the other 4 inline, the same method as P1-08 / L1133.

| file | bytes | git blob @11803fee | sha256 (live = git) | how passed | result |
|---|---|---|---|---|---|
| source/index.ts | 9188 | 93fe7841 | `58b9a42531d4d69e123be5fa59b0b785f80aae93702ddd923964d61f399efa4b` | file ref | MATCH |
| source/handler.ts | 6555 | 542bd790 | `b3546c05272882040108020aff6401fc4127ee08118fdd85cd8a12809f5eff39` | file ref | MATCH |
| source/logic.ts | 18380 | 7e28be92 | `cd0a8d915a78664801e4b8c51e31c78a8442f333ea2834daea48870408830a0f` | file ref | MATCH |
| source/copy.ts | 7488 | c6d467c0 | `58e445128654cf8a9c87cce179aed887ffe87ea43579848700ee1267809b110f` | file ref | MATCH |
| source/email.ts | 3954 | 713308e9 | `a4bfb5df0786f5c37850e97208404005724e9b65de4b7ba5e7b289f5d54fee00` | inline | MATCH |
| source/deletion.ts | 1269 | e0dbac19 | `edbcee01bb5b1e62d88159b9c593e61379da488582cc95741cd9d77f26bc907b` | inline | MATCH |
| _shared/email_footer.ts | 1216 | 6e509f6c | `0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b` | inline | MATCH |
| _shared/unsub_token.ts | 3443 | 75d35b87 | `26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424` | inline | MATCH |

Read-back meta (no file bodies): `deploy/readback-rombot-checkin-v1-meta.json` and `deploy/readback-rombot-checkin-v1-final-meta.json`. The read-back bytes are in `deploy/readback-rombot-checkin-v1*/`. The checker is `deploy/readback.py`. Function lists are in `deploy/pre-list-edge-functions.json` and `deploy/post-list-edge-functions.json`; pre/post checks are in `deploy/pre-check-20261116.json` and `deploy/post-check-20261116.json`.

### ROMBOT_CHECKIN_SEND
**Unset as far as this work goes: not set, read or changed.** No tool here can list secrets by name. The Supabase MCP has no secrets tool, and the `supabase` CLI is not logged in (AccessTokenRequiredError; no login was attempted). This matches the P1-08 receipt, which recorded QUICK_CHECK_ON the same way. The cron-response method used for LIFECYCLE_EMAILS_SEND does not apply here: rombot-checkin has no cron job and was not invoked. With the flag unset, the handler runs dry (`handler.ts` line 57: `dry = !flagOn(env ROMBOT_CHECKIN_SEND)`), and it 403s any non-cron caller. **Gap:** a by-name check needs `supabase secrets list` (names and digests only) once a CLI login exists.

## Step 2: romrx.io client 29eb4fa6 (same method as the TZ publish)
- Detached worktree **`/workspace/p1-17-publish-29eb4fa6`** from `/workspace/p1-wt` (origin ESSENTIALS-ppl/romrx-io-web), created 7:36:02 PM ET. `git fetch origin 29eb4fa6…` with no prune. The tag `frozen-20261116/P1-17-combined-v5-on-adc6249` (object `567a3f159605e9d418c453baf30c63f53ee2a3b9`) peels to `29eb4fa66f920450d71c44e6edbad123cfd38596`. Parent `adc6249b7a778b2ea5b94afe8d380f1b3482b7b6`, tree `d3e3798b2b607636b275a89e2fa8a67488b74345`. `git diff adc6249b 29eb4fa6 | sha256sum` = `30472209dd5e8003bf3da81c91275c35bd75bb226e1147fc9fb598f6677deca3`: 8 files, +544 / -11, matching L1213. origin/main `872c0ad7` was not checked out or deployed.
- HEAD 29eb4fa6 with porcelain 0 right before the build (7:36:09 PM) and HEAD 29eb4fa6 right before the draft (7:37:09 PM). `app/src/lib/quickCheck.ts:22` has `QUICK_CHECK_ON = false`.
- **Build:** `NETLIFY_SITE_ID=d9bc6384-… netlify build --context production`, 7:36:09–7:36:28 PM ET, exit 0, @netlify/build 37.1.0, Netlify Build 16.2s. It ran the netlify.toml command: stamp (`v=29eb4fa66f92`, 99 refs / 38 files), npm install, **npm test: 84 files passed, 1281 passed | 7 skipped (1288)** (matches Jules f7c7c78c), then **`tsc -b` && vite build passed** (1953 modules). The log is `client/build.official.log`. The "window.scrollTo not implemented" line is jsdom noise inside a passing test. Expected dirt only: 38 stamped files, `app/index.html` removed, `.netlify/`. No hosted build id.
- Local dist: `index-CDYOl0V-.js` `0f677c27175dd07ecfdfc7c4f5a83f38c0cdabf1d2ac00e6a302cb07d7bb5c36` (801116 B); `index-BKYIn_au.css` `c340d8f25f6795e34080d1df08748b7b586663076bdced4073b5bcfed56eea4e`; `app/dist/index.html` `961380bbe6f9e6b5cd3203b39d7779e1cf428f7bd041ceb1631f0d84aab4dfff` (references `/app/assets/index-CDYOl0V-.js`). Built `legal.html` `f9131de8b0ad952ddafc8a3a36153f8bbf8669cfd32c141e6ee39e04fdfec533`. The git blob is `c10741d0…`; the only difference is the stamp's `?v=29eb4fa66f92` on 2 asset lines.
- **Stop check (7:36:48–7:36:54 PM ET, read only): PASS.** published_deploy `6afb9d261d2f405269bcab7a`, state ready, locked true. stop_builds true, skip_prs true, not disabled. listSiteDeploys returned 100 (ready 92, error 8), 0 non-terminal; the only locked deploy was 6afb9d26. listSiteBuilds 100, unfinished 0. The live /app/ served `index-XXlJp1mg.js` `5e51c67f…`, the TZ receipt value, so no drift. A second getSite at 7:37:41 PM just before unlock still showed 6afb9d26 locked, with stop_builds true.
- **Draft (no --prod):** `app/node_modules` was moved out first. `netlify deploy --no-build --dir . --site d9bc6384-… --message "29eb4fa66f920450d71c44e6edbad123cfd38596 P1-17 combined v5 ROMBot check-in + privacy v5 (manual CLI, not from main)" --json` ran 7:37:09–7:37:17 PM ET, exit 0. Draft **`6afba1b9a6f1c859e9d9695c`**, created **7:37:13 PM ET**, state ready, published_at null, deploy_source cli, build_id none, commit_ref null. The `branch: main` field is the CLI default, as in TZ/L1135; the checkout was 29eb4fa6. Draft URL https://6afba1b9a6f1c859e9d9695c--incomparable-pastelito-849104.netlify.app
- At 7:37:26 PM the draft's `/app/` HTML, JS, CSS and `legal.html` were all HTTP 200 and **byte-identical to the build** (cmp).
- **Publish:** unlockDeploy 6afb9d26 at 7:37:43 PM (locked false). restoreSiteDeploy 6afba1b9 at 7:37:45 PM, **published_at 2026-11-17T00:37:46.934Z = 7:37:46 PM ET**. lockDeploy 6afba1b9 at 7:37:47 PM (locked true, updated 7:37:49 PM). getSite at 7:37:49 PM: published `6afba1b9a6f1c859e9d9695c`, locked true, stop_builds true, url https://romrx.io.

## Step 3: live read-back (7:37:58 PM ET, cache-busted, read only)
| item | served sha256 | build sha256 | result |
|---|---|---|---|
| /app/ index.html (references `/app/assets/index-CDYOl0V-.js`) | `961380bbe6f9e6b5cd3203b39d7779e1cf428f7bd041ceb1631f0d84aab4dfff` | same | MATCH (cmp) |
| /app/assets/index-CDYOl0V-.js | `0f677c27175dd07ecfdfc7c4f5a83f38c0cdabf1d2ac00e6a302cb07d7bb5c36` | same | MATCH (cmp) |
| /app/assets/index-BKYIn_au.css | `c340d8f25f6795e34080d1df08748b7b586663076bdced4073b5bcfed56eea4e` | same | MATCH (cmp) |
| /legal.html | `f9131de8b0ad952ddafc8a3a36153f8bbf8669cfd32c141e6ee39e04fdfec533` | same | MATCH (cmp) |

legal.html against Stacy v5 (`/workspace/process/evidence/STACY-P1-17-PRIVACY-LINE-v5-20261116-1922.md`, sha256 `36b7433849212001133e21217e97dc97cda8f71fb13dc4e576ca7aaa583edd29`), counted on the tag-stripped, whitespace-normalized text:
- **Edit 1 (v5 After), 1 hit, verbatim:** "About 3 days after your first assessment, ROMBot may leave you one check-in note in the app. Depending on how many sessions you have logged, the note uses some of these details from your own account: your first name, how many sessions you have logged since your assessment, today's focus area from your plan and your next check date. We keep the note with your ROMBot chats, linked to the assessment it is about. If you turned on reminders and have not logged a session, taken an assessment or messaged ROMBot since the note, we may also send you one email about it on a plan day, at your reminder time. That email goes to your email address and uses some of the same details." (copy in `client/stacy-v5-edit1-after.txt`)
- **Edit 2 (v4 After, unchanged in v5), 1 hit:** "(such as your first and last name, your joint measurements in degrees, your overall ROM score, readiness levels, focus areas, and plan)". The old live list now has 0 hits.
- **Privacy date "Last updated November 16, 2026": 1 hit** (line 92). **Terms "Last updated October 28, 2026": unchanged** (line 29). Em dashes: 0.
- Other paths, all HTTP 200: `/`, `/app/`, `/app/assessment`, `/app/dashboard/my-protocol`, `/faq.html`. Served JS: QUICK_CHECK_ON 0 hits, America/New_York 3 (the TZ fallbacks are still there), rombot-checkin strings present.
- **Locked: true. stop_builds: true.** Rollback target 6afb9d26 is still listed: state ready, locked false (as in TZ), published_at still 7:18:18 PM ET, so it can be restored.
- **Credits:** hosted build_id none. CLI local build plus restore = **0 build minutes, 0 build credits.** No git-triggered build.
- **Function:** see Step 1. Final read-back at 7:38:30 PM ET: v1, ezbr `fbad0021…`, verify_jwt false, 8/8 MATCH.
- **ROMBOT_CHECKIN_SEND:** see Step 1. It was not set by this work, and no tool here can list it by name.
- **Cron:** 7:38:22 PM ET, 13 jobs, jobids 1-13, md5 `a96d2036959f1dc2697d23e7665cb490`. **Unchanged** from pre (7:33:24 PM) and post-deploy (7:35:42 PM); no rombot job. The unapplied migration `20261116160000_rombot_checkin_cron.sql` was NOT applied.

## Rollback (not needed, not run)
- **Client:** (1) `netlify api unlockDeploy --data '{"deploy_id":"6afba1b9a6f1c859e9d9695c"}'`. (2) `netlify api restoreSiteDeploy --data '{"site_id":"d9bc6384-fc26-44fb-a51d-32aa8f28dd7b","deploy_id":"6afb9d261d2f405269bcab7a"}'`. (3) `netlify api lockDeploy --data '{"deploy_id":"6afb9d261d2f405269bcab7a"}'`. (4) getSite: published 6afb9d26, locked, stop_builds true. (5) /app/ serves `index-XXlJp1mg.js` `5e51c67f28abcc7039248fd6fd8f3c89081fd455ea3371858efec7fd647f5c17`. Restoring costs no build credits. Note that 6afb9d26 has the old privacy text.
- **Function:** there was **no prior version** (not deployed before 7:35:14 PM ET), so there is nothing older to redeploy. Removing the function is a delete and needs Jim's own yes. It is inert while it has no cron, ROMBOT_CHECKIN_SEND is unset (dry), and `cronOk` 403s other callers. A content rollback would mean redeploying corrected bytes as v2 under a new gate.

## Evidence held back from git (address rule)
These files contain addresses other than hello@romrx.io, reid@romrx.io or user@example.com (privacy@, support@, a "you@" placeholder at example.com), or are dist JS. They stay on disk only and are listed in SHA256SUMS-SHIP:
`client/dist/index-CDYOl0V-.js`, `client/dist/legal.html`, `client/draft-http/app_assets_index-CDYOl0V-.js`, `client/draft-http/legal.html`, `client/live-readback/live.js`, `client/live-readback/legal.html`, `client/live-pre/legal.html`.

## Not done
No env, secret, flag, cron or Netlify setting change. No function invoked. No test submit, sign-up or send. No deletes. QUICK_CHECK_ON false, EXPORT_MY_DATA off, LIFECYCLE_EMAILS_SEND not touched.
