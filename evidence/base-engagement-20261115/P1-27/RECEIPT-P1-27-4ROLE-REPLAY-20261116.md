# RECEIPT: P1-27 local 4-role replay (BUILD ONLY) — 78b600fc / 040100

Monday Nov 16, 2026, 8:15 PM ET (America/New_York). Avery. BUILD ONLY. Nothing applied, deployed, flipped or scheduled. No secrets or user emails printed. v1–v3 hashed files were not overwritten. `/workspace/SHA256SUMS` was not touched.

## Stopped-run check
No leftover 20261116 4-role receipt, test folder or origin branch was found from the rate-limited run. Continued from the Nov 15 v3 pack and from origin `fix/p1-27-rls-perf-cleanup-20261116040100` at 30ba24c4.

## Branch / commit
- Repo: ESSENTIALS-ppl/romrxbjj-v2
- Branch: `fix/p1-27-rls-perf-cleanup-20261116040100` (existing; no new commit)
- Commit: `30ba24c4679398bf0d72a3d6e391fd7b315535e4` (origin, confirmed with `git ls-remote`)
- Patch sha256: `fb5922482be58fc61447c4db58d49684941989debd5f7e30fc1960488ab3e7aa`
- `git patch-id --stable`: `b474572c91e7a6f576d690f149ae974fbfaa1b43`
- SQL sha256 (040100 body, identical to 78b600fc): `46016324beccd0c7285c7f93c49e9e1795c64cf980294c76e1a78d2508e9be10`
- Rollback sha256: none on the branch (open question).

## Tests
PGlite 0.5.16, local structure restore of live as of Nov 15 ~9:42 PM ET (migration head then 20261116024102). Four runs, all `migErr` null.

| shape | cells | before vs after diffs | planted-mutant diffs |
|---|---:|---:|---:|
| s1 | 4,867 | 0 | 27 |
| s2 | 6,067 | 0 | 27 |

Roles tested: anon, authenticated, service_role, postgres. Policies on the 39 tested tables 108 → 87. Unique/PK 91 → 90. FK/CHECK/triggers unchanged. ON CONFLICT DO NOTHING, ON CONFLICT DO UPDATE, and RETURNING insert/update/delete/upsert cells are in the matrix for every persona and match before vs after. Cross-user reads (coach C sees linked athlete D only, never unlinked E; school admin SA sees user_SA and user_SU_in_school only; anon sees none; service_role and postgres see both/all) match before vs after. Sensitivity still catches the planted mutant (27 cells).

## Live read-only, 8:13 PM ET
All 89 policies named in 040100 are present. The three duplicate indexes and both coach_notes unique constraints are present. Live public policy total 146; live migration head 20261117010702. No row data was read. No writes.

## Open questions
1. This is a PGlite structure restore, not a Supabase branch and not a restore of today's live head. Whether it meets Sable's L1075 / L1099 per-role condition is still Sable's (and Vera's) call. L1046(c) / 30ba24c4 stay unapplied.
2. 040100 has no rollback file on the branch. A rollback of the 75 wraps, 15 merges and 4 index/constraint drops is still owed before apply if the gate requires one.
3. The coaches_updated_at 42703 failure is unchanged and outside this item (L1098).
4. Five public policies have been added on live since the Nov 15 restore (141 → 146). They are not in 040100. If the restore must be refreshed to head 20261117010702 before apply, say so.

## Not done
Nothing applied. No new gate line. No rollback authored.
