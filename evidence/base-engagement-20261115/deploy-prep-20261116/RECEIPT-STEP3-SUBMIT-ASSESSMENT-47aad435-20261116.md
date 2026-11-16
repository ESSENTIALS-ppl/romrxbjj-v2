# PREP RECEIPT, Step 3: submit-assessment from 47aad435. PREP ONLY, NOT DEPLOYED.

Written Mon Nov 16, 2026, about 9:05 AM ET by Avery. Deploy after 2a to 2d are live (it needs user_mobility_schedule; check_kind is only written on quick saves).

## Source
- `47aad4358c73f333e34f25e53002fcef432a78a1` (tree ea153b214ac69bff0343a291b7ec5c238d98e9b6), parent `832056dd40bd192a29a176b55dc167ff642dc91f`. Patch sha (comment-only tip) `6308bf229e6000ab4646e5d6e3afd0d0dc5e88de7527046996e0aff240522699`. Origin `feat/p1-06-v5-on-p1-07-v4-20261115`.

## Exact files (live v44 layout; staged copy `staged/47aad435-submit-assessment/`)
| Deploy name | repo path @47aad435 | sha256 | vs live v44 |
|---|---|---|---|
| functions/submit-assessment/index.ts (entrypoint) | supabase/functions/submit-assessment/index.ts | ef5f8407987fd79ea6c67a2f8b6e7761d1832eb8094d330a117bda798f6bc1b2 | changed |
| functions/submit-assessment/schedule.ts | supabase/functions/submit-assessment/schedule.ts | c28532c8f029ea9e96eb9f7f5cfdc78ce1db5230b9bf4056f3f40e902b015962 | NEW |
| functions/submit-assessment/mood_block.ts | …/mood_block.ts | 763ca702c1692ab443c95bc9af5185f70d30da88ee8cdc4fe8715af14509885d | identical |
| functions/_shared/rate_limit.ts | supabase/functions/_shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 | identical |
| functions/_shared/events.ts | …/_shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 | identical |
| functions/_shared/email_footer.ts | …/_shared/email_footer.ts | 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b | identical |
| functions/_shared/capture_methods.ts | …/_shared/capture_methods.ts | d14764c60e06cb82853b2d16aca203e188c227fe6544dae9f266054fab282c4e | identical |

## Diff vs live v44
- `diffs-vs-live/47aad435-submit-assessment-vs-live-v44.diff` sha256 `630bf1237140a57b2e345d0f786083ca973c8a0a8a27b502cbfb7255ce7b0b59`. Stat: 2 files changed, 275 insertions(+), 2 deletions(-). Hunks are identical to the gating pack's `d43f3976…` (path labels only differ).
- Hunks: index.ts `@@ -1,4 +1,4 @@` header comment; `@@ -10,6 +10,7 @@` imports schedule.ts; `@@ -252,6 +253,33 @@` parses check_kind (400 if invalid), reads the schedule fail-soft, and on quick: tz read, once-per-cycle quick-row read, the day 7 to 14 window guard, the joints guard, then `row.check_kind='quick'`; `@@ -262,8 +290,30 @@` does a non-blocking schedule upsert (full) or next_check_at update (quick), and a quick save returns early with no great-job email (plus one comment word change). schedule.ts `@@ -0,0 +1,223 @@` is new (DEFAULT_TZ America/New_York).
- A full submit still inserts with no check_kind key (default 'full'), so full saves are unchanged in shape.

## Tests (re-run today on a git archive of 47aad435)
- deno test schedule.test.ts + mood_block.test.ts: **21 passed, 0 failed** (`test-evidence-20261116/47aad435-submit-assessment-deno-test.txt`).
- deno check index.ts (+ compute-tiers index.ts): clean (`test-evidence-20261116/47aad435-deno-check.txt`).
- PGlite suites (roll 23/23, backfill 6/6, FK 11/11, quick 5/5, quick-reads 12/12) are from the Nov 15 gating pack. I did not re-run them today (node_modules were removed in the inode cleanup).

## Backup / rollback
Live v44 in `live-reads-20261116/submit-assessment-v44/` (6 files, byte-identical to the Nov 15 read and to 543cabf). ezbr `110f365775b57b68977c68627ef2cda1645aae09a4ef23944555de8fcb0ff19a`, **verify_jwt true**, entrypoint `functions/submit-assessment/index.ts`. Redeploy those 6 to roll back. Rolling back leaves any schedule rows in place (harmless; the roll cron keeps working).

## Deploy command form
MCP `deploy_edge_function`: name `submit-assessment`, entrypoint_path `functions/submit-assessment/index.ts`, **verify_jwt true** (same as v44), files = the 7 above with exact bytes from 47aad435. Expected: v45.

## Ordering note for Grant
Grant's order puts submit-assessment (3) before compute-tiers (4). Between the two, live compute-tiers v53 has no quick guard. A quick submit in that gap would be rescored as a full one and rewrite the plan. The app sends no quick submits (QUICK_CHECK_ON false, and 8bf3d601 is not live), so the risk is only a hand-made API call. Deploying 4 right after 3, or 4 before 3 (its guard and filter are no-ops until a quick row exists), closes the gap. That's Grant's call. I haven't changed the order.

## Post-check plan (read-only)
1. `list_edge_functions` / `get_edge_function`: v45, verify_jwt true, 7 files with the sha256 above.
2. `query_logs` for submit-assessment: no boot errors, and no "user_mobility_schedule upsert failed" lines after real submits.
3. On the next real full submit (no test submits on live): `select user_id is not null, next_check_at - last_assessed_at, next_retest_at - last_assessed_at from public.user_mobility_schedule order by updated_at desc limit 1;` Expect 7 days and 42 days. `select check_kind, count(*) from public.assessments group by 1;` Expect quick 0.
