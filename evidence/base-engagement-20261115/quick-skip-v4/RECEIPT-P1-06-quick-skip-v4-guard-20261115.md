# P1-06 quick-skip v4 guard — BUILD ONLY receipt

Sunday Nov 15, 2026, ~10:29 PM ET (America/New_York). romrxbjj-v2. NOTHING applied, deployed, sent, or db-pushed. Plain push of one NEW branch; no force-push.

## Shas

| item | value |
|---|---|
| commit | 34835f66cdcbba4c003653d5d8eadae9f8afe7e5 |
| branch | feat/quick-skip-v4-guard-20261115 |
| parent / v3 start | 79e63bf7069d2cb1bb7bd166960db98653e5b415 |
| worktree | /workspace/p1v4-quickskip-20261115 |
| patch sha (`git show --format= --patch \| sha256sum`) | d0aebe8a4ac87b72b0a68c0edb96cdf384cf15c5decfe3b817273c388f3622b6 |
| patch sha vs v3 (`git diff 79e63bf 34835f6 \| sha256sum`) | d0aebe8a4ac87b72b0a68c0edb96cdf384cf15c5decfe3b817273c388f3622b6 (identical; parent is v3) |
| v3 patch sha (`git show --format= --patch` of 79e63bf) | a45060c429ba7f789fb852b074d2d0dfce43111658b9b9ae22b55f17b04fb3e1 |
| origin after plain push | 34835f66cdcbba4c003653d5d8eadae9f8afe7e5 on feat/quick-skip-v4-guard-20261115 (new branch, ls-remote match) |

Every changed hunk is listed exactly in BUILD-NOTE-20261115.md and 34835f66.patch (same patch sha).

## What landed

- `rejectQuickWindow` in `schedule.ts`, called from the existing quick-check block in `submit-assessment/index.ts` (before `rejectQuickSubmit`).
- Window: local days 7 to 14 after the last full assessment (`last_assessed_at` local date = day 0; day 14 inclusive through end of that local day).
- Same-cycle second quick check rejected via the rule 2 signal (`next_check_at` equals `next_retest_at`). A new full assessment (`scheduleRow`) resets `last_assessed_at` and both next timestamps, so the cycle starts over.
- Rejection uses the existing 400 body `No quick re-check is scheduled` (`QUICK_ERRORS.no_schedule`). No new words.
- Timezone: `notification_preferences.timezone` if valid; otherwise the single helper/constant `DEFAULT_TZ` / `resolveTz` = `America/New_York` (Grant, unified fallback). Only invalid or missing falls back. Stored user tz is kept when valid.
- `schedule.ts` comment that still says the roll "rolls after local day 7" was left unchanged.

## Tests

Command (worktree): `deno test --allow-read --no-lock --node-modules-dir=none supabase/functions/submit-assessment/schedule.test.ts supabase/functions/submit-assessment/mood_block.test.ts`

- 19 passed, 0 failed. Log: evidence/deno-test-submit-assessment.txt
- schedule.test.ts: 12 (6 existing + 6 v4). mood_block.test.ts: 7 existing. All still pass.
- New coverage: day 6 rejected (`no_schedule`); day 7 accepted; day 14 late evening accepted (including a Pacific instant that is already the next UTC date); day 15 rejected; second quick check same cycle rejected; a new full assessment resets the cycle; invalid or missing tz uses NY day boundaries (an instant that is day 7 in Eastern / day 6 in Chicago is accepted under the fallback and rejected with explicit Chicago; an instant that is day 15 in Eastern / day 14 in Chicago is rejected under the fallback and accepted with explicit Chicago).
- `deno check --no-lock --node-modules-dir=none` on index.ts, schedule.ts, schedule.test.ts, mood_block.ts, mood_block.test.ts: 0 errors. Log: evidence/deno-check-submit-assessment.txt

## Not done

Nothing applied or deployed. No migration apply. No force-push. No PR opened.
