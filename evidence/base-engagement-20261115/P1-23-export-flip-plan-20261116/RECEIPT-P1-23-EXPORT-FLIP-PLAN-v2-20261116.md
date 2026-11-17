# RECEIPT: P1-23 EXPORT_MY_DATA flip plan v2 (BUILD ONLY) — secret step only

Monday Nov 16, 2026, 8:15 PM ET (America/New_York). Avery. BUILD ONLY. Nothing flipped, published, deployed, or set. No secrets or user emails printed. No function was invoked tonight. No CLI sign-in and no `supabase secrets list` were run in this pack.

v1 files in this folder (RECEIPT-P1-23-EXPORT-FLIP-PLAN-20261116.md sha256 ec487703…, SHA256SUMS 01f6972a…, FLIP-PLAN.md, ROLLBACK.md, HELD-BACK-FROM-GIT.md, BUILD-NOTES.md) were not overwritten. This v2 receipt supersedes the v1 plan for sequencing and scope only.

## Why v2 (Margot's pin, relayed by Grant at 8:13 PM ET)

The SHOW_EXPORT_MY_DATA unhide moves into Jules's r3 combined client. Avery's part is the secret step only. The one-line Settings.tsx hunk is out of my scope and is not in this pack; it lives in r3. HELD-BACK-FROM-GIT.md (no unhide patch in git, address rule) still stands for my work.

## Live state used by this plan

P1-18 / P1-18b export coverage is APPLIED (not unapplied, which v1 said):

- export-my-data **v3**, verify_jwt true, ezbr **45dd9300cc48c01ae31d9e76685fbff27de8b96125e57312d97efe08d38030f7**, confirmed read-only via list_edge_functions, project cqzvqzwwevnflinxgnpp, 8:14 PM ET (MATCH to the pin).
- Tables session_feedback and assessment_feedback live 8:07 PM ET via migrations 20261117010651 / 20261117010702 (L1231 / L1234; evidence eb14486). Live schema_migrations head reconfirmed 8:14 PM ET: 20261117010702.
- flagOn is still `v === "on"` only. The secret was not read or changed. Last recorded off check remains Nov 15 9:22 PM ET (503 export_disabled with the publishable anon key and no user JWT), and no flip has been logged since.
- request-account-deletion stays v11 and is not part of this flip.
- romrx.io live at the time of the v1 plan was 29eb4fa6 / deploy 6afba1b9. The pre-r3 deploy id must be re-read at flip time; rollback uses whatever is live immediately before the r3 publish.

## New order (after a gate line and Vera's precheck PASS, relayed by Grant)

Do not start this sequence in this pack.

1. Re-read live: export-my-data still v3 / ezbr 45dd9300… / verify_jwt true; migrations 20261117010651 / 20261117010702 still present; record the then-live romrx.io deploy id as the pre-r3 rollback target.
2. Just before Jules's r3 publish, flip EXPORT_MY_DATA to the exact string on via the SUPABASE_ACCESS_TOKEN CLI sign-in. Run `supabase secrets list` **names only** before and after (no values). Do not redeploy the function; version and ezbr must stay v3 / 45dd9300….
3. Read-back, no user JWT and no export body: POST /functions/v1/export-my-data with the publishable anon key only must no longer return 503 export_disabled; expect 401 unauthorized. Do not use a real customer JWT, fixture 076ce453, or account 7c71e421. Do not download an export.
4. Then Jules publishes r3 (the unhide is in that client). Avery does not publish the unhide sha.
5. Receipt (time ET, names-only secrets list before and after, 401 read-back, r3 publish time and deploy id, pre-r3 rollback deploy id). Vera post-check.

## Rollback

1. Restore the pre-r3 Netlify deploy first (unlock, restoreSiteDeploy of the pre-r3 id, lock, cache-busted read-back). Credits: restore costs none.
2. Then set EXPORT_MY_DATA=off (any value other than the exact string on also works; the pin is off) via the same CLI path.
3. Confirm 503 {"error":"export_disabled"} with the publishable anon key and no user JWT.

Do not touch LIFECYCLE_EMAILS_SEND, LIFECYCLE_AUDIENCE, ROMBOT_CHECKIN_SEND, QUICK_CHECK_ON, or RENEWAL_BASE_SEND. Do not redeploy export-my-data as part of this rollback. SHOW_DELETION_STATUS stays with r3 / Jules if it is in that client; it is not part of my secret step.

## Out of scope for Avery

- The SHOW_EXPORT_MY_DATA unhide hunk and r3 publish (Jules).
- SHOW_DELETION_STATUS.
- Privacy Policy wording.
- No test submits on live. No new accounts. No deletes.

## Open questions

1. Signed-in export remains NOT TESTED (no real customer JWT). After the flip, a signed-in check needs Jim or a beta tester, not a live test in this pack.
2. Re-record the pre-r3 deploy id at flip time if romrx.io has moved off 6afba1b9.
3. The r3 sha itself is Jules's; this receipt does not pin it.

## Not done

No flip. Needs its own Margot gate line and Vera's PASS, relayed by Grant, before the secret is set. Jim should be told the export path will become available when r3 publishes.
