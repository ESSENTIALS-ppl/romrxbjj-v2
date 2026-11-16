# PREP RECEIPT, Step 1a: unsubscribe from e5488088 (standalone lapsed scope). PREP ONLY, NOT DEPLOYED.

Written Mon Nov 16, 2026, about 8:55 AM ET by Avery. Gate needed: Margot sha line, Vera precheck, Sable OK relayed by Grant. Deploy this BEFORE Step 1b.

## Source
- Commit: `e5488088136e3deb2ca513251f9398fbdf1c23ad` (tree c1efb530f53ec7e90ce6bcc399a22f0fc6539ac3), on origin `fix/lapsed-unsub-standalone-20261115`.
- Parent: `17c5c9f37d5c4e6f68d0a84e9d06b4efd1f6a7d1` (= live lifecycle-emails v2, byte-checked today).
- Patch sha (`git show --format= --patch | sha256sum`): `54730c72271ed47284501004e278db66e8ce222a85934a65bb47e5205c3d926d` (unchanged from the gating pack).

## Exact files to deploy (repo `supabase/functions/unsubscribe/<name>`, tests excluded). Staged copy: `staged/e5488088-unsubscribe/`
| Deploy name | sha256 | vs live v12 |
|---|---|---|
| source/index.ts (entrypoint) | f78d43b429e93a9f96c6c28a57a398c76b24b6ae7eeeb4417684438fa026377b | changed |
| source/token_path.ts | bafad0e893f512a0ae6e1c7e7bdab44af6be49d145aa8410c3465b38fcf5671b | changed |
| _shared/unsub_token.ts | 26723e53b38b31fe7686304e5e933dab8910908f8f54f9a2e451dbd06a046424 | changed |
| _shared/rate_limit.ts | 7bae6d34db82052977c138ea16c6e993d5afddc0e378f9b2df387241d27cf302 | identical |
| _shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 | identical |

## Diff vs live v12 (read today 8:44 AM ET)
- File: `diffs-vs-live/e5488088-unsubscribe-vs-live-v12.diff`, sha256 `61d38dcc156fe7a19112a80a2c6e0e14e38fbbc78ee3535fcd64fa4a51ae64ea`. Stat: 3 files changed, 15 insertions(+), 5 deletions(-).
- Hunk content is identical to the gating pack diff `d2dcd112…` (only the path labels differ: `live/` vs `staged/`).
- Hunks (every one):
  1. `_shared/unsub_token.ts @@ -2,8 +2,15 @@`: adds `lapsed` to `UnsubScope` and `SCOPES`; adds `SettingScope` and `SCOPE_SETTING` (retest→retest, protocol→protocol, digest→digest, lapsed→protocol). Sign/verify code unchanged.
  2. `source/index.ts @@ -1,4 +1,5 @@`: one header comment line.
  3. `source/index.ts @@ -6,6 +7,7 @@`: imports `SCOPE_SETTING`.
  4. `source/index.ts @@ -44,7 +46,7 @@`: the token path switches off `SCOPE_COLUMN[SCOPE_SETTING[scope]]` (so lapsed → email_reminders, "plan day reminders"). The other scopes resolve to the same column as v12.
  5. `source/token_path.ts @@ -2,7 +2,7 @@` imports `SettingScope`; `@@ -11,7 +11,8 @@` re-types `SCOPE_COLUMN` by `SettingScope` (same 3 entries) plus one comment line.
- The v8 email path is untouched. No new user-visible words.

## Tests (run today on a `git archive` of e5488088)
- unsubscribe + lifecycle-emails deno suites: 76 passed, 0 failed (`step5-evidence/e5488088-suite.txt`).

## Backup / rollback
- Rollback = live v12 bytes in `live-reads-20261116/unsubscribe-v12/` (5 files, SHA256SUMS), byte-identical to the Nov 15 read. v12 ezbr_sha256 `97503ff467084edfe1780bf5d5a8bebfe06939dbfe429da0cd11e4741f790e86`, verify_jwt false, entrypoint source/index.ts.
- To roll back, redeploy those 5 files with the same entrypoint and verify_jwt false (it becomes v14 with v12 bytes). Roll back lifecycle-emails (1b) FIRST if both go back, so no lapsed links get signed that v12 would reject.

## Deploy command form (when Grant relays the OK)
MCP `deploy_edge_function`: project_id `cqzvqzwwevnflinxgnpp`, name `unsubscribe`, entrypoint_path `source/index.ts`, **verify_jwt false (must be passed explicitly; the tool defaults to true)**, files = the 5 files above, content = exact bytes of `git show e5488088:supabase/functions/unsubscribe/<name>` (tests not uploaded). Expected: v13.

## Post-check plan (read-only)
1. `list_edge_functions`: unsubscribe is v13, ACTIVE, verify_jwt false. Record the new ezbr.
2. `get_edge_function unsubscribe`: 5 files, each sha256 equals the table above.
3. `query_logs` on the edge function logs for unsubscribe since deploy: no boot or runtime errors.
4. No live token POST, no write smoke (no Jim yes for one). Optional only if Vera wants it: one POST with a bad token must return 400 invalid_token and change nothing.
5. `execute_sql`: `select count(*) filter (where email_reminders is false), count(*) filter (where retest_reminders is false), count(*) filter (where weekly_digest is false) from public.notification_preferences;` before and after. Expect no change.
