import { assertEquals } from "jsr:@std/assert@1";
import {
  CHECK_DAYS,
  CHECK14_DAYS,
  DEFAULT_TZ,
  RETEST_DAYS,
  computeCheckJoints,
  localYmd,
  nextCheckAfterQuick,
  parseCheckKind,
  pickCheckJoints,
  QUICK_ERRORS,
  rejectQuickSubmit,
  rejectQuickWindow,
  resolveTz,
  scheduleFromAssessedAt,
  scheduleRow,
  ymdAdd,
  type ScheduleRead,
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

Deno.test("P1-06 rule 2: a quick check sets next_check_at = next_retest_at (any day); retest untouched", () => {
  const row = scheduleRow("u", "a", "2026-11-01T12:00:00.000Z", "2026-11-01T12:00:01.000Z");
  assertEquals(nextCheckAfterQuick(row), "2026-12-13T12:00:00.000Z");
  assertEquals(nextCheckAfterQuick({ next_retest_at: "2026-12-13T12:00:00.000Z" }), "2026-12-13T12:00:00.000Z");
  assertEquals(nextCheckAfterQuick(null), null);
});

Deno.test("P1-07 rule 1: a full save on day 42 resets next_check_at to +7 and next_retest_at to +42", () => {
  const row = scheduleRow("u", "a2", "2026-12-13T12:00:00.000Z", "2026-12-13T12:00:01.000Z");
  assertEquals(row.next_check_at, "2026-12-20T12:00:00.000Z");
  assertEquals(row.next_retest_at, "2027-01-24T12:00:00.000Z");
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

const TZ = "America/Chicago";
/** 2026-11-01 16:00 CT (CST, UTC-6) — local day 0. */
const LAST_FULL = "2026-11-01T22:00:00.000Z";
function schedAt(last = LAST_FULL, joints = ["hip_er_l"], nextCheck?: string, nextRetest?: string): ScheduleRead {
  const row = scheduleRow("u", "a", last, last, joints);
  return {
    last_assessed_at: last,
    next_retest_at: nextRetest ?? row.next_retest_at,
    next_check_at: nextCheck ?? row.next_check_at,
    check_joints: joints,
  };
}
/** Instant that is `day` local days after last, at a local clock time in tz. */
function atLocal(lastIso: string, day: number, localHHmm: string, tz: string): Date {
  const [hh, mm] = localHHmm.split(":").map((x) => parseInt(x, 10));
  const start = localYmd(lastIso, tz);
  if (!start) throw new Error(`bad lastIso ${lastIso}`);
  const target = ymdAdd(start, day);
  // Scan 14h before UTC midnight of the target date through 14h after the next UTC midnight.
  const begin = Date.parse(`${target}T00:00:00.000Z`) - 14 * 3600000;
  for (let delta = 0; delta <= 52 * 3600000; delta += 60000) {
    const inst = new Date(begin + delta);
    const fp = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(inst);
    const gg = (t: string) => fp.find((p) => p.type === t)?.value ?? "";
    if (`${gg("year")}-${gg("month")}-${gg("day")}` === target && parseInt(gg("hour"), 10) === hh && parseInt(gg("minute"), 10) === mm) {
      return inst;
    }
  }
  throw new Error(`no instant for ${target} ${localHHmm} ${tz}`);
}

Deno.test("P1-06 v4: DEFAULT_TZ is America/New_York; invalid tz falls back there; a valid stored tz is kept", () => {
  assertEquals(DEFAULT_TZ, "America/New_York");
  assertEquals(resolveTz(null), "America/New_York");
  assertEquals(resolveTz(""), "America/New_York");
  assertEquals(resolveTz("Not/AZone"), "America/New_York");
  assertEquals(resolveTz("America/New_York"), "America/New_York");
  assertEquals(resolveTz("America/Chicago"), "America/Chicago");
  assertEquals(resolveTz("Asia/Tokyo"), "Asia/Tokyo");
});

Deno.test("P1-06 v4 guard: day 6 rejected 400 no_schedule; day 7 accepted; day 14 late evening accepted; day 15 rejected", () => {
  const s = schedAt();
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 6, "23:59", TZ), TZ), "no_schedule");
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 7, "00:00", TZ), TZ), null);
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 7, "12:00", TZ), TZ), null);
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 14, "23:30", TZ), TZ), null);
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 15, "00:00", TZ), TZ), "no_schedule");
  assertEquals(QUICK_ERRORS.no_schedule, "No quick re-check is scheduled");
});

Deno.test("P1-06 v4 guard: day 14 late evening is accepted in the user's local tz (not UTC)", () => {
  // 2026-11-15 23:30 America/Los_Angeles = 2026-11-16 07:30Z (already 16 Nov UTC). Must still be day 14 local.
  const pacific = "America/Los_Angeles";
  const s = schedAt();
  const late = atLocal(LAST_FULL, 14, "23:30", pacific);
  assertEquals(late.toISOString().startsWith("2026-11-16"), true);
  assertEquals(rejectQuickWindow(s, late, pacific), null);
  // Same instant in Chicago is already local day 15 (01:30 CST on Nov 16) and must reject.
  assertEquals(rejectQuickWindow(s, late, TZ), "no_schedule");
  // Tokyo day 14 23:30 and day 15 00:00.
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 14, "23:30", "Asia/Tokyo"), "Asia/Tokyo"), null);
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 15, "00:00", "Asia/Tokyo"), "Asia/Tokyo"), "no_schedule");
});

Deno.test("P1-06 v4 guard: invalid or missing tz uses NY day boundaries (not the stored Chicago tz)", () => {
  const s = schedAt();
  const ny = "America/New_York";
  // Nov 8 00:30 ET is local day 7 in NY, still day 6 (23:30 CT) in Chicago.
  const day7Ny = atLocal(LAST_FULL, 7, "00:30", ny);
  assertEquals(rejectQuickWindow(s, day7Ny, ny), null);
  assertEquals(rejectQuickWindow(s, day7Ny, TZ), "no_schedule");
  for (const tz of [null, "", "Not/AZone", undefined]) {
    assertEquals(rejectQuickWindow(s, day7Ny, tz as string | null | undefined), null);
  }
  // Nov 16 00:30 ET is local day 15 in NY, still day 14 (23:30 CT) in Chicago.
  const day15Ny = atLocal(LAST_FULL, 15, "00:30", ny);
  assertEquals(rejectQuickWindow(s, day15Ny, ny), "no_schedule");
  assertEquals(rejectQuickWindow(s, day15Ny, TZ), null);
  for (const tz of [null, "", "Not/AZone", undefined]) {
    assertEquals(rejectQuickWindow(s, day15Ny, tz as string | null | undefined), "no_schedule");
  }
  // Day 14 late evening Eastern is still accepted under the NY fallback.
  assertEquals(rejectQuickWindow(s, atLocal(LAST_FULL, 14, "23:30", ny), null), null);
});

Deno.test("P1-06 v4 guard: second quick check in the same cycle is rejected 400 no_schedule", () => {
  const first = schedAt();
  const afterQuick = {
    ...first,
    next_check_at: first.next_retest_at,
  };
  const day10 = atLocal(LAST_FULL, 10, "12:00", TZ);
  assertEquals(rejectQuickWindow(first, day10, TZ), null);
  assertEquals(rejectQuickWindow(afterQuick, day10, TZ), "no_schedule");
  assertEquals(QUICK_ERRORS.no_schedule, "No quick re-check is scheduled");
});

Deno.test("P1-06 v4 guard: a new full assessment resets the cycle", () => {
  // First cycle: quick already done on day 10.
  const used = { ...schedAt(), next_check_at: scheduleRow("u", "a", LAST_FULL, LAST_FULL).next_retest_at };
  const day10 = atLocal(LAST_FULL, 10, "12:00", TZ);
  assertEquals(rejectQuickWindow(used, day10, TZ), "no_schedule");
  // New full assessment on day 10 of the old cycle starts a new window from that local date.
  const newFullIso = atLocal(LAST_FULL, 10, "12:00", TZ).toISOString();
  const reset = schedAt(newFullIso);
  assertEquals(reset.next_check_at === reset.next_retest_at, false);
  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 0, "12:01", TZ), TZ), "no_schedule");
  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 6, "23:59", TZ), TZ), "no_schedule");
  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 7, "00:00", TZ), TZ), null);
  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 14, "23:30", TZ), TZ), null);
  assertEquals(rejectQuickWindow(reset, atLocal(newFullIso, 15, "00:00", TZ), TZ), "no_schedule");
});
