import { assertEquals } from "jsr:@std/assert@1";
import { CHECK_DAYS, RETEST_DAYS, scheduleFromAssessedAt, scheduleRow } from "./schedule.ts";

Deno.test("P1-07: 42-day retest and 7-day check from assessed_at", () => {
  const s = scheduleFromAssessedAt("2026-10-01T16:00:00.000Z");
  assertEquals(RETEST_DAYS, 42);
  assertEquals(CHECK_DAYS, 7);
  assertEquals(s.next_check_at, "2026-10-08T16:00:00.000Z");
  assertEquals(s.next_retest_at, "2026-11-12T16:00:00.000Z");
});

Deno.test("P1-07: schedule row shape for upsert, no joint list yet", () => {
  const row = scheduleRow(
    "ebfe4f3d-0619-4460-a5f7-08217ea31909",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "2026-11-01T12:00:00.000Z",
    "2026-11-01T12:00:01.000Z",
  );
  assertEquals(row.user_id, "ebfe4f3d-0619-4460-a5f7-08217ea31909");
  assertEquals(row.next_check_at, "2026-11-08T12:00:00.000Z");
  assertEquals(row.next_retest_at, "2026-12-13T12:00:00.000Z");
  assertEquals("check_joints" in row, false);
});
