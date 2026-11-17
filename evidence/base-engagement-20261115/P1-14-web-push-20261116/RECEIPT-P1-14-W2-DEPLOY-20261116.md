# RECEIPT: P1-14 W2 DEPLOYED (two by-name deploys, push stays dry run), Supabase cqzvqzwwevnflinxgnpp

Written 10:13 PM ET Mon Nov 16 2026 by Avery's executor. Times ET (UTC-5). No token, secret value, VAPID value, endpoint or user address in this file.

## Gate
- Jim's first-hand 9:02 PM ET card (L1319): "Yes, Avery can make tonight's Supabase changes for the 31 Base items: ... calendar and push functions (push in test mode)". WEB_PUSH_SEND stayed absent, so this stays test mode.
- W2 pinned at L1416. Build note `BUILD-NOTE-P1-14-W2-DEVICE-MOVE-20261116-v1.md`, sha256 `fe1108569eaf5e3afa10f273193521d37b1ab42fb2bfc120839cfa75170c2a1a` (MATCH). Patch sha256 `0fae6c2b4c3e0ce6e08d0680049fc0ecac8aa3c31b51520b5267ab3a73be29ef`.
- Vera precheck `/workspace/vera-verdicts/vera-dee41530-P1-14-W2-device-move-precheck-20261116.md`, sha256 `10a5b11a35ac478ace0a0d02e493f7d8c0df4b44028b330cd4fbe82d4084164e`: VERIFIED (0 FAIL, 3 WARN).
- P1-27 post-check VERIFIED, sha256 `13e6395b5bbcf4180e992113f54d6dae7fe110bb3a2ec6b2913c01a992ada186` (`vera-025845-P1-27-apply-postcheck-20261116.md`).
- Sable released W2; Grant relayed GO at 10:08 PM ET.

## Source
- romrxbjj-v2 commit `dee4153014df31a0a9d785ec54af3e3a747f72ce` (branch `fix/p1-14-w2-device-move-backup-20261116`, parent `6bde1ac8180d1a1bb78961b617312d9eeaa59a5e`, function-only). Clean temp worktree `/workspace/wt-p1-14-w2-deploy-dee41530`, detached at that commit. HEAD stayed `dee41530` throughout. No tracked changes; the only untracked path was the CLI's own `supabase/.temp/` (`cli-latest`). No config.toml edit was needed or made (neither push function has a `[functions]` entry, same as r3 / Vera W3).
- Local bytes deployed from that worktree:
  - send-push-notification/index.ts `e76666668e3757f556777f10399d0077a1f751bc9bffebe7f0cbd22d31e06bac`
  - send-push-notification/handler.ts `9d0a6f710cbb39ac20cf1c0d562db3b95762783093b201c2a0b80e5b2961b943`
  - save-push-subscription/index.ts `73f8d748edd5f92287bba2458bcfee1a2d4a77d3666ae748ee3904ca9b3b81e6`
  - save-push-subscription/handler.ts `4a3e98a3b7ad4dc47a42750171e5cf7bda1aa88f3654860691c61890f282f196`
- CLI flag note: `--use-api` is required because Docker is not running on the box (server-side bundling). `--project-ref` is accepted and was used exactly as specified; CLI v3.0.0 prints a deprecation warning and recommends `--remote=<ref>` (same warning as the r3 deploy). `functions list` / `secrets list` used `--remote=cqzvqzwwevnflinxgnpp` because those commands have no `--project-ref` flag.

## Secrets (names only)
- 10:11:48 PM ET before (`w2-deploy/secret-names-pre-deploy.txt`): 31 names. **WEB_PUSH_SEND absent**. No name containing PUSH or VAPID.
- 10:12:36 PM ET after (`w2-deploy/secret-names-post-deploy.txt`): byte-identical 31 names, WEB_PUSH_SEND still absent. Nothing set.

## (a) send-push-notification, verify_jwt false (explicit `--no-verify-jwt`)
- 10:11:50 PM ET: `supabase functions list --remote=cqzvqzwwevnflinxgnpp -o json` -> `w2-deploy/functions-a-before.json` (41). Before identity MATCH: ezbr `7155675479610b28a30c8c99197ec1dbafdc4cde62f51b218166e22a60f92a80`, verify_jwt false, updated Nov 16 2026 9:34:26 PM ET (same as r3 post-deploy). Version listed **26** (r3 post-deploy listed 25; later secrets sets tonight bumped the version number without changing ezbr, updated_at, or verify_jwt).
- 10:12:08 to 10:12:11 PM ET: `supabase functions deploy send-push-notification --project-ref cqzvqzwwevnflinxgnpp --no-verify-jwt --use-api --yes` -> exit 0. Assets: index.ts, handler.ts.
- 10:12:12 PM ET: list -> `w2-deploy/functions-a-after.json` (41).
- Result (`w2-deploy/cmp-a.txt`): 40 UNCHANGED (ezbr, updated_at, verify_jwt, version). One CHANGED:

| | version | ezbr | updated_at | verify_jwt |
|---|---|---|---|---|
| before | 26 | `7155675479610b28a30c8c99197ec1dbafdc4cde62f51b218166e22a60f92a80` | Nov 16 2026 9:34:26 PM ET | false |
| after | **27** | `96dfc872547612f7913e6e012cafdbe8e35b8da6753046eaa57d6ec374aa3550` | **Nov 16 2026 10:12:09 PM ET** | **false** |

## (b) save-push-subscription, verify_jwt true (no `--no-verify-jwt`)
- 10:12:31 PM ET: `w2-deploy/functions-b-before.json` is byte-identical to a-after. Before identity MATCH: ezbr `221030aaad23b14533a40fe78de88fc64ccbbb6d012501a099c01e075ad63cf0`, verify_jwt true, updated Nov 16 2026 9:34:46 PM ET. Version listed **25** (r3 post-deploy listed 24; same secrets-set version bump as above).
- 10:12:31 to 10:12:33 PM ET: `supabase functions deploy save-push-subscription --project-ref cqzvqzwwevnflinxgnpp --use-api --yes` -> exit 0. Assets: index.ts, handler.ts.
- 10:12:34 PM ET: list -> `w2-deploy/functions-b-after.json` (41).
- Result (`w2-deploy/cmp-b.txt`): 40 UNCHANGED vs mid-list. One CHANGED:

| | version | ezbr | updated_at | verify_jwt |
|---|---|---|---|---|
| before | 25 | `221030aaad23b14533a40fe78de88fc64ccbbb6d012501a099c01e075ad63cf0` | Nov 16 2026 9:34:46 PM ET | true |
| after | **26** | `ba6bd6493b6a2e2a3941abc72456adeaa809739b6f30083344b5da56e93a7032` | **Nov 16 2026 10:12:32 PM ET** | **true** |

## 41-count proof (overall)
`w2-deploy/cmp-overall.txt`: 41 before, 41 after, added [], removed []. Exactly 2 CHANGED (the two functions above). 39 UNCHANGED including version. **verify_jwt unchanged for all 41.**

## Endpoint-filter count check (Vera required)
Read-only MCP `execute_sql` on project `cqzvqzwwevnflinxgnpp`. Exact SQL: `w2-deploy/endpoint-filter-query.sql`. Count-only; no endpoint, email, or user_id values were returned. Columns confirmed first via `describe_tables` (`notification_preferences.push_subscription jsonb`, `push_subscriptions.user_id` / `endpoint` / `disabled_at`).

Vera's W2 precheck (10a5b11a) asked for: W1 = backups whose endpoint has a `push_subscriptions` row owned by another user; W2(a) = endpoints in more than one backup; W2(b) = backups whose endpoint has no `push_subscriptions` row and whose user has no active row. Also re-ran her 10:00 PM ET baseline counts.

| check | before 10:11:27 PM ET | after 10:12:54 PM ET |
|---|---|---|
| notification_preferences rows | 48 | 48 |
| backups non-null | 0 | 0 |
| backups with an endpoint | 0 | 0 |
| (a) endpoints in more than one backup | 0 | 0 |
| W1 backups whose endpoint is owned by another user | 0 | 0 |
| backups with no table row | 0 | 0 |
| (b) orphan-endpoint backup and user has no active row | 0 | 0 |
| current fallback candidates | 0 | 0 |
| push_subscriptions rows (disabled) | 0 (0) | 0 (0) |

Before and after are identical. Live population is still 0, same as Vera's 10:00 PM ET baseline. No cleanup is needed from these counts.

## Not done / held
- Cron migration `20261117020200_p1_14_send_push_notification_cron` NOT applied (stays held for WEB_PUSH_SEND). After SELECT 10:12:54 PM ET: cron 14 jobs, job 1 command md5 `caab15b0a3b771bccfd127f7c3db4df2`, 0 send-push cron jobs, migration `20261117020200` not in `supabase_migrations.schema_migrations`.
- WEB_PUSH_SEND not set. No VAPID set. No invoke, no push sent, no row writes, no secrets set, no cron change, no SQL writes.
- Live source download / byte-match was not run (not required for this job).

## Rollback (recorded, NOT done)
Redeploy the prior r3 artifacts by name from commit `6bde1ac8180d1a1bb78961b617312d9eeaa59a5e` (parent of dee41530; the r3 deploy source) so the ezbrs return to the pre-W2 identities. Not pre-approved; do not run without a go.
- send-push-notification: `supabase functions deploy send-push-notification --project-ref cqzvqzwwevnflinxgnpp --no-verify-jwt --use-api --yes` from `6bde1ac8`. Expected ezbr `7155675479610b28a30c8c99197ec1dbafdc4cde62f51b218166e22a60f92a80`, verify_jwt false.
- save-push-subscription: `supabase functions deploy save-push-subscription --project-ref cqzvqzwwevnflinxgnpp --use-api --yes` from `6bde1ac8`. Expected ezbr `221030aaad23b14533a40fe78de88fc64ccbbb6d012501a099c01e075ad63cf0`, verify_jwt true.

## Deviations
- `--project-ref` deprecation warning on both deploys (CLI v3.0.0; same as r3). Commands otherwise as specified; exit 0.
- Untracked `supabase/.temp/cli-latest` in the worktree (CLI's own file). No source or config.toml edit.
- Before-deploy version numbers were 26 / 25, not the r3 post-deploy 25 / 24, because later secrets sets tonight bumped versions without changing ezbr, updated_at, or verify_jwt. The required before-identities (ezbr 71556754… / 221030aa… and verify_jwt false / true) matched, so the deploy proceeded.
- No other deviation. 41 functions throughout; only these 2 changed; verify_jwt unchanged for all; WEB_PUSH_SEND absent; cron 20261117020200 still held; job 1 untouched.
