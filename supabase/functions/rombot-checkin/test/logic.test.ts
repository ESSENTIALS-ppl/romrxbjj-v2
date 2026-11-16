// P1-17 logic tests: send-time fallback order, day 3 timing, branch selection, plan-day and consent gating, stop rules.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { branchFor, type Candidate, DEFAULT_HOUR, DEFAULT_TZ, firstName, isPlanDay, parseReminderHour, plan, PLAN_DAYS, protocolOptedIn, sendTime, shortDate, todayArea, noteContent } from "../source/logic.ts";

import { ALL, ASSESSED, at, cand, U } from "./fixtures.ts";

const MON_730_ET = at("2026-11-16T12:30:00Z");

Deno.test("send-time: reminder_time set wins (stored zone)", () => {
  const s = sendTime({ reminder_time: "07:00", timezone: "America/Los_Angeles" });
  assertEquals(s, { hour: 7, hourSource: "reminder_time", tz: "America/Los_Angeles", tzSource: "stored" });
});
Deno.test("send-time: empty reminder_time with a stored zone gives 9:00 in that zone", () => {
  for (const t of [null, "", "  ", "garbage", "25:00", "13 PM"]) {
    assertEquals(sendTime({ reminder_time: t, timezone: "America/Denver" }), { hour: 9, hourSource: "default_9", tz: "America/Denver", tzSource: "stored" });
  }
});
Deno.test("send-time: empty reminder_time and no zone gives 9:00 America/New_York (no Chicago fallback)", () => {
  assertEquals(sendTime(null), { hour: 9, hourSource: "default_9", tz: "America/New_York", tzSource: "default_ny" });
  assertEquals(sendTime({ reminder_time: null, timezone: "Not/AZone" }), { hour: 9, hourSource: "default_9", tz: "America/New_York", tzSource: "default_ny" });
  assertEquals(DEFAULT_HOUR, 9);
  assertEquals(DEFAULT_TZ, "America/New_York");
});
Deno.test("send-time: a saved 07:00 is the user's choice and is honored (Grant: leave the Settings pre-fill alone)", () => {
  assertEquals(parseReminderHour("07:00"), 7);
  assertEquals(parseReminderHour("8:30 AM"), 8);
  assertEquals(parseReminderHour("12:00 AM"), 0);
  assertEquals(parseReminderHour("07:00:00"), 7);
});
Deno.test("send-time drives the window: 7:30 ET sends for 07:00, not for an empty time (9:00)", () => {
  assertEquals(plan(MON_730_ET, [cand()], ALL).due.length, 1);
  const empty = cand({ pref: { reminder_time: null, timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: "2026-11-13T15:00:00Z" } });
  assertEquals(plan(MON_730_ET, [empty], ALL).skipped, { outside_send_window: 1 });
  assertEquals(plan(at("2026-11-16T14:30:00Z"), [empty], ALL).due[0].send.hourSource, "default_9"); // 9:30 ET
  // No prefs row and no zone: 9:00 New York.
  const noPref = cand({ pref: null });
  assertEquals(plan(at("2026-11-16T13:30:00Z"), [noPref], ALL).skipped, { outside_send_window: 1 }); // 8:30 ET
  const d = plan(at("2026-11-16T14:30:00Z"), [noPref], ALL).due[0];
  assertEquals([d.send.hour, d.send.tz], [9, "America/New_York"]);
  // Stored zone is used for both the hour and the day: 07:00 Los Angeles = 15:00Z on Nov 16.
  const la = cand({ pref: { reminder_time: "07:00", timezone: "America/Los_Angeles", email_reminders: true, protocol_opt_in_at: "2026-11-13T15:00:00Z" } });
  assertEquals(plan(MON_730_ET, [la], ALL).skipped, { outside_send_window: 1 });
  assertEquals(plan(at("2026-11-16T15:30:00Z"), [la], ALL).due.length, 1);
});
Deno.test("day 3 only: local assessment date + 3, nothing on day 2 or day 4", () => {
  assertEquals(plan(at("2026-11-15T12:30:00Z"), [cand()], ALL).skipped, { not_day3: 1 });
  assertEquals(plan(at("2026-11-17T12:30:00Z"), [cand()], ALL).skipped, { not_day3: 1 });
});

Deno.test("branch selection: 0 = A, 1 to 2 = B, 3 or more = C", () => {
  assertEquals([0, 1, 2, 3, 7].map(branchFor), ["A", "B", "B", "C", "C"]);
  const s = (k: number) => Array.from({ length: k }, (_, i) => `2026-11-1${3 + Math.min(i, 2)}T${String(16 + i).padStart(2, "0")}:00:00Z`);
  assertEquals(plan(MON_730_ET, [cand()], ALL).due[0].branch, "A");
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: s(1) })], ALL).due[0].branch, "B");
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: s(2) })], ALL).due[0].branch, "B");
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: ["2026-11-13T16:00:00Z", "2026-11-14T16:00:00Z", "2026-11-15T16:00:00Z"] })], ALL).due[0].branch, "C");
  // Sessions before the assessment do not count.
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: ["2026-11-10T16:00:00Z"] })], ALL).due[0].branch, "A");
});
Deno.test("branch C: skipped after a session in the last 12 hours, and when next_check_at is unknown or not in the future", () => {
  const three = ["2026-11-13T16:00:00Z", "2026-11-14T16:00:00Z", "2026-11-16T03:00:00Z"]; // last one 9.5 h before 12:30Z
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: three })], ALL).skipped, { branch_c_recent_session: 1 });
  const old3 = ["2026-11-13T16:00:00Z", "2026-11-14T16:00:00Z", "2026-11-15T16:00:00Z"];
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: old3, next_check_at: null })], ALL).skipped, { no_next_check: 1 });
  assertEquals(plan(MON_730_ET, [cand({ sessions_since: old3, next_check_at: "2026-11-16T14:00:00Z" })], ALL).skipped, { no_next_check: 1 });
  const ok = plan(MON_730_ET, [cand({ sessions_since: old3 })], ALL).due[0];
  assert(ok.rendered.line1.includes("Your next check is Friday, Nov 20."));
});
Deno.test("{next_check_date} format is Stacy's \"Monday, Dec 28\"", () => {
  assertEquals(shortDate("2026-12-28T15:00:00Z", "America/New_York"), "Monday, Dec 28");
});

Deno.test("plan days are every weekday today", () => {
  assertEquals(PLAN_DAYS, [0, 1, 2, 3, 4, 5, 6]);
  for (let d = 0; d < 7; d++) assert(isPlanDay(d));
  assert(!isPlanDay(7) && !isPlanDay(-1));
  assert(!isPlanDay(1, [2, 4]));
});
Deno.test("Q4: the in-app note goes to every eligible Base user whatever their email opt-in, marketing setting, address or brand", () => {
  for (const over of [
    {}, { pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: null } },
    { pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: false, protocol_opt_in_at: null } },
    { marketing_opt_out: true }, { email: null }, { active_sport: "bjj" },
  ] as Partial<Candidate>[]) assertEquals(plan(MON_730_ET, [cand(over)], ALL).due.length, 1, JSON.stringify(over));
  assert(!protocolOptedIn(null));
});
Deno.test("stop rules: audience, Base active, test account, deletion, first full assessment only, red flag, plan, recent ROMBot message", () => {
  const sk = (over: Partial<Candidate>, opts = ALL) => plan(MON_730_ET, [cand(over)], opts).skipped;
  assertEquals(sk({}, { all: false, canary: new Set() }), { not_audience: 1 });
  assertEquals(plan(MON_730_ET, [cand()], { all: false, canary: new Set([U]) }).due.length, 1);
  assertEquals(sk({ base_status: "inactive" }), { not_base_active: 1 });
  assertEquals(sk({ base_status: null }), { not_base_active: 1 });
  assertEquals(sk({ is_test: true }), { test_account: 1 });
  assertEquals(sk({ deletion_requested: true }), { deletion_requested: 1 });
  assertEquals(sk({ full_assessments: [] }), { no_assessment: 1 });
  assertEquals(sk({ full_assessments: [{ id: "b", assessed_at: ASSESSED, red_flag_triggered: false }, { id: "c", assessed_at: "2026-10-01T14:00:00Z", red_flag_triggered: false }] }), { not_first_assessment: 1 });
  assertEquals(sk({ full_assessments: [{ id: "b", assessed_at: ASSESSED, red_flag_triggered: true }] }), { red_flag: 1 });
  assertEquals(sk({ ranked_joint_keys: [] }), { no_plan: 1 });
  assertEquals(sk({ ranked_joint_keys: ["lumbar_flex"] }), { no_plan: 1 });
  assertEquals(sk({ last_user_message_at: "2026-11-15T20:00:00Z" }), { recent_rombot_message: 1 });
  assertEquals(plan(MON_730_ET, [cand({ last_user_message_at: "2026-11-15T11:00:00Z" })], ALL).due.length, 1);
});
Deno.test("today_area follows MyProtocol ROTATION on the user's local weekday, body part names only", () => {
  const r = ["hip_ir", "shoulder_flex", "cervical_rot"];
  assertEquals([0, 1, 2, 3, 4, 5, 6].map((d) => todayArea(r, d)), ["hips", "hips", "shoulders", "neck", "hips", "shoulders", "neck"]);
  assertEquals(todayArea(["ankle_df"], 3), "ankles"); // shorter list: last item
  assertEquals(todayArea(["thoracic_rot"], 1), null);
});
Deno.test("first name: plain first word only, else the no-name copy (HTML-safe for ROMBot.tsx)", () => {
  assertEquals(firstName("Sam Lee"), "Sam");
  assertEquals(firstName("  José  "), "José");
  assertEquals(firstName("O'Neil"), "O'Neil");
  for (const bad of [null, "", "user@example.com", "<b>x</b>", "12345", "a&b"]) assertEquals(firstName(bad), null);
  const p = plan(MON_730_ET, [cand({ full_name: "<img src=x>" })], ALL).due[0];
  assert(p.rendered.line1.startsWith("Hey there, ROMBot here."));
  assert(!/[<>&]/.test(noteContent(p.rendered)));
});
Deno.test("note claim id: one note per assessment", () => {
  assertEquals(plan(MON_730_ET, [cand()], ALL).due[0].note_id, "checkin-d3-aaaaaaaa-0000-4000-8000-000000000001");
});
