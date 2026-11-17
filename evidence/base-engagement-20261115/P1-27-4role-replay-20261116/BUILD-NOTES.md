# P1-27 4-role replay BUILD-NOTES — 2026-11-16, 8:15 PM ET (America/New_York)

BUILD ONLY. No apply, deploy, flip or schedule. No new romrxbjj-v2 commit. v1–v3 hashed files were not overwritten.

## Stopped-run check
No 20261116 4-role folder, receipt, or origin branch existed from the earlier rate-limited run. Continued from the Nov 15 v3 pack and from origin `fix/p1-27-rls-perf-cleanup-20261116040100` at 30ba24c4679398bf0d72a3d6e391fd7b315535e4 (confirmed with `git ls-remote`).

## Code item (unchanged)
- Branch: `fix/p1-27-rls-perf-cleanup-20261116040100`
- Commit: `30ba24c4679398bf0d72a3d6e391fd7b315535e4`
- Parent: `543cabf94d8e67c702bdeaa6de66ce020988b1be`
- Source body: `78b600fc5bae2ca9e9805ec94366ec5a798e8e85` (migration 20261116013100), renumbered 20261116040100, body byte-identical.
- Patch sha256 (`git show --format= --patch`): `fb5922482be58fc61447c4db58d49684941989debd5f7e30fc1960488ab3e7aa`
- `git patch-id --stable`: `b474572c91e7a6f576d690f149ae974fbfaa1b43`
- SQL sha256: `46016324beccd0c7285c7f93c49e9e1795c64cf980294c76e1a78d2508e9be10`
- Rollback: none on this branch (open question).

## Every hunk in this pack (new files only)
All under `P1-27/role-test-v4-4role-20261116/` and the new receipt files listed below. Copied structure files are byte-identical to v3 (same hashes as v3 SHA256SUMS). New or written this turn:

1. `build4.mjs` — v3 harness plus postgres persona in both shapes, unique non-address fixture identifiers, v4 matrix file names, 4-role coverage list in the run JSON.
2. `compare.py` — v3 comparer pointed at v4 matrix names, plus a 4-role / op-key presence printout.
3. `live-read-only-20261116.json` — SELECT-only confirmation that all 89 named policies and the 4 duplicate index/constraint objects still exist on live.
4. Matrices, logs, run JSON, `v4-compare.json`, `v4-compare-stdout.txt` — produced by the four runs (s1, s2, s1-mutant, s2-mutant).
5. `P1-27/ROLE-TEST-RESULTS-v4-20261116.md` — this replay's results. v1–v3 results files untouched.
6. `P1-27-4role-replay-20261116/RECEIPT-P1-27-4ROLE-REPLAY-20261116.md` and this BUILD-NOTES.md.
7. SHA256SUMS in the test dir and in this pack folder. `/workspace/SHA256SUMS` was not touched.

Copied, not edited: `mig.sql`, `affected.txt`, `package.json`, `prod-schema.json`, `prod-constraints-triggers.json`, `prod-assessment-drafts.json`.

No `node_modules` is part of the pack (local symlink only).
