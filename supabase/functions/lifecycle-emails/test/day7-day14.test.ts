import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { type Candidate, explicitOn, planKind, quickCheckDone } from "../source/logic.ts";
import { BRANDS, buildEmail, copyFor } from "../source/email.ts";

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

Deno.test("P1-08 check7 and check14: due on the local due date and one grace day, once per assessment", () => {
  // Assessed local Chicago 2026-10-25. Day 7 = 2026-11-01, day 14 = 2026-11-08.
  const c = cand({ latest_assessment: { id: "a-check", assessed_at: "2026-10-25T15:00:00Z" } });
  const day7 = new Date("2026-11-01T14:00:00Z"); // 08:00 CST
  const day8 = new Date("2026-11-02T14:00:00Z");
  const day9 = new Date("2026-11-03T14:00:00Z");
  const day14 = new Date("2026-11-08T15:00:00Z"); // 09:00 CST, inside the 08:00 3h window
  const p7 = planKind("check7", day7, [c], canaryAll);
  assertEquals(p7.due.length, 1);
  assertEquals(p7.due[0].email_id, "lc-check7-a-check");
  assertEquals(planKind("check7", day8, [c], canaryAll).due.length, 1);
  assertEquals(planKind("check7", day9, [c], canaryAll).due.length, 0);
  assertEquals(planKind("check14", day7, [c], canaryAll).due.length, 0);
  assertEquals(planKind("check14", day14, [c], canaryAll).due[0]?.email_id, "lc-check14-a-check");
  assert(explicitOn(c.pref!, "check7") && explicitOn(c.pref!, "check14"));
  // default-on, no retest marker: nothing (live explicitOn; stands without the P1-02 audience rewrite)
  const unmarked = cand({ pref: { retest_opt_in_at: null }, latest_assessment: { id: "a-check", assessed_at: "2026-10-25T15:00:00Z" } });
  assertEquals(planKind("check7", day7, [unmarked], canaryAll).due.length, 0);
});
Deno.test("P1-08 check7 counts from the schedule's last full assessment when present", () => {
  const c = cand({
    latest_assessment: { id: "a-old", assessed_at: "2026-09-01T15:00:00Z" },
    schedule: { last_assessment_id: "a-new", last_assessed_at: "2026-10-25T15:00:00Z", next_retest_at: "2026-12-06T15:00:00Z", next_check_at: "2026-11-01T15:00:00Z" },
  });
  const day7 = new Date("2026-11-01T14:00:00Z");
  const p = planKind("check7", day7, [c], canaryAll);
  assertEquals(p.due.length, 1);
  assertEquals(p.due[0].email_id, "lc-check7-a-new");
});
Deno.test("P1-08 v2: P1-07 roll / quick check (next_check_at = next_retest_at) does not move check7 or flip day-14 to version B", () => {
  // Assessed 2026-10-25 local Chicago; rolled schedule: next_check_at = next_retest_at = day 42 (2026-12-06).
  const rolled = { last_assessment_id: "a-r", last_assessed_at: "2026-10-25T15:00:00Z", next_retest_at: "2026-12-06T15:00:00Z", next_check_at: "2026-12-06T15:00:00Z" };
  const c = cand({ latest_assessment: { id: "a-r", assessed_at: "2026-10-25T15:00:00Z" }, schedule: rolled });
  assertEquals(planKind("check7", new Date("2026-11-01T14:00:00Z"), [c], canaryAll).due.length, 1, "day 7 still due");
  assertEquals(planKind("check7", new Date("2026-11-02T14:00:00Z"), [c], canaryAll).due.length, 1, "day 8 grace kept");
  assertEquals(planKind("check7", new Date("2026-12-06T14:00:00Z"), [c], canaryAll).due.length, 0, "not on the retest day");
  const d14 = new Date("2026-11-08T15:00:00Z");
  assertEquals(quickCheckDone(c), false, "roll alone is not a quick check");
  assertEquals(planKind("check14", d14, [c], canaryAll).due[0]?.quick_check_done, false);
  const q = cand({ latest_assessment: { id: "a-r", assessed_at: "2026-10-25T15:00:00Z" }, schedule: rolled, has_quick_check: true });
  assertEquals(quickCheckDone(q), true, "real quick row after the full assessment = version B");
  assertEquals(planKind("check14", d14, [q], canaryAll).due[0]?.quick_check_done, true);
});
Deno.test("P1-08 Stacy final words: day 7, day 14 A and B, exact subjects and lines, no scores or em dash", () => {
  const links = { offKind: "https://romrx.io/app/unsubscribe?t=k", offAll: "https://romrx.io/app/unsubscribe?t=a", oneClick: "https://example.com/unsub" };
  const postal = "ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774";
  const baseDue = { user_id: U1, email: "alex@example.com", first_name: "Alex", active_sport: "general", email_id: "lc-x", local_date: "2026-11-08" };
  const d7 = buildEmail({ ...baseDue, kind: "check7", retest_date: "Sunday, December 27" }, BRANDS.base, links, postal);
  assertEquals(d7.subject, "Your ROMRx quick check is ready");
  assertEquals(copyFor({ ...baseDue, kind: "check7", retest_date: "Sunday, December 27" }).preheader, "See your day 1 results next to today's.");
  assert(d7.text.includes("It has been a week since your ROMRx assessment. Your quick check is ready."));
  assert(d7.text.includes("It re-measures 1 or 2 of your focus areas and shows them next to your day 1 results."));
  assert(d7.text.includes("Your full retest is still at 6 weeks, on Sunday, December 27."));
  assert(d7.text.includes("Start my quick check: https://romrx.io/app/dashboard/quick-check"));
  assert(d7.text.includes("You're getting this because Check reminders is on in your ROMRx settings."));
  assert(d7.text.includes("Turn off check reminders"));
  assert(d7.text.includes("Turn off all ROMRx emails except account and billing notices"));
  assert(d7.text.includes(postal));
  assert(d7.text.includes("jim@romrxbjj.com"));
  assert(d7.text.includes("This message was sent to alex@example.com."));

  const d14a = buildEmail({ ...baseDue, kind: "check14", retest_date: "Sunday, December 27", quick_check_done: false }, BRANDS.base, links, postal);
  assertEquals(d14a.subject, "Your quick check is waiting");
  assertEquals(copyFor({ ...baseDue, kind: "check14", quick_check_done: false }).preheader, "Two weeks in. See where you are now.");
  assert(d14a.text.includes("It has been two weeks since your ROMRx assessment. Your quick check is ready when you are."));
  assert(d14a.text.includes("It shows your day 1 results next to today's for 1 or 2 of your focus areas."));
  assert(d14a.text.includes("Your full retest is on Sunday, December 27."));
  assert(d14a.text.includes("Start my quick check: https://romrx.io/app/dashboard/quick-check"));

  const d14b = buildEmail({ ...baseDue, kind: "check14", next_check_date: "Sunday, December 27", quick_check_done: true }, BRANDS.base, links, postal);
  assertEquals(d14b.subject, "Two weeks of ROMRx");
  assertEquals(copyFor({ ...baseDue, kind: "check14", quick_check_done: true }).preheader, "Your next check date is set.");
  assert(d14b.text.includes("You did your quick check. Nice work."));
  assert(d14b.text.includes("Your next check: Sunday, December 27"));
  assert(d14b.text.includes("Until then, your plan is ready each day in the app."));
  assert(d14b.text.includes("Open today's session: https://romrx.io/app/dashboard/my-protocol"));

  for (const s of [d7.subject, d7.text, d14a.subject, d14a.text, d14b.subject, d14b.text]) {
    assertFalse(/score|PRS|hip|shoulder|\bjoint\b/i.test(s), s);
    assertFalse(s.includes("\u2014"), "em dash");
  }
  assertEquals(BRANDS.base.from, "Jim Scott <jim@romrxbjj.com>");
});
