import { assertEquals } from "jsr:@std/assert@1";
import { type Candidate, checkDueOn, planKind } from "../source/logic.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const created = "2026-10-01T00:00:00Z";
const saved = "2026-10-02T00:00:00Z";

function cand(over: Partial<Omit<Candidate, "pref">> & { pref?: Partial<NonNullable<Candidate["pref"]>> | null } = {}): Candidate {
  const { pref, ...rest } = over;
  return {
    user_id: U1, email: "alex@example.com", full_name: "Alex Rider", active_sport: "bjj", marketing_opt_out: false, deletion_requested: false,
    pref: pref === null ? null : {
      user_id: U1, reminder_time: "08:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
      created_at: created, updated_at: saved,
      retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved, ...pref,
    },
    latest_assessment: { id: "a1", assessed_at: "2026-09-20T12:00:00Z" }, latest_score: 70, previous_score: 66,
    session_dates: [], has_protocol: true, ...rest,
  };
}
const canaryAll = { all: true, canary: new Set<string>() };

// Assessed 2026-10-25 15:00Z = 2026-10-25 10:00 America/Chicago (CST, UTC-6). Day 7 = 2026-11-01, day 14 = 2026-11-08, day 15 = 2026-11-09.
const ASSESSED = "2026-10-25T15:00:00Z";

Deno.test("P1-08 v4: check14 sends on day 14 late local evening and not on day 15", () => {
  // reminder_time 23:00 so 23:20 day 14 and 00:20 day 15 are both inside the 3-hour send window.
  // The day-15 miss is therefore a due-date miss, not a window miss.
  const c = cand({
    latest_assessment: { id: "a-check", assessed_at: ASSESSED },
    pref: { reminder_time: "23:00" },
  });
  const day14Late = new Date("2026-11-09T05:20:00Z"); // 2026-11-08 23:20 CST
  const day15Early = new Date("2026-11-09T06:20:00Z"); // 2026-11-09 00:20 CST
  const p14 = planKind("check14", day14Late, [c], canaryAll);
  assertEquals(p14.due.length, 1, "day 14 23:20 local still sends");
  assertEquals(p14.due[0].email_id, "lc-check14-a-check");
  assertEquals(p14.due[0].local_date, "2026-11-08");
  const p15 = planKind("check14", day15Early, [c], canaryAll);
  assertEquals(p15.due.length, 0, "day 15 00:20 local does not send");
  assertEquals(p15.skipped.not_due, 1);
  // Same boundary via checkDueOn (date only): due through end of local day 14, not day 15.
  assertEquals(checkDueOn("check14", "2026-11-08", c, "America/Chicago"), true);
  assertEquals(checkDueOn("check14", "2026-11-09", c, "America/Chicago"), false);
  // Morning of day 15, inside the default 08:00 window, is also not due.
  const day15Morning = cand({ latest_assessment: { id: "a-check", assessed_at: ASSESSED } });
  assertEquals(planKind("check14", new Date("2026-11-09T14:00:00Z"), [day15Morning], canaryAll).due.length, 0);
  // check7 grace day is unchanged (day 8 still due).
  assertEquals(checkDueOn("check7", "2026-11-02", c, "America/Chicago"), true);
  assertEquals(checkDueOn("check7", "2026-11-03", c, "America/Chicago"), false);
});

Deno.test("P1-08 v4: check7 is skipped when a quick check exists in the current cycle, and sent when none exists or the quick is from a previous cycle", () => {
  const day7 = new Date("2026-11-01T14:00:00Z"); // 08:00 CST
  const day8 = new Date("2026-11-02T14:00:00Z");
  const none = cand({ latest_assessment: { id: "a-check", assessed_at: ASSESSED } });
  const pNone = planKind("check7", day7, [none], canaryAll);
  assertEquals(pNone.due.length, 1, "no quick check: send");
  assertEquals(pNone.due[0].email_id, "lc-check7-a-check");
  assertEquals(pNone.due[0].quick_check_done, false);

  const current = cand({ latest_assessment: { id: "a-check", assessed_at: ASSESSED }, has_quick_check: true });
  const pCur = planKind("check7", day7, [current], canaryAll);
  assertEquals(pCur.due.length, 0, "quick check after the last full assessment: skip");
  assertEquals(pCur.skipped.not_due, 1);
  assertEquals(planKind("check7", day8, [current], canaryAll).due.length, 0, "also skipped on the grace day");

  // Loader sets has_quick_check only when a check_kind=quick row exists AFTER the last full assessment.
  // A quick from a previous cycle (before this full assessment) therefore arrives as has_quick_check: false.
  const prevCycle = cand({
    latest_assessment: { id: "a-new", assessed_at: ASSESSED },
    schedule: { last_assessment_id: "a-new", last_assessed_at: ASSESSED, next_retest_at: "2026-12-06T15:00:00Z", next_check_at: "2026-11-01T15:00:00Z" },
    has_quick_check: false,
  });
  const pPrev = planKind("check7", day7, [prevCycle], canaryAll);
  assertEquals(pPrev.due.length, 1, "quick check from a previous cycle does not skip");
  assertEquals(pPrev.due[0].email_id, "lc-check7-a-new");
  assertEquals(pPrev.due[0].quick_check_done, false);

  // check14 is unchanged: a current-cycle quick check still gets version B, not a skip.
  const day14 = new Date("2026-11-08T15:00:00Z");
  const p14 = planKind("check14", day14, [current], canaryAll);
  assertEquals(p14.due.length, 1);
  assertEquals(p14.due[0].quick_check_done, true);
});
