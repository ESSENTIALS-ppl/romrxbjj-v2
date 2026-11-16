# P1-06 quick-skip v4 row-check follow-up — BUILD ONLY receipt

Sunday Nov 15, 2026, ~10:43 PM ET (America/New_York). romrxbjj-v2. NOTHING applied, deployed, sent, or db-pushed. Plain push of one NEW commit on the existing branch; no force-push. The prior receipt RECEIPT-P1-06-quick-skip-v4-guard-20261115.md is kept unchanged.

The prior worktree /workspace/p1v4-quickskip-20261115 was broken (local branch had been reset to 79e63bf; 34835f66 was missing from the object store; dirty tree was the pre-NY Chicago draft). It was left untouched. This follow-up was built in a fresh worktree from origin 34835f66: /workspace/p1v4-quickskip-20261115-rowcheck.

## Shas

| item | value |
|---|---|
| commit | 955098aaaa73d4330a9b54a289b1b0b42dd7d7d5 |
| parent | 34835f66cdcbba4c003653d5d8eadae9f8afe7e5 |
| branch (remote) | feat/quick-skip-v4-guard-20261115 |
| local worktree branch | feat/quick-skip-v4-guard-20261115-rowcheck (pushed to the remote name above) |
| worktree | /workspace/p1v4-quickskip-20261115-rowcheck |
| patch sha (`git show --format= --patch \| sha256sum`) | 8dd55e66881edcd59ba27d5a061701aece31a800d8bfb96bfa824b45066eb8d6 |
| origin after plain push | 955098aaaa73d4330a9b54a289b1b0b42dd7d7d5 on feat/quick-skip-v4-guard-20261115 (34835f6..955098a, ls-remote match) |

## What landed

A second once-per-cycle check, because the schedule signal alone (`next_check_at` = `next_retest_at`) misses the case where the assessments insert succeeds and the later non-blocking schedule write fails.

- Table/columns the quick save actually writes, cited:
  - `public.assessments.user_id` — set on the insert row in submit-assessment.
  - `public.assessments.check_kind` — set to `'quick'` on a quick save (unapplied migration 20261116031000; omitted on full saves).
  - `public.assessments.assessed_at` — set on the insert row to `new Date().toISOString()`.
  - `public.assessments.created_at` — not sent by the insert; column is `timestamptz not null default now()` (20260428000003_assessments.sql).
  - Compared against `public.user_mobility_schedule.last_assessed_at` (last full assessment; not moved on a quick save).
- Reject when an `assessments` row for this `user_id` has `check_kind = 'quick'` and `created_at` strictly after `last_assessed_at`.
- Same existing 400 body: `No quick re-check is scheduled`. No new words.
- A quick row from a previous cycle (`created_at` before the new `last_assessed_at`) does not block.
- Query is non-blocking if `check_kind` is not yet applied; the schedule signal still applies.

## Every changed hunk exactly (`git show --format= --patch` of 955098aa)

```
diff --git a/supabase/functions/submit-assessment/index.ts b/supabase/functions/submit-assessment/index.ts
index 50c560e..001d7f9 100644
--- a/supabase/functions/submit-assessment/index.ts
+++ b/supabase/functions/submit-assessment/index.ts
@@ -10,7 +10,7 @@ import { logEvent } from "../_shared/events.ts";
 import { POSTAL_LINE } from "../_shared/email_footer.ts";
 import { sanitizeCaptureMethods } from "../_shared/capture_methods.ts";
 import { buildMoodBlockForUser } from "./mood_block.ts";
-import { nextCheckAfterQuick, parseCheckKind, pickCheckJoints, QUICK_ERRORS, rejectQuickSubmit, rejectQuickWindow, type ScheduleRead, scheduleRow } from "./schedule.ts";
+import { nextCheckAfterQuick, parseCheckKind, pickCheckJoints, QUICK_ERRORS, rejectQuickSubmit, rejectQuickWindow, rejectQuickSavedRow, type AssessmentQuickRow, type ScheduleRead, scheduleRow } from "./schedule.ts";
 const CORS = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
@@ -266,7 +266,17 @@ Deno.serve(async (req) => {
       const { data: pref } = await admin.from("notification_preferences").select("timezone").eq("user_id", user.id).maybeSingle();
       if (pref && typeof (pref as { timezone?: unknown }).timezone === "string") userTz = (pref as { timezone: string }).timezone;
     } catch { /* resolveTz falls back; single DEFAULT_TZ in schedule.ts */ }
-    const rejected = rejectQuickWindow(sched, new Date(), userTz) ?? rejectQuickSubmit(body, sched?.check_joints, NUMERIC_FIELDS);
+    // Second once-per-cycle check: public.assessments (user_id, check_kind, created_at).
+    // Quick save writes user_id + check_kind='quick'; created_at comes from default now().
+    // Reject if created_at is after user_mobility_schedule.last_assessed_at (last full; not moved on a quick save).
+    let quickRows: AssessmentQuickRow[] = [];
+    try {
+      let q = admin.from("assessments").select("check_kind, created_at").eq("user_id", user.id).eq("check_kind", "quick");
+      if (sched?.last_assessed_at) q = q.gt("created_at", sched.last_assessed_at);
+      const { data: existing, error: existingErr } = await q;
+      if (!existingErr && Array.isArray(existing)) quickRows = existing as AssessmentQuickRow[];
+    } catch { /* check_kind may be unapplied; schedule signal still applies */ }
+    const rejected = rejectQuickWindow(sched, new Date(), userTz) ?? rejectQuickSavedRow(sched?.last_assessed_at, quickRows) ?? rejectQuickSubmit(body, sched?.check_joints, NUMERIC_FIELDS);
     if (rejected) return json({ error: QUICK_ERRORS[rejected] }, 400);
     row.check_kind = "quick"; // omit on full submits so insert still works before the unapplied check_kind migration
   }
diff --git a/supabase/functions/submit-assessment/schedule.test.ts b/supabase/functions/submit-assessment/schedule.test.ts
index b263cb7..0a28b73 100644
--- a/supabase/functions/submit-assessment/schedule.test.ts
+++ b/supabase/functions/submit-assessment/schedule.test.ts
@@ -12,6 +12,7 @@ import {
   QUICK_ERRORS,
   rejectQuickSubmit,
   rejectQuickWindow,
+  rejectQuickSavedRow,
   resolveTz,
   scheduleFromAssessedAt,
   scheduleRow,
@@ -200,3 +201,28 @@ Deno.test("P1-06 v4 guard: a new full assessment resets the cycle", () => {
   assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 14, "23:30", TZ), TZ), null);
   assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 15, "00:00", TZ), TZ), "no_schedule");
 });
+
+Deno.test("P1-06 v4: quick row saved and schedule not updated: second quick attempt is rejected 400 no_schedule", () => {
+  // Failure case Grant/Jules found: assessments insert succeeded, schedule write did not run.
+  const s = schedAt();
+  assertEquals(s.next_check_at === s.next_retest_at, false);
+  const day10 = atLocal(LAST_FULL, 10, "12:00", TZ);
+  assertEquals(rejectQuickWindow(s, day10, TZ), null);
+  const savedAt = atLocal(LAST_FULL, 8, "12:00", TZ).toISOString();
+  const rows = [{ check_kind: "quick" as const, created_at: savedAt }];
+  assertEquals(rejectQuickSavedRow(s.last_assessed_at, rows), "no_schedule");
+  assertEquals(rejectQuickWindow(s, day10, TZ) ?? rejectQuickSavedRow(s.last_assessed_at, rows), "no_schedule");
+  assertEquals(QUICK_ERRORS.no_schedule, "No quick re-check is scheduled");
+});
+
+Deno.test("P1-06 v4: a quick row from a previous cycle (created_at before last_assessed_at) does not block", () => {
+  const newFullIso = atLocal(LAST_FULL, 10, "12:00", TZ).toISOString();
+  const reset = schedAt(newFullIso);
+  const prior = [{ check_kind: "quick" as const, created_at: atLocal(LAST_FULL, 8, "12:00", TZ).toISOString() }];
+  assertEquals(Date.parse(prior[0].created_at) < Date.parse(reset.last_assessed_at), true);
+  assertEquals(rejectQuickSavedRow(reset.last_assessed_at, prior), null);
+  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 7, "00:00", TZ), TZ) ?? rejectQuickSavedRow(reset.last_assessed_at, prior), null);
+  // A full row after last_assessed_at is not a quick save and does not block.
+  const fullAfter = [{ check_kind: "full" as const, created_at: atLocal(newFullIso, 1, "12:00", TZ).toISOString() }];
+  assertEquals(rejectQuickSavedRow(reset.last_assessed_at, fullAfter), null);
+});
diff --git a/supabase/functions/submit-assessment/schedule.ts b/supabase/functions/submit-assessment/schedule.ts
index 4981c25..1376c06 100644
--- a/supabase/functions/submit-assessment/schedule.ts
+++ b/supabase/functions/submit-assessment/schedule.ts
@@ -191,3 +191,33 @@ export function rejectQuickWindow(
   if (day === null || day < CHECK_DAYS || day > CHECK14_DAYS) return "no_schedule";
   return null;
 }
+
+/** A quick save writes public.assessments.user_id, assessments.check_kind = 'quick', and assessments.assessed_at.
+ *  assessments.created_at is not sent; the column is timestamptz not null default now() (20260428000003).
+ *  user_mobility_schedule.last_assessed_at is the last full assessment and is not moved on a quick save. */
+export interface AssessmentQuickRow {
+  check_kind?: string | null;
+  created_at?: string | null;
+}
+
+/** True when an assessments row already has check_kind='quick' with created_at strictly after last_assessed_at. */
+export function quickRowExistsThisCycle(
+  lastAssessedAt: string | null | undefined,
+  rows: ReadonlyArray<AssessmentQuickRow>,
+): boolean {
+  const start = lastAssessedAt ? Date.parse(lastAssessedAt) : NaN;
+  if (!Number.isFinite(start)) return false;
+  return rows.some((r) => {
+    if (r.check_kind !== "quick") return false;
+    const t = r.created_at ? Date.parse(r.created_at) : NaN;
+    return Number.isFinite(t) && t > start;
+  });
+}
+
+/** Second once-per-cycle check: a saved quick assessments row still blocks if the schedule write failed. Same no_schedule error. */
+export function rejectQuickSavedRow(
+  lastAssessedAt: string | null | undefined,
+  rows: ReadonlyArray<AssessmentQuickRow> | null | undefined,
+): "no_schedule" | null {
+  return quickRowExistsThisCycle(lastAssessedAt, rows ?? []) ? "no_schedule" : null;
+}
```

Hunk headers:

```
diff --git a/supabase/functions/submit-assessment/index.ts b/supabase/functions/submit-assessment/index.ts
@@ -10,7 +10,7 @@ import { logEvent } from "../_shared/events.ts";
@@ -266,7 +266,17 @@ Deno.serve(async (req) => {
diff --git a/supabase/functions/submit-assessment/schedule.test.ts b/supabase/functions/submit-assessment/schedule.test.ts
@@ -12,6 +12,7 @@ import {
@@ -200,3 +201,28 @@ Deno.test("P1-06 v4 guard: a new full assessment resets the cycle", () => {
diff --git a/supabase/functions/submit-assessment/schedule.ts b/supabase/functions/submit-assessment/schedule.ts
@@ -191,3 +191,33 @@ export function rejectQuickWindow(
```

Stat: 3 files, +68 / -2.

## Tests

Command (worktree): `deno test --allow-read --no-lock --node-modules-dir=none supabase/functions/submit-assessment/schedule.test.ts supabase/functions/submit-assessment/mood_block.test.ts`

- 21 passed, 0 failed. Log: evidence/deno-test-submit-assessment-rowcheck.txt
- schedule.test.ts: 14. mood_block.test.ts: 7. Prior 19 still pass (12 schedule + 7 mood_block). 2 new tests.
- New: (1) a quick `assessments` row is saved and the schedule is NOT updated (`next_check_at` still != `next_retest_at`, window would accept) — second attempt rejected `no_schedule`. (2) a quick row with `created_at` before `last_assessed_at` (previous cycle) does not block; a `check_kind='full'` row after `last_assessed_at` also does not block.
- `deno check --no-lock --node-modules-dir=none` on index.ts, schedule.ts, schedule.test.ts: 0 errors.

## Not done

Nothing applied or deployed. No migration apply. No force-push. No PR opened. The broken prior worktree was not deleted or reset.
