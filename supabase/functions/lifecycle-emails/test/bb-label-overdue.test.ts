// Stacy eb37962d (BB digest strings): BB digest label "ROM Readiness Score" (BB only; BJJ keeps "Position Readiness Score").
// Next-check line: "Your next check is today." only on the due date itself; 1 or more local days past next_check_at
// shows "Your check is overdue. Take it today." Pure tests: no network, no handler.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { nextCheck } from "../source/logic.ts";
import { brandFor, buildEmail } from "../source/email.ts";
import { SCORE_LABEL } from "../source/score.ts";

const U = "33333333-3333-4333-8333-333333333333";
const links = { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" };
const TZ = "America/New_York";
const OVERDUE = "Your check is overdue. Take it today.";
const TODAY = "Your next check is today.";

function digestFor(sport: string, line: string | null, days: number | null) {
  return {
    kind: "digest" as const, user_id: U, email: "user@example.com", first_name: "Test",
    active_sport: sport, email_id: "lc-digest-2026-11-22", local_date: "2026-11-22", next_check_line: line,
    digest: { score: 84, delta: null, streak: 0, sessions_this_week: 0, days_to_next_check: days },
  };
}
const sched = (next_check_at: string) => ({ last_assessment_id: "a1", last_assessed_at: "2026-07-06T12:00:00Z", next_retest_at: null, next_check_at });

Deno.test("eb37962d BB digest label is ROM Readiness Score", () => {
  assertEquals(SCORE_LABEL.bodybuilding, "ROM Readiness Score");
  const text = buildEmail(digestFor("bodybuilding", null, null), brandFor("bodybuilding"), links, "ROMRx LLC").text;
  assert(text.includes("ROM Readiness Score: 84"), text);
  assertFalse(text.includes("Position Readiness Score"));
});

Deno.test("eb37962d BJJ digest label stays Position Readiness Score", () => {
  assertEquals(SCORE_LABEL.bjj, "Position Readiness Score");
  const text = buildEmail(digestFor("bjj", null, null), brandFor("bjj"), links, "ROMRx LLC").text;
  assert(text.includes("Position Readiness Score: 84"), text);
  assertFalse(text.includes("ROM Readiness Score"));
});

Deno.test("eb37962d due date itself: 'Your next check is today.'", () => {
  // next_check_at 2026-11-22 15:00Z = 10:00 AM ET Nov 22; today Nov 22 local.
  const n = nextCheck(sched("2026-11-22T15:00:00Z"), "2026-11-22", TZ);
  assertEquals(n?.days, 0);
  assertEquals(n?.label, TODAY);
  const text = buildEmail(digestFor("bodybuilding", n!.label, n!.days), brandFor("bodybuilding"), links, "ROMRx LLC").text;
  assert(text.includes(TODAY));
  assertFalse(text.includes(OVERDUE));
});

Deno.test("eb37962d 1 local day overdue: overdue line", () => {
  // next_check_at 2026-11-21 23:30 ET (= 2026-11-22 04:30Z): local date Nov 21, so 1 day overdue on Nov 22 even though the UTC date is Nov 22.
  const n = nextCheck(sched("2026-11-22T04:30:00Z"), "2026-11-22", TZ);
  assertEquals(n?.days, -1);
  assertEquals(n?.label, OVERDUE);
  const text = buildEmail(digestFor("bodybuilding", n!.label, n!.days), brandFor("bodybuilding"), links, "ROMRx LLC").text;
  assert(text.includes(OVERDUE));
  assertFalse(text.includes(TODAY));
});

Deno.test("eb37962d 97 days overdue: overdue line", () => {
  // Nov 22 2026 minus 97 days = Aug 17 2026.
  const n = nextCheck(sched("2026-08-17T16:00:00Z"), "2026-11-22", TZ);
  assertEquals(n?.days, -97);
  assertEquals(n?.label, OVERDUE);
  const text = buildEmail(digestFor("bodybuilding", n!.label, n!.days), brandFor("bodybuilding"), links, "ROMRx LLC").text;
  assert(text.includes(OVERDUE));
  assertFalse(text.includes(TODAY));
  assertFalse(text.includes("in -"));
});
