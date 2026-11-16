import { assertEquals } from "jsr:@std/assert@1";
import {
  CHECK_DAYS,
  CHECK14_DAYS,
  RETEST_DAYS,
  computeCheckJoints,
  nextCheckAfterQuick,
  parseCheckKind,
  pickCheckJoints,
  rejectQuickSubmit,
  scheduleFromAssessedAt,
  scheduleRow,
} from "./schedule.ts";

const NUMERIC = ["hip_er_l", "hip_er_r", "ankle_df_l", "ankle_df_r", "shoulder_flex_l"];

Deno.test("P1-07: 42-day retest and 7-day check from assessed_at", () => {
  const s = scheduleFromAssessedAt("2026-10-01T16:00:00.000Z");
  assertEquals(RETEST_DAYS, 42);
  assertEquals(CHECK_DAYS, 7);
  assertEquals(CHECK14_DAYS, 14);
  assertEquals(s.next_check_at, "2026-10-08T16:00:00.000Z");
  assertEquals(s.next_retest_at, "2026-11-12T16:00:00.000Z");
});

Deno.test("P1-06: full schedule row includes 1-2 check_joints", () => {
  const joints = pickCheckJoints(["ankle_df_l", "hip_er_r", "shoulder_flex_l"], {});
  assertEquals(joints, ["ankle_df_l", "hip_er_r"]);
  const row = scheduleRow(
    "ebfe4f3d-0619-4460-a5f7-08217ea31909",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "2026-11-01T12:00:00.000Z",
    "2026-11-01T12:00:01.000Z",
    joints,
  );
  assertEquals(row.user_id, "ebfe4f3d-0619-4460-a5f7-08217ea31909");
  assertEquals(row.next_check_at, "2026-11-08T12:00:00.000Z");
  assertEquals(row.next_retest_at, "2026-12-13T12:00:00.000Z");
  assertEquals(row.check_joints, ["ankle_df_l", "hip_er_r"]);
});

Deno.test("P1-06: computed worst when worst_joints empty; hip_flex and lumbar ignored", () => {
  const joints = pickCheckJoints([], {
    hip_flex_l: 40, // would look "worst" but is unscored
    lumbar_flex: 10,
    hip_er_l: 5, // 5/23 ~ large gap
    ankle_df_r: 1, // 1/6.1 is the larger gap
    shoulder_flex_l: 140, // near target
  });
  assertEquals(joints[0], "ankle_df_r");
  assertEquals(joints[1], "hip_er_l");
  assertEquals(joints.includes("hip_flex_l"), false);
  assertEquals(joints.includes("lumbar_flex"), false);
  assertEquals(computeCheckJoints({ hip_er_l: 5, ankle_df_r: 1 }).length <= 2, true);
});

Deno.test("P1-06: after day-7 quick, next_check_at becomes day 14; after day 14 it clears; retest untouched by this helper", () => {
  const last = "2026-11-01T12:00:00.000Z";
  assertEquals(nextCheckAfterQuick(last, "2026-11-08T12:00:00.000Z"), "2026-11-15T12:00:00.000Z");
  assertEquals(nextCheckAfterQuick(last, "2026-11-14T23:59:59.000Z"), "2026-11-15T12:00:00.000Z");
  assertEquals(nextCheckAfterQuick(last, "2026-11-15T12:00:00.000Z"), null);
  assertEquals(nextCheckAfterQuick(last, "2026-11-20T12:00:00.000Z"), null);
});

Deno.test("P1-06: quick submit rejects extra joints, empty schedule, and missing scheduled values", () => {
  assertEquals(parseCheckKind({}), "full");
  assertEquals(parseCheckKind({ check_kind: "quick" }), "quick");
  assertEquals(parseCheckKind({ check_kind: "partial" }), "invalid");
  assertEquals(rejectQuickSubmit({ hip_er_l: 20 }, null, NUMERIC), "no_schedule");
  assertEquals(rejectQuickSubmit({ hip_er_l: 20, ankle_df_l: 4 }, ["hip_er_l"], NUMERIC), "unexpected_joint");
  assertEquals(rejectQuickSubmit({ hip_er_r: 20 }, ["hip_er_l"], NUMERIC), "unexpected_joint");
  assertEquals(rejectQuickSubmit({}, ["hip_er_l"], NUMERIC), "missing_scheduled_joints");
  assertEquals(rejectQuickSubmit({ hip_er_l: 20 }, ["hip_er_l"], NUMERIC), null);
});
