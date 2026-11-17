# RECEIPT: P1-12 calendar-ics r2 DEPLOYED (by name only) as version 1

Written Monday Nov 16, 2026, ~9:14 PM ET (America/New_York) by Avery. Project cqzvqzwwevnflinxgnpp. One function deployed: `calendar-ics`. No other function, migration, secret, cron job or data changed. No secrets, tokens or user emails in this receipt or its logs.

## Gate
- Grant relay 9:06 PM ET: P1-12 calendar-ics r2 VERIFIED by Vera (f438a972); Sable's OK applies. DEPLOY BY NAME ONLY from f39839a0 (pin L1308), never the whole functions folder (base 47aad435 is behind live).
- Jim: 9:02 PM ET tap on card t2043s6428 ("...customer email switches, calendar and push functions (push in test mode)"). `--yes` used for this exact deploy only on that tap.

## Source
- Commit **f39839a0926ec8f84adcf554198945ca8fee3add** (`feat/p1-12-calendar-ics-on-47aad435-20261116`; ls-remote = f39839a0). Not c1901e45.
- Clean temp worktree `/tmp/wt-p1-12-deploy-f39839a0`, detached at f39839a0, `git status` clean.
- Files @f39839a0 sha256: index.ts `f43c7bce…2957685`, handler.ts `ed65a1aa…1d37569`, ics.ts `d9d2a684…5df563` (ics.test.ts `38c7c8ad…` not uploaded, not imported).

## verify_jwt
- Live before: calendar-ics **absent** (never deployed), so no live setting existed.
- `supabase/config.toml` @f39839a0 has no `[functions.*]` blocks, so the CLI default **verify_jwt = true** applies. This matches the r2 code/receipt ("JWT required", 401 without auth). No `--no-verify-jwt` flag passed.
- Live after: **verify_jwt true**.

## Before list (read-only, ~9:08 PM ET)
- Full list via `supabase functions list -o json` (CLI, read-only): **40 functions**, calendar-ics absent. `logs-deploy/functions-before-full.tsv` (slug, version, verify_jwt, status, updated_at, ezbr_sha256).
- MCP `list_edge_functions` returned only 14 of the 40 (truncated); kept as `logs-deploy/mcp-list_edge_functions-before-14rows.tsv`. Its 14 rows equal the CLI rows on version, verify_jwt, updated_at and ezbr_sha256. The CLI list is the list of record.

## Deploy
- `export SUPABASE_ACCESS_TOKEN="$(< /home/box/.supabase/access-token)"` (token romrx-cli-20261116, never printed), then from the worktree:
  `supabase functions deploy calendar-ics --project-ref cqzvqzwwevnflinxgnpp --yes` (CLI v3.0.0).
- Start **9:09:37 PM ET**, end **9:09:41 PM ET**, rc 0. CLI: "Deploy 1 Function", uploaded only calendar-ics/index.ts, handler.ts, ics.ts; "functions":["calendar-ics"]. Log `logs-deploy/cli-deploy.log`.

## After list and diff (read-only, ~9:10 PM ET)
- **41 functions.** `diff functions-before-full.tsv functions-after-full.tsv` (`logs-deploy/functions-diff.txt`) has exactly one line:
  `> calendar-ics  1  True  ACTIVE  1794881379481  2026-11-16 09:09:39 PM ET  9500e1e16c7b13952c511c3e443e54a5248784e691ca76de74a2907a9efa906b`
- All other 40 functions are identical on **ezbr_sha256 and updated_at** (also version, verify_jwt, status). No version-only bumps in this window. Only calendar-ics changed.
- calendar-ics live: version **1**, ezbr_sha256 **9500e1e16c7b13952c511c3e443e54a5248784e691ca76de74a2907a9efa906b**, updated 9:09:39 PM ET, verify_jwt true, ACTIVE.

## Deployed bytes vs pin (MCP get_edge_function, read-only)
All 3 deployed files MATCH f39839a0 byte-for-byte (`logs-deploy/deployed-vs-f39839a0.txt`):
- calendar-ics/index.ts `f43c7bce371fba328c02b7b45fdd923762213bea7823d8ed04dde29cd2957685` MATCH
- calendar-ics/handler.ts `ed65a1aa5b1cf40a4a02432a314c6c4e5986c48b35f39cb1ac16e8ce51d37569` MATCH
- calendar-ics/ics.ts `d9d2a684fc478d3819504fd681f5c2318822b563e7f545165ae4c21d0a5df563` MATCH

## Smoke (read-only, no auth, no data, 9:09:58 PM ET)
- `GET /functions/v1/calendar-ics` with Origin https://romrx.io, no Authorization → **401**.
- `OPTIONS` same → **204**.
- No user-token call made (no test account used; 7c71e421 not touched). Vera may run the authenticated .ics check.

## Other checks
- cron.job 14, md5 0beb8bc4976fc129be2d26c88096c252, job 1 md5 caab15b0 unchanged (9:10:14 PM ET). Migration head 20261117020743 (P1-29b, applied separately at 9:07:43 PM ET).

## Rollback
- No previous calendar-ics version exists (first deploy; nothing calls it yet, as the client button 58ef5c6a is not shipped). Rollback = remove the function (`supabase functions delete calendar-ics`). That is a delete, so it needs Jim's yes first. Not done.

## Not done
- Vera post-check. Client button (58ef5c6a) not shipped. No other deploys, secrets or cron edits.
