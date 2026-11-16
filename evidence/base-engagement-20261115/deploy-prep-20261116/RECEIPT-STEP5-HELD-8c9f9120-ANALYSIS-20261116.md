# PREP RECEIPT, Step 5 (HELD, analysis only): does 8c9f9120 keep e5488088's change? NOT DEPLOYED.

Written Mon Nov 16, 2026, about 9:10 AM ET by Avery. Held per Grant until Jim's sender yes comes with his renewal-text OK. Nothing here is gated.

## Shas
- `8c9f9120af23be31ab890f922122979ce5ad2d3f` (tree d597be4037bb112ce759f0c78d105abfbbdc669a), parent `8f9bb023c0bf147c484c5dd20dccdc961c835fc9`, patch `27bce14c6e5ea8ca0b66371df69d55b120af64dddf630febc528a816cc6f904d`. Origin `feat/p1-08-v4-20261115`.
- `e5488088…` (Step 1) and `8c9f9120` are not ancestor-related. Both come from 17c5c9f3 (e5488088 directly; 8c9f9120 via 6d25bb35 → 45ed15d8 → b4e52f09 → 8f9bb023). The comparison below is at deployed-file level.

## Finding: 8c9f9120 is a strict superset. It undoes NOTHING from e5488088. No rebase or fix branch needed, so none was made.
Function-file comparison (staged trees, tests excluded):

**unsubscribe** (5 files): events.ts and rate_limit.ts are identical. The other 3 differ only as follows:
- `_shared/unsub_token.ts`: 8c9f9120 adds `check7` and `check14` to `UnsubScope`/`SCOPES` and to `SCOPE_SETTING` (both → retest), plus a wider comment. `lapsed: "protocol"` is present in both. The sign/verify code (HMAC-SHA256, payload format, secret ≥ 32, UUID check, fail closed) is byte-identical below the map.
- `source/index.ts`: one header comment line differs. The `SCOPE_COLUMN[SCOPE_SETTING[scope]]` write is the same.
- `source/token_path.ts`: one doc-comment line differs. `SCOPE_COLUMN` (retest→retest_reminders, protocol→email_reminders, digest→weekly_digest) is identical.

**lifecycle-emails** (10 files): `handler.ts` (signing call site), `deletion.ts`, `email_footer.ts` and both mobility files are identical to e5488088 (= live). `_shared/unsub_token.ts` is identical to 8c9f9120's unsubscribe copy (the same superset). email.ts, index.ts, logic.ts and score.ts carry P1-06 skip-quick, the P1-08 v3/v4 day 7/day 14 emails and the New York fallback. The lapsed kind is still in `KINDS`, the lapsed link still says "Turn off plan day reminders", and lapsed still maps to email_reminders. The one removed line in email.ts is a code comment ("Stacy P1-16 final words, used exactly. Jim wording yes still required before any send."). The lapsed words are unchanged.

**Sender:** 8c9f9120 changes no From or Reply-To value. The only sender-related diff line is a header comment saying the Base From is left as live. Everything else in the sender lines matches live v2. So if P1-08 is meant to switch the sender to the new ROMRx address, **that change is not in 8c9f9120**. It would be a new commit with its own gate. Flagged for Grant.

## Proof (step5-evidence/)
- `x-compat-e5488088-in-8c9f9120.test.ts` (new, not committed to the repo): 4/4 pass (`x-compat-run.txt`). It checks every e5488088 scope and SCOPE_SETTING entry in 8c9f9120, that lapsed → protocol → email_reminders, that SCOPE_COLUMN is equal, that every e5488088 send kind is still a send kind with a scope, that tokens cross-verify both ways and are byte-equal for every e5488088 scope (lifecycle signer → unsubscribe verifier), and that fail-closed still holds.
- 8c9f9120 own suites (unsubscribe + lifecycle): 85/85 (`8c9f9120-suite.txt`). e5488088 suites: 76/76 (`e5488088-suite.txt`).
- e5488088's own lapsed test files, run against 8c9f9120 with `--no-check`: 8 passed, 8 failed. Every failure comes from the old tests hard-coding the e5488088 world. They assert an exact SCOPES/KINDS list without check7/check14, and their fixture table has no check7/check14 scenario, so iterating 8c9f9120's KINDS crashes with "Cannot read properties of undefined (reading 'now')". That is a test-fixture mismatch, not a behavior change. The lapsed behavior is proven on 8c9f9120 by its own passing test "P1 scope lapsed: the email sends with a signed lapsed token; unsubscribing stops it (and only its toggle's emails)". Its EXPECT after a lapsed opt-out is that only retest, digest, check7 and check14 still send, so **lapsed and protocol are both off**, the same mapping as e5488088.

## Diffs vs live (for the later gate)
- unsubscribe: `diffs-vs-live/8c9f9120-unsubscribe-vs-live-v12.diff` sha256 `1f90255232ecb27c9452df0ba76aefcfd670a105c30c5bb5bed5e5c11d1e1a0f`, 3 files +16/-5 (hunks = gating pack 9c2854aa…).
- lifecycle-emails: `diffs-vs-live/8c9f9120-lifecycle-emails-vs-live-v2.diff` sha256 `eb93299d6e0339efba2fde477be37ce9bd15c2560b8d8baebb5b57c2ae9cf593`, 5 files +135/-23 (hunks = gating pack 6dcbf57f…). This file has a sender address in a comment, so it is kept OFF the evidence branch.
- When Step 5 is gated, its vs-live diff must be re-cut against whatever is live then (e5488088's v13/v3), not v12/v2.

## Order when released
unsubscribe 8c9f9120 first, then lifecycle-emails 8c9f9120. Never 32633db8 (tagged not-for-deploy-20261116/32633db8). The renewal email is not part of this.
