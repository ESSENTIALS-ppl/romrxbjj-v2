# P1-23 FLIP PLAN: EXPORT_MY_DATA and SHOW_EXPORT_MY_DATA

Written by Avery, Monday Nov 16, 2026, 8:06 PM ET (America/New_York). BUILD ONLY. Nothing was flipped, published, deployed, or set. No secrets or user emails are printed here.

Authority: L1031 covers P1-23 as one of the 31. L1046(b) and L1117 say flipping EXPORT_MY_DATA is a separate step that needs its own sha line. This plan is that prep. It is not itself a gate line and it is not a flip.

## Current live state (read-only, this evening)

- export-my-data still v2, verify_jwt true, ezbr 0de35f2bf74278900d329a35a66fccf29fc7d146eeb22eb808e8a7d27b86e7e1 (list_edge_functions, project cqzvqzwwevnflinxgnpp). Created and updated timestamps are equal, so the function body has not been redeployed since v2. Byte-identical to 42a044d9 (L1075, Vera e144b2fa).
- request-account-deletion still v11, verify_jwt true, ezbr d662e9b8c50da51f4d7b9793d7589dabc08aa883ce61ab8cc6a0cc3e0989a4fc (same list). Delete is already live and is not part of this flip.
- flagOn in live v2 (handler.ts:26, index.ts:7): `v === "on"` on Deno.env.get("EXPORT_MY_DATA"). Any other value, including unset, off, or true, returns 503 {"error":"export_disabled"} and reads nothing (handler.ts:129). The flag check precedes auth (Nov 15 post-checks: POST with the anon key and no user JWT returned 503 export_disabled).
- There is no secrets MCP tool, and the Supabase CLI is not logged in, so the secret value was not read tonight. The function was not invoked tonight. Nov 15 9:22 PM ET post-checks and the P1-17 ship receipt (7:37 PM ET tonight) both recorded the flag off. No flip has been logged since.
- SHOW_EXPORT_MY_DATA is a compile-time constant, not a secret. On live romrx.io sha 29eb4fa66f920450d71c44e6edbad123cfd38596 (deploy 6afba1b9a6f1c859e9d9695c, published 7:37:46 PM ET, locked; receipt P1-17 ship v2): app/src/pages/Settings.tsx line 90 is `const SHOW_EXPORT_MY_DATA = false`. SHOW_DELETION_STATUS at line 92 is also false and stays out of scope.
- dialogLines(exportOn) already omits the intro and the "Want a copy first?" delete-dialog line while the constant is false (yourDataCopy.ts). Unhiding reveals Stacy's export lines that are already in that sha, behind the constant.
- Stacy words file (disk only): /workspace/process/evidence/STACY-P1-23-WORDS-20261115-2056.md sha256 007f8638ce6df6721d3da2e6de218fdff3c0322b7eb25f4e36bd528d4bbb7717. That file is not copied into this pack (address rule).

## What each flag does

| Flag | Where | On means | Off means |
|---|---|---|---|
| EXPORT_MY_DATA | Edge secret on export-my-data | exact string on; the function may read the caller's own rows via the caller's JWT (RLS, no service role) and return a JSON file | 503 export_disabled, no reads |
| SHOW_EXPORT_MY_DATA | Settings.tsx constant, baked into the JS bundle | Your data section shows the intro, Export my data button, and the export line in the delete dialog | those lines are not rendered; delete request remains available |

Flipping the secret alone does not show the button. Unhiding the button while the secret is off would show a control that returns 503. Order matters.

## Sequence (after a new gate line and Vera's precheck PASS, relayed by Grant)

Do not start this sequence in this pack.

1. Re-read live: export-my-data still v2 / ezbr 0de35f2b…, request-account-deletion still v11 / ezbr d662e9b8…, romrx.io published deploy and git sha (currently 6afba1b9 / 29eb4fa6; if live has moved, base the unhide sha on the new live head). Reconfirm SHOW_EXPORT_MY_DATA is still false in that sha. Reconfirm the secret is still not on, using the 503 read-back below, not by printing the secret.
2. Margot issues a gate line that names: this plan pack's SHA256SUMS, the unhide commit sha (one-line Settings.tsx change on the then-live web sha), and the rollback deploy id.
3. Vera prechecks the customer-facing Settings words against Stacy 007f8638, and that SHOW_DELETION_STATUS stays false, QUICK_CHECK_ON stays false, and no send switch is in the sha.
4. Flip EXPORT_MY_DATA to the exact string on. Path: Supabase Dashboard secrets for export-my-data, or `supabase secrets set` once a CLI login exists. No SQL. No function redeploy. The version and ezbr must stay v2 / 0de35f2b….
5. Read-back, no user JWT and no export body: POST /functions/v1/export-my-data with the publishable anon key only must no longer return 503 export_disabled; expect 401 unauthorized (flag now on, auth still required). Do not use a real customer JWT, fixture 076ce453, or account 7c71e421. Do not download an export.
6. Then, and only then, publish the unhide sha: local `netlify build --context production`, stop check, draft `--no-build --dir` (no --prod) titled with the full sha, unlock live, restore the new draft, lock it, cache-busted read-back that /app/ serves the new bundle and the Export my data button is present. Never deploy from main; never use a git-triggered build.
7. Receipt (time ET, secret read-back 401, publish time, deploy id, bundle sha, rollback deploy id). Vera post-check.

## Exact unhide hunk (not committed; see HELD-BACK-FROM-GIT.md)

On whatever sha is live at step 6, currently 29eb4fa6, file app/src/pages/Settings.tsx:

- Hunk: one line at the SHOW_EXPORT_MY_DATA constant (line 90 on 29eb4fa6).
- Change: `const SHOW_EXPORT_MY_DATA = false` to `const SHOW_EXPORT_MY_DATA = true`.
- Do not change SHOW_DELETION_STATUS, other Settings copy, or legal.html in that sha.
- Parent must be the then-live romrx-io-web sha. If live is still 29eb4fa6, parent is 29eb4fa66f920450d71c44e6edbad123cfd38596.

## Out of scope

- SHOW_DELETION_STATUS stays false.
- P1-18 / P1-18b export-my-data coverage (session_feedback and assessment_feedback rows in handler.ts) is unapplied. Live v2 will not include those tables until that item is deployed under its own gate. Flipping now exports the live v2 table list only.
- Privacy Policy wording and the email-fallback line stay as they are on 29eb4fa6 unless a later Stacy/legal sha is gated.
- No test submits on live. No new accounts. No deletes.

## Rollback

See ROLLBACK.md: hide the UI first by restoring the pre-unhide deploy, then set the secret to any value other than on, then confirm 503 export_disabled.
