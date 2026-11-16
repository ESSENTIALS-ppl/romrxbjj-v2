// P1-17 Q3 (Grant, Nov 16): the email fallback waits at least 24 h after the in-app note, goes at the user's send hour on a
// plan day, only with no app activity since the note (session save, assessment of any kind, ROMBot message), and only to
// P1-01 opt-ins (plus marketing opt-out, address and Base brand gates). At most one email per note.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Candidate, EMAIL_MAX_WAIT_HOURS, EMAIL_MIN_WAIT_HOURS, planEmails } from "../source/logic.ts";
import { ALL, at, cand } from "./fixtures.ts";

// Note written Mon Nov 16, 2026 at 7:30:05 AM ET (12:30:05Z) by the 12:30Z run. Reminder 07:00 ET, window 7:00 to 9:59 ET.
const NOTE_AT = "2026-11-16T12:30:05Z";
const AID = "aaaaaaaa-0000-4000-8000-000000000001";
const noted = (over: Partial<Candidate> = {}) => cand({ note: { assessment_id: AID, branch: "A", at: NOTE_AT }, email_already: false, last_session_at: null, last_any_assessment_at: "2026-11-13T14:00:00Z", ...over });
const plus = (h: number, m = 0) => new Date(Date.parse(NOTE_AT) + h * 3600000 + m * 60000);

Deno.test("constants: wait at least 24 h, window closes 72 h after the note", () => {
  assertEquals([EMAIL_MIN_WAIT_HOURS, EMAIL_MAX_WAIT_HOURS], [24, 72]);
});
Deno.test("23h59m after the note: no send (too_soon), even at the reminder hour", () => {
  const p = planEmails(plus(23, 59), [noted()], ALL);
  assertEquals([p.due.length, p.skipped], [0, { too_soon: 1 }]);
});
Deno.test("24 h+ after the note with no activity, at the reminder hour on a plan day: send, branch A words for today", () => {
  const p = planEmails(plus(24, 1), [noted()], ALL); // Tue 7:31 AM ET
  assertEquals(p.due.length, 1);
  const d = p.due[0];
  assertEquals([d.email_id, d.email, d.branch], [`checkin-d3-email-${AID}`, "user@example.com", "A"]);
  assert(d.rendered.line1.includes("Today's focus is your shoulders.")); // Tuesday: ROTATION[2] = 1 -> shoulder_flex
  assert(d.note_age_hours >= 24);
});
Deno.test("the hourly run that lands 1 s short of 24 h waits, and the next run in the window sends", () => {
  assertEquals(planEmails(at("2026-11-17T12:30:00Z"), [noted()], ALL).skipped, { too_soon: 1 });
  assertEquals(planEmails(at("2026-11-17T13:30:00Z"), [noted()], ALL).due.length, 1);
});
Deno.test("activity since the note, each kind: no send, ever", () => {
  const t = new Date(Date.parse(NOTE_AT) + 3600000).toISOString();
  const cases: [Partial<Candidate>, string][] = [
    [{ last_session_at: t }, "activity_session"],
    [{ sessions_since: [t] }, "activity_session"],
    [{ last_any_assessment_at: t }, "activity_assessment"], // quick check (full list unchanged)
    [{ full_assessments: [{ id: "new", assessed_at: t, red_flag_triggered: false }, { id: AID, assessed_at: "2026-11-13T14:00:00Z", red_flag_triggered: false }], last_any_assessment_at: t }, "activity_assessment"],
    [{ last_user_message_at: t }, "activity_rombot_message"],
  ];
  for (const [over, why] of cases) {
    const p = planEmails(plus(24, 30), [noted(over)], ALL);
    assertEquals([p.due.length, p.skipped], [0, { [why]: 1 }], JSON.stringify(over));
  }
  // Activity before the note does not block.
  assertEquals(planEmails(plus(24, 30), [noted({ last_user_message_at: "2026-11-15T11:00:00Z", last_session_at: "2026-11-10T11:00:00Z" })], ALL).due.length, 1);
});
Deno.test("wrong hour: waits (outside_send_window), then sends at the next day's reminder hour inside 72 h", () => {
  assertEquals(planEmails(plus(26, 30), [noted()], ALL).skipped, { outside_send_window: 1 }); // Tue 10:00 AM ET
  assertEquals(planEmails(plus(48, 30), [noted()], ALL).due.length, 1); // Wed 8:00 AM ET
});
Deno.test("non-plan day: waits (not_plan_day), then sends on the next plan day at the reminder hour", () => {
  const tueOff = { ...ALL, planDays: [0, 1, 3, 4, 5, 6] }; // Tuesday (2) not a plan day
  assertEquals(planEmails(plus(24, 30), [noted()], tueOff).skipped, { not_plan_day: 1 });
  const wed = planEmails(plus(48, 30), [noted()], tueOff);
  assertEquals(wed.due.length, 1);
  assert(wed.due[0].rendered.line1.includes("Today's focus is your neck.")); // Wednesday: ROTATION[3] = 2 -> cervical_rot
});
Deno.test("window closes: more than 72 h after the note, no send", () => {
  assertEquals(planEmails(plus(72, 30), [noted()], ALL).skipped, { email_expired: 1 });
});
Deno.test("at most one email per note: email_already skips", () => {
  assertEquals(planEmails(plus(24, 30), [noted({ email_already: true })], ALL).skipped, { email_already: 1 });
});
Deno.test("no note yet: nothing planned and nothing counted", () => {
  const p = planEmails(plus(24, 30), [cand()], ALL);
  assertEquals([p.due.length, p.skipped], [0, {}]);
});
Deno.test("every other gate stays: P1-01 opt-in, marketing opt-out, address, Base brand, audience, Base active, test, deletion", () => {
  const cases: [Partial<Candidate>, string][] = [
    [{ pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: null } }, "not_opted_in"],
    [{ pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: false, protocol_opt_in_at: "2026-11-13T15:00:00Z" } }, "not_opted_in"],
    [{ pref: null }, "not_opted_in"],
    [{ marketing_opt_out: true }, "marketing_opt_out"],
    [{ email: null }, "no_email"],
    [{ active_sport: "bjj" }, "not_base_brand"],
    [{ active_sport: "bodybuilding" }, "not_base_brand"],
    [{ base_status: "inactive" }, "not_base_active"],
    [{ is_test: true }, "test_account"],
    [{ deletion_requested: true }, "deletion_requested"],
  ];
  for (const [over, why] of cases) assertEquals(planEmails(plus(24, 30), [noted(over)], ALL).skipped, { [why]: 1 }, JSON.stringify(over));
  assertEquals(planEmails(plus(24, 30), [noted()], { all: false, canary: new Set() }).skipped, { not_audience: 1 });
});
Deno.test("send hour rule is the note's: empty reminder_time and no zone means 9:00 New York", () => {
  const c = noted({ pref: { reminder_time: null, timezone: null, email_reminders: true, protocol_opt_in_at: "2026-11-13T15:00:00Z" } });
  assertEquals(planEmails(at("2026-11-17T13:30:00Z"), [c], ALL).skipped, { outside_send_window: 1 }); // 8:30 ET
  const d = planEmails(at("2026-11-17T14:30:00Z"), [c], ALL).due[0]; // 9:30 ET
  assertEquals([d.send.hour, d.send.tz], [9, "America/New_York"]);
});
