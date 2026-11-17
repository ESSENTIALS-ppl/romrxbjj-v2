# QUICK-CHECK-READONLY-20261116

Written Mon Nov 16, 2026, 8:16 PM ET by Avery. Read-only check for Vera's QUICK_CHECK_ON precheck.

**Scope.** Supabase project `cqzvqzwwevnflinxgnpp`. MCP reads only: `list_edge_functions`, `get_edge_function`, `execute_sql` SELECTs on catalogs plus a `check_kind` count. No function invoke, no live submit, no writes, no flag or secret changes, no secrets or user emails printed.

---

## 1. Live submit-assessment

Live now (list_edge_functions, 8:13 PM ET): **version 45**, ACTIVE, `verify_jwt` true, ezbr **`edb16eb4a277349df487359f8e087f3f99ecf0c3ebaedadf2b738bc5014d1296`**, `updated_at` 9:42:39 AM ET. That is unchanged from the L1134 deploy receipt (`RECEIPT-L1134-3-SUBMIT-ASSESSMENT.md`).

**Pinned repo HEAD for this function:** `47aad4358c73f333e34f25e53002fcef432a78a1` (`feat/p1-06-v5-on-p1-07-v4-20261115`, comment-only tip on P1-07 v4). The `/workspace/romrxbjj-v2` checkout is on a different branch and does not contain this code. Citations below are from the pinned worktree `/tmp/wt-l1134-47aad435` (same tip also at `/workspace/p1-06-v5-on-p1-07-v4-20261115`).

**Source used, and why.** Tonight's `get_edge_function` for `submit-assessment` was truncated at 4,000 characters of JSON (parse failed on a control character; only a prefix of `functions/submit-assessment/index.ts` came back). That prefix matches the pinned `index.ts`. The seven deployed files saved at 9:42 AM ET in `L1134-deploy-20261116/post-deploy/submit-assessment-v45/` are byte-identical to the 47aad435 tree (cmp on all seven). File sha256s match the L1134 receipt. Because the live ezbr is still `edb16eb4`, those bytes are still live. Line cites below are from that pinned tree.

| file | sha256 |
|---|---|
| functions/submit-assessment/index.ts | ef5f8407987fd79ea6c67a2f8b6e7761d1832eb8094d330a117bda798f6bc1b2 |
| functions/submit-assessment/schedule.ts | c28532c8f029ea9e96eb9f7f5cfdc78ce1db5230b9bf4056f3f40e902b015962 |
| functions/submit-assessment/mood_block.ts | 763ca702c1692ab443c95bc9af5185f70d30da88ee8cdc4fe8715af14509885d |
| functions/_shared/rate_limit.ts | f3a82f1d3576ef423094ec694e2bf8bd2ed3922713574e23553b2af7e6aac3d8 |
| functions/_shared/events.ts | 49f186528fdc3dbe15d7ffa056b3a679c96001df50ea1cd03b0aec8b4ab45b21 |
| functions/_shared/email_footer.ts | 0f9d101999a6ec9971b6e5487b84485b902303c77d6396e9008d8fc61c61e03b |
| functions/_shared/capture_methods.ts | d14764c60e06cb82853b2d16aca203e188c227fe6544dae9f266054fab282c4e |

**Compare to the pinned HEAD:** live v45 matches 47aad435 exactly on those seven files. No later submit-assessment commit is live.

### Does it accept and store `check_kind='quick'` correctly? Yes, with the guards below. It does not read `QUICK_CHECK_ON`.

**Defaulting** (`schedule.ts:96-101`). `parseCheckKind`: missing, null, empty, or `"full"` → `"full"`. `"quick"` → `"quick"`. Anything else → `"invalid"`, and `index.ts:256-257` returns HTTP 400 `{ error: "check_kind must be full or quick" }`. Full submits omit `check_kind` on the insert row (`index.ts:281` comment), so the column default `'full'` applies.

**Validation for a quick submit** (`index.ts:263-280`), all failures HTTP 400 with `QUICK_ERRORS` (`schedule.ts:123-127`):

1. `rejectQuickWindow` (`schedule.ts:181-193`): needs a schedule row with `last_assessed_at`; rejects if a quick check is already done this cycle (`next_check_at === next_retest_at`); accepts only on the user's local calendar days 7 through 14 after that last full assessment (timezone from `notification_preferences.timezone`, else America/New_York). Otherwise `"No quick re-check is scheduled"`.
2. `rejectQuickSavedRow` (`schedule.ts:217-223`, used at `index.ts:272-279`): a second once-per-cycle check against `assessments` rows with `check_kind='quick'` and `created_at` after `last_assessed_at`. Same `"No quick re-check is scheduled"` error if one already exists (covers a failed schedule write).
3. `rejectQuickSubmit` (`schedule.ts:103-121`): `user_mobility_schedule.check_joints` must be a non-empty subset of the numeric ROM fields; the body may only include those scheduled joints; at least one scheduled joint must have a finite number. Errors: `"No quick re-check is scheduled"`, `"Quick re-check only accepts the scheduled joints"`, `"Quick re-check needs a measurement for a scheduled joint"`. Common ROM validation still applies first (`index.ts:245-255`): values 0-360, at least one measurement.

There is **no** `QUICK_CHECK_ON` read in this function (or in `schedule.ts`). A request that passes the guards is accepted even when that server secret is unset.

**Tables and columns written**

- `public.assessments` INSERT (`index.ts:239-253, 281, 285-291`): `user_id`, `athlete_id`, `assessed_at` (now), `sport`, every `NUMERIC_FIELDS` key (scheduled values, others null), `check_kind='quick'`, and optional `capture_methods`. `created_at` is not sent; the column default is `now()`. Scoring columns (`rom_total`, `worst_joints`, and the rest) are not set on this insert.
- `public.user_mobility_schedule` UPDATE only (`index.ts:295-302`): `next_check_at = next_retest_at` (Grant rule 2, `nextCheckAfterQuick`), `updated_at` now. Does **not** move `next_retest_at`, `last_assessment_id`, or `last_assessed_at`. The schedule write is non-blocking (`index.ts:293-311`): a failure still leaves the assessment row in place; the saved-row check then blocks a second quick submit.
- No great-job / assessment-done email for a quick save (`index.ts:312-314` returns 200 immediately; comment at 315-316). Response: `{ ok: true, assessment_id, assessed_at, sport, check_kind: "quick" }`.

**Scoring difference.** submit-assessment itself does not score. Live **compute-tiers v54** (ezbr `f4c62a384310b5db2966b566ad1085c61733aa4653853cb34b50c7f17e33170b`, `updated_at` 9:42:59 AM ET, also pinned to 47aad435; tonight's `get_edge_function` was likewise truncated, so the cite is the post-deploy v54 / 47aad435 `source/index.ts`, ezbr unchanged):

- If the inserted row is `check_kind === "quick"`, compute-tiers returns 200 `{ success: true, assessment_id, sport, skipped: "quick_check_no_rescore" }` and does **not** rewrite `worst_joints`, `rom_total`, joint scores, the protocol plan, or pack eligibility (`compute-tiers/index.ts:208-221`).
- When scoring a full row, a quick row is never used as "previous" (`check_kind IS DISTINCT FROM 'quick'`; `compute-tiers/index.ts:230-247`).

SQL read paths applied with L1134 also skip quick rows (`check_kind IS DISTINCT FROM 'quick'`): `get_my_profile()`, `my_joint_history(integer)`, `my_joint_start_vs_now()`, and view `rombot_context`. Trigger `tg_pe_assessment_inserted()` records a quick submit as `quick_recheck_submitted` and does not treat it as a new full assessment. Live count (read-only): **22 `full`, 0 `quick`**.

---

## 2. Column constraint

Live catalog (`pg_attribute` / `pg_get_constraintdef(..., true)` / `pg_get_indexdef`), 8:13-8:15 PM ET.

**`public.assessments.check_kind` only.** No other table has this column. No enum type named like `check_kind` (zero rows in `pg_type`/`pg_enum`).

- Type: `text`
- `NOT NULL`: true
- Default: `'full'::text`
- CHECK name: `assessments_check_kind_chk`
- CHECK text: `CHECK (check_kind = ANY (ARRAY['full'::text, 'quick'::text]))`
- Comment: `full = complete assessment (default). quick = scheduled 1-2 joint re-check; does not move next_retest_at.`
- Index (non-unique, valid): `CREATE INDEX assessments_user_check_kind_assessed_at_idx ON public.assessments USING btree (user_id, check_kind, assessed_at DESC)`

**`assessment_feedback` insert policy** `assessment_feedback_insert_own` (authenticated, INSERT, WITH CHECK): the row must be the caller's, and the referenced `assessments` row must be the caller's **and** `a.check_kind = 'full'`. A feedback insert against a quick assessment is rejected by RLS. SELECT on `assessment_feedback` is own-row only and does not mention `check_kind`. `session_feedback` has no `check_kind` predicate. `user_mobility_schedule` is authenticated SELECT of own row only (writes go through the service role in submit-assessment).

---

## 3. Server `QUICK_CHECK_ON` unset, vs Jules's client

A flag is on only when its value is exactly the lowercase string `"on"`.

### Server functions that read the secret

The only live edge function that reads env `QUICK_CHECK_ON` is **lifecycle-emails v4** (ezbr `6714009f4b59627011083c51807fc4e38ead1492dc9fc3344e19af56986edb41`, `updated_at` 7:29:36 PM ET, P1-08 qc-guard). Tonight's `get_edge_function` was truncated; the cites are the full extract saved at 7:58 PM ET in `SEND-FLIP-PREP-20261116/live-source/lifecycle-emails-v4/`, byte-identical to the 7:29 PM deploy readback and to `fb53b850` function bytes, with the live ezbr still `6714009f`.

- `logic.ts:14-18`: `flagOn(v)` is `v === "on"`. `quickCheckOn(v)` is the same function. Unset, empty, `"true"`, `"TRUE"`, `"1"`, or any other value is off.
- `handler.ts:49`: each kind is planned with `quickCheckOn: quickCheckOn(d.env("QUICK_CHECK_ON"))`.
- `logic.ts:304-314`: Version A (check7, or check14 with no current-cycle quick row) is skipped with reason `quick_check_off` when the flag is off. Version B (check14 after a quick row already exists) still sends. Other kinds (retest, protocol, digest, lapsed) do not use the flag.

This is a cron handler, not a user page endpoint. When the secret is unset it does **not** return 404. It still returns 200 with a plan (or a dry-run body); Version A is omitted quietly. Tests in `lifecycle-emails/test/quick-check-guard.test.ts` (repo, not live) cover unset / empty / `"true"` / `"TRUE"` / `"1"` as off.

**No other live function reads `QUICK_CHECK_ON`.** git history across romrxbjj-v2 only adds that read on the lifecycle-emails qc-guard commits (`a41a302` / `fb53b85`), which are what is live as v4. submit-assessment v45, compute-tiers v54, and rombot-checkin v1 do not read it. rombot-checkin filters `check_kind !== "quick"` when loading assessments; it has no flag branch.

**No live user endpoint returns 404, or a disabled body, because `QUICK_CHECK_ON` is unset.** submit-assessment never emits 404 or `{ disabled: true }` for that reason. If the day-7-to-14 window and joints are valid, it stores the quick row and returns 200.

### Jules's client

`/workspace/p1-wt` is detached at `360510f` (older integration snapshot). That tree has **no** `quickCheck.ts`, **no** `QUICK_CHECK_ON`, and **no** Quick Check page. It does already skip quick rows on the What Changed list: `app/src/lib/whatChanged.ts:69-72` (`(r.check_kind ?? 'full') !== 'quick'`).

On origin, the only Jules combined-client branch with the constant turned on is:

- `origin/feat/combined-p1-18-18b-26-on-29eb4fa-20261116` tip **`ed5af4a92e9e8ba889ef00c40a6b5300b1a3336e`**
- Includes unsubscribe FIX 1 (`2035692`) and `QUICK_CHECK_ON = true` (`f03e6c7`), plus server-off quiet tests (`7f60730`, `ed5af4a`)
- Every other origin combined / p1-06 / p1-17 / p1-18 / p1-26 tip still has `export const QUICK_CHECK_ON = false` in `app/src/lib/quickCheck.ts`

Client contract and behavior at `ed5af4a` (file:line from that tip):

- `app/src/lib/quickCheck.ts:24`: `export const QUICK_CHECK_ON = true` (compiled constant; not a server secret; no env var).
- `app/src/lib/quickCheck.ts:11-20` documents the 47aad435 server contract: POST `submit-assessment` with `check_kind: 'quick'` and only the scheduled fields; 200 `{ ok: true, ..., check_kind: 'quick' }`; the 400 error strings listed above; compute-tiers `skipped: 'quick_check_no_rescore'`; schedule writer rules. That contract **matches** live v45 / v54.
- `app/src/lib/quickCheck.ts:223-227` `quickSubmitBody` sends exactly `{ check_kind: 'quick', ...scheduled fields }`.
- `app/src/pages/QuickCheck.tsx:27`: if the constant is false, navigate to Today. In this build it is true, so the page can render.
- `app/src/components/QuickCheckBanner.tsx:10`: banner is hidden unless the constant is true. `MyProtocol.tsx:748` mounts that banner.
- Load path (`quickCheckLoad.ts:11-29`, `QuickCheck.tsx:55-56`, `quickCheck.ts:198-201`): no schedule row, a failed schedule or quick-row read, or a window that is not due → go to Today quietly, no error text. That is the client's "server side off" quiet path when the table, column, or window is missing.
- Submit path (`quickCheck.ts:205-218`, used at `QuickCheck.tsx:87-99`): 200 + `ok` → result. 400 `"No quick re-check is scheduled"` → Today quietly. `quickServerOff` also treats **404**, a body with `disabled: true`, or an error string matching `\b(disabled|not enabled)\b` as Today quietly. Other failures show the generic line. Tests: `quickCheckWindow.test.ts:85-94` and `QuickCheckBanner.serverOff.test.tsx:66-71`.

The client **does not call or read** the server `QUICK_CHECK_ON` secret. It cannot see whether that secret is unset.

### Do they match? Plainly

**Match.** The success and 400 contract Jules's combined client documents and codes against (`quickCheck.ts:11-20, 205-211, 223-227`; `QuickCheck.tsx:95-97`) is exactly live submit-assessment v45 at 47aad435, including storing `check_kind='quick'` and compute-tiers skipping the rescore. The client's quiet handling of a missing schedule, a failed `check_kind` read, or the `"No quick re-check is scheduled"` 400 also matches what the live function and schema actually do in those cases. lifecycle-emails, when the secret is unset, quietly skips Version A (the emails that link to `/dashboard/quick-check`) and does not 404; that is consistent with the client's comment that the lifecycle env may still be off (`QuickCheckBanner.serverOff.test.tsx:2-4`).

**Do not match, on the unset secret itself.** Live submit-assessment does **not** implement the 404 / "disabled" responses the client is prepared to treat as "server side off" (`quickCheck.ts:213-218`; `QuickCheckBanner.serverOff.test.tsx:66-70`). Those statuses are defensive in the client; the live function never returns them because of an unset `QUICK_CHECK_ON`. The client constant being `true` also turns the banner and page on whenever a schedule window is open, even if the server secret is still unset. In that situation a valid day-7-to-14 submit is stored as `check_kind='quick'` (200), while Version A lifecycle emails stay off. The two flags are independent: the client constant does not read the server secret, and the live submit path does not read it either.

A stale comment remains in live `lifecycle-emails` `logic.ts:16` ("client's QUICK_CHECK_ON constant ... currently false") and in older headers of Jules's own files (`quickCheck.ts:8-9` still says live submit-assessment ignores `check_kind` and that the feature is behind `false`). The live function and the `ed5af4a` constant have both moved on; the comment is wrong, the behavior above is what matters.

---

## Method and limits

- `list_edge_functions` / truncated `get_edge_function` tonight; full function bytes from the L1134 9:42 AM ET and P1-08 7:29 PM ET / 7:58 PM ET readbacks, accepted only because live ezbrs still match.
- `execute_sql` catalog reads for `check_kind` column, constraint, index, typname, comments, policies, skip-quick view/function predicates, and `SELECT check_kind, count(*) FROM public.assessments GROUP BY check_kind`. No other assessment or user columns were selected.
- Repo comparison: pinned 47aad435 worktree for submit-assessment and compute-tiers; lifecycle-emails v4 live extract / `fb53b850` function bytes; Jules client from `origin/feat/combined-p1-18-18b-26-on-29eb4fa-20261116` at `ed5af4a92e9e8ba889ef00c40a6b5300b1a3336e`, plus a scan of other origin combined branches and `/workspace/p1-wt` at `360510f`.
- Nothing was applied, deployed, invoked, scheduled, or flipped.

## Held back from git

None. This folder contains only this note and `SHA256SUMS`. No addresses appear in these files.
