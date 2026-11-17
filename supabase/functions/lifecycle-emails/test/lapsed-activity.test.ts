// Lapsed fix (Grant 9:06 PM ET Nov 16 2026): "lapsed" is measured from the LATEST app activity
// (newest web product_event, session activity when loaded, sign-in, logged sessions, assessments), never last_sign_in_at alone.
// Threshold unchanged from v4: LAPSED_DAYS 14, LAPSED_GRACE_DAYS 3.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { type Candidate, LAPSED_DAYS, LAPSED_GRACE_DAYS, lapsedDueOn, planKind } from "../source/logic.ts";
import { type Deps, handle } from "../source/handler.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const saved = "2026-10-02T00:00:00Z";
const NY = "America/New_York";
const canaryAll = { all: true, canary: new Set<string>() };

// Shape of the reported case (dates only): sign-in Nov 3, last logged session Oct 28, last full assessment Jul 6,
// reminder 07:00 New York, web page_view at 8:34 PM ET Nov 16 (01:34Z Nov 17).
function jimShape(over: Partial<Candidate> = {}): Candidate {
  return {
    user_id: U1, email: "user@example.com", full_name: "Test User", active_sport: "general", marketing_opt_out: false, deletion_requested: false,
    pref: {
      user_id: U1, reminder_time: "07:00", timezone: NY, retest_reminders: true, email_reminders: true, weekly_digest: true,
      created_at: "2026-10-01T00:00:00Z", updated_at: saved, retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved,
    },
    latest_assessment: { id: "a-jul", assessed_at: "2026-07-06T14:00:00Z" }, latest_score: 70, previous_score: null,
    session_dates: ["2026-10-28"], has_protocol: true, schedule: null,
    last_sign_in_at: "2026-11-03T15:00:00Z",
    ...over,
  };
}
// Tue Nov 17 2026 7:30 AM ET (12:30Z): inside the 07:00 send window, and exactly day 14 after the Nov 3 sign-in.
const TUE_730_ET = new Date("2026-11-17T12:30:00Z");

Deno.test("threshold unchanged from v4: 14 days, 3 grace days", () => {
  assertEquals(LAPSED_DAYS, 14);
  assertEquals(LAPSED_GRACE_DAYS, 3);
});

Deno.test("v4 behaviour reproduced: sign-in Nov 3 and no app-activity field = lapsed due Tue Nov 17 (the bug's input)", () => {
  assertEquals(planKind("lapsed", TUE_730_ET, [jimShape()], canaryAll).due.length, 1);
});

Deno.test("Jim's case: old last_sign_in_at, web product_event last night = NO lapsed email", () => {
  const c = jimShape({ last_app_event_at: "2026-11-17T01:34:03.365131+00:00" });
  const p = planKind("lapsed", TUE_730_ET, [c], canaryAll);
  assertEquals(p.due.length, 0);
  assertEquals(p.skipped.not_due, 1);
  // Not due through the whole old window either (Nov 17-20), and next possible date is Nov 30 (Nov 16 + 14).
  for (const d of ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-29"]) assertFalse(lapsedDueOn(d, c, NY), d);
  assert(lapsedDueOn("2026-11-30", c, NY));
});

Deno.test("product_event today (same local day) = no lapsed email", () => {
  const c = jimShape({ last_app_event_at: "2026-11-17T12:00:00Z" });
  assertEquals(planKind("lapsed", TUE_730_ET, [c], canaryAll).due.length, 0);
});

Deno.test("truly lapsed: no activity of any kind past the threshold still gets it (day 14 through day 17, not day 13 or 18)", () => {
  // Everything on or before Nov 3 (local), product_event Nov 2 ET.
  const c = jimShape({ last_app_event_at: "2026-11-02T22:00:00Z", last_session_at: "2026-11-01T12:00:00Z" });
  assertFalse(lapsedDueOn("2026-11-16", c, NY), "day 13");
  for (const d of ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]) assert(lapsedDueOn(d, c, NY), d);
  assertFalse(lapsedDueOn("2026-11-21", c, NY), "day 18");
  const p = planKind("lapsed", TUE_730_ET, [c], canaryAll);
  assertEquals(p.due.length, 1);
  // email_id unchanged from v4 (keyed to the last logged session / assessment date).
  assertEquals(p.due[0].email_id, "lc-lapsed-2026-10-28");
});

Deno.test("session-refresh-only activity: a recent session (no product_event) = no lapsed email", () => {
  const c = jimShape({ last_app_event_at: null, last_session_at: "2026-11-16T20:31:05Z" });
  assertEquals(planKind("lapsed", TUE_730_ET, [c], canaryAll).due.length, 0);
  assertFalse(lapsedDueOn("2026-11-17", c, NY));
});

Deno.test("no product_events at all: falls back to sessions, assessment and sign-in exactly like v4", () => {
  // No events and old sign-in: same answer as v4 (due on day 14 after the sign-in).
  assert(lapsedDueOn("2026-11-17", jimShape({ last_app_event_at: null }), NY));
  // No events, no sign-in: quiet counted from the last logged session (Oct 28 + 14 = Nov 11).
  const noSignIn = jimShape({ last_app_event_at: null, last_sign_in_at: null });
  assert(lapsedDueOn("2026-11-11", noSignIn, NY));
  assertFalse(lapsedDueOn("2026-11-10", noSignIn, NY));
});

Deno.test("latest of the activity sources wins, in the user's own timezone", () => {
  // 03:30Z Nov 17 is still Nov 16 in New York; due = Nov 30, not Dec 1.
  const c = jimShape({ last_app_event_at: "2026-11-17T03:30:00Z", last_session_at: "2026-11-10T12:00:00Z", last_sign_in_at: "2026-11-03T15:00:00Z" });
  assertFalse(lapsedDueOn("2026-11-29", c, NY));
  assert(lapsedDueOn("2026-11-30", c, NY));
  // Session newer than event: session wins.
  const s = jimShape({ last_app_event_at: "2026-11-05T12:00:00Z", last_session_at: "2026-11-12T12:00:00Z" });
  assertFalse(lapsedDueOn("2026-11-25", s, NY));
  assert(lapsedDueOn("2026-11-26", s, NY));
  // Garbage timestamps are ignored, not fatal.
  assert(lapsedDueOn("2026-11-17", jimShape({ last_app_event_at: "not-a-date", last_session_at: "" }), NY));
});

Deno.test("activity read failed: lapsed fails closed (not sent this run); other kinds unaffected", () => {
  const c = jimShape({ activity_read_failed: true });
  assertFalse(lapsedDueOn("2026-11-17", c, NY));
  assertEquals(planKind("lapsed", TUE_730_ET, [c], canaryAll).due.length, 0);
  // protocol on the same user still plans (no session logged today).
  assertEquals(planKind("protocol", TUE_730_ET, [c], canaryAll).due.length, 1);
});

Deno.test("handler dry run: Jim-shaped user with a recent product_event plans no lapsed email", async () => {
  const deps: Deps = {
    env: (k) => ({ LIFECYCLE_AUDIENCE: "all" } as Record<string, string>)[k],
    cronOk: () => Promise.resolve(true), now: () => TUE_730_ET,
    load: () => Promise.resolve([jimShape({ last_app_event_at: "2026-11-17T01:34:03Z" })]),
    claim: () => { throw new Error("no claim in dry run"); }, release: () => Promise.resolve(), send: () => { throw new Error("no send in dry run"); },
  };
  const r = await (await handle(new Request("https://x/functions/v1/lifecycle-emails?kind=lapsed"), deps)).json();
  assertEquals(r.dry_run, true);
  assertEquals(r.kinds.lapsed.due.length, 0);
});

Deno.test("loader (index.ts): newest WEB product_event, one row, newest first, by user; failure marks activity_read_failed", async () => {
  const src = await Deno.readTextFile(new URL("../source/index.ts", import.meta.url));
  const line = src.split("\n").find((l) => l.includes('from("product_events")')) ?? "";
  assert(line.includes('.select("created_at")'), "select created_at");
  assert(line.includes('.eq("user_id", p.user_id)'), "per user");
  assert(line.includes('.eq("source", "web")'), "web only");
  assert(line.includes('.order("created_at", { ascending: false })'), "newest first");
  assert(line.includes(".limit(1)"), "one row");
  assert(src.includes("if (evErr) activityReadFailed = true;"), "error fails closed");
  assert(src.includes("} catch { activityReadFailed = true; }"), "throw fails closed");
  assert(src.includes("last_app_event_at: lastAppEvent, activity_read_failed: activityReadFailed"), "passed to candidate");
});
