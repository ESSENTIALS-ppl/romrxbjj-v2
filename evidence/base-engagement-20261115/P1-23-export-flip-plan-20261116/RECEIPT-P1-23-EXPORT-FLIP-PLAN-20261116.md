# RECEIPT: P1-23 EXPORT_MY_DATA / SHOW_EXPORT_MY_DATA flip plan (BUILD ONLY)

Monday Nov 16, 2026, 8:06 PM ET (America/New_York). Avery. BUILD ONLY. Nothing flipped, published, deployed, or set. No secrets or user emails printed. No function was invoked tonight.

## Stopped-run check

No flip-plan folder, no unhide branch, and no evidence commit for this item were on disk or on origin (git ls-remote evidence/receipts-rebuilt-20261115 = a1dce4e4e68c4365a41db169e52b4a41cd307182 at the start of this run). Continued from that baseline. Nov 15 P1-23 apply receipts were left untouched.

## Branch / commit

- No romrx-io-web or romrxbjj-v2 code branch. The unhide sha is not committed (HELD-BACK-FROM-GIT.md).
- Evidence will be committed on evidence/receipts-rebuilt-20261115 (see the evidence sha once pushed).
- Patch sha256 / patch-id --stable: n/a (no code patch in git).
- SQL + rollback sha256: n/a (secret flip, not SQL). Rollback text: ROLLBACK.md.

## Live read-only (project cqzvqzwwevnflinxgnpp, list_edge_functions + 29eb4fa6 source)

- export-my-data v2, verify_jwt true, ezbr 0de35f2bf74278900d329a35a66fccf29fc7d146eeb22eb808e8a7d27b86e7e1.
- request-account-deletion v11, verify_jwt true, ezbr d662e9b8c50da51f4d7b9793d7589dabc08aa883ce61ab8cc6a0cc3e0989a4fc.
- romrx.io live (P1-17 ship receipt, 7:37:46 PM ET): sha 29eb4fa66f920450d71c44e6edbad123cfd38596, deploy 6afba1b9a6f1c859e9d9695c, locked. Settings.tsx:90 `const SHOW_EXPORT_MY_DATA = false`. SHOW_DELETION_STATUS false.
- Flag still enables only on the exact string on. Secret value not read (no secrets tool, CLI not logged in). Last recorded off check: Nov 15 9:22 PM ET post-checks (503 export_disabled with anon key, no user JWT).

## Tests

None. Plan pack only.

## Open questions

1. L1117 still called F1 (keep export lines while hidden vs export-off wording) Stacy's call. Live 29eb4fa6 already hides the intro and the "Want a copy first?" line while the constant is false, and the revealed words are Stacy 007f8638. Does Vera's precheck of those already-shipped strings close F1, or is a fresh Stacy file required before unhide?
2. Who performs the secret set (Dashboard vs CLI login, which still does not exist)? This pack does not create a login.
3. Re-base the unhide sha if romrx.io moves off 29eb4fa6 before the gate.
4. Signed-in export remains NOT TESTED (no real customer JWT; fixture 076ce453 frozen; account 7c71e421 never used). Grant / L1130-style: a signed-in check needs Jim or a beta tester after the flip, not a live test in this pack.
5. P1-18 export coverage is unapplied; a flip now exports the live v2 table list only.
6. SHOW_DELETION_STATUS is intentionally left false; confirm that stays out of the unhide sha.

## Not done

No flip. Needs its own Margot gate line and Vera's PASS, relayed by Grant, before any secret change or publish. Jim should be told the export button will become visible (L1117 / L1046).
