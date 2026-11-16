import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { buildIcs, fold, parseReminderTime } from "./ics.ts";
import { handle, type Deps } from "./handler.ts";

Deno.test("P1-12 parseReminderTime", () => {
  assertEquals(parseReminderTime("08:30"), { hour: 8, minute: 30 });
  assertEquals(parseReminderTime("8:30 AM"), { hour: 8, minute: 30 });
  assertEquals(parseReminderTime("7:00 PM"), { hour: 19, minute: 0 });
  assertEquals(parseReminderTime("bad"), { hour: 9, minute: 0 });
});

Deno.test("P1-12 ics has weekly protocol days, check and retest, no scores", () => {
  const ics = buildIcs({
    timezone: "America/New_York",
    reminder_time: "07:00",
    next_check_at: "2026-11-22T12:00:00.000Z",
    next_retest_at: "2026-12-27T12:00:00.000Z",
    now: new Date("2026-11-15T18:00:00Z"),
  });
  assert(ics.startsWith("BEGIN:VCALENDAR"));
  assert(ics.includes("RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA"));
  assert(ics.includes("DTSTART;TZID=America/New_York:20261115T070000"));
  assert(ics.includes("SUMMARY:ROMRx protocol session"));
  assert(ics.includes("SUMMARY:ROMRx check-in"));
  assert(ics.includes("SUMMARY:ROMRx 6-week retest"));
  assert(ics.includes("DTSTART;TZID=America/New_York:20261122T070000"));
  assert(ics.includes("DTSTART;TZID=America/New_York:20261227T070000"));
  assertFalse(/score|PRS|hip|shoulder|joint/i.test(ics));
  assert(ics.includes("\r\n"));
});

Deno.test("P1-12 handler: 401 without auth, 200 ics with user, missing schedule still returns weekly events", async () => {
  const U = "ebfe4f3d-0619-4460-a5f7-08217ea31909";
  const d: Deps = {
    origins: () => ({ "Access-Control-Allow-Origin": "https://romrx.io" }),
    now: () => new Date("2026-11-15T18:00:00Z"),
    userId: async (req) => req.headers.get("Authorization")?.includes("good") ? U : null,
    pref: async () => ({ reminder_time: "09:00", timezone: "America/Chicago" }),
    schedule: async () => { throw new Error("relation does not exist"); },
  };
  const noAuth = await handle(new Request("https://x/calendar-ics", { method: "GET" }), d);
  assertEquals(noAuth.status, 401);
  const ok = await handle(new Request("https://x/calendar-ics", { method: "GET", headers: { Authorization: "Bearer good" } }), d);
  assertEquals(ok.status, 200);
  assertEquals(ok.headers.get("Content-Type"), "text/calendar; charset=utf-8");
  const body = await ok.text();
  assert(body.includes("SUMMARY:ROMRx protocol session"));
  assertFalse(body.includes("SUMMARY:ROMRx check-in"));
});

Deno.test("P1-12 ics is valid for Google Calendar and Apple Calendar (RFC 5545 + ical.js)", async () => {
  const ics = buildIcs({
    timezone: "America/New_York",
    reminder_time: "07:00",
    next_check_at: "2026-11-22T12:00:00.000Z",
    next_retest_at: "2026-12-27T12:00:00.000Z",
    now: new Date("2026-11-15T18:00:00Z"),
  });

  // CRLF line endings throughout; file ends with CRLF
  assert(ics.includes("\r\n"));
  assert(ics.endsWith("\r\n"));
  assertFalse(/\n/.test(ics.replaceAll("\r\n", "")), "no bare LF");

  const rawLines = ics.split("\r\n");
  assertEquals(rawLines[rawLines.length - 1], ""); // trailing CRLF
  const lines = rawLines.slice(0, -1);

  // 75-octet folding: each line is at most 75 octets; continuation lines start with a space
  for (const line of lines) {
    const octets = new TextEncoder().encode(line).length;
    assert(octets <= 75, `line exceeds 75 octets (${octets}): ${line.slice(0, 80)}`);
  }
  const long = "DESCRIPTION:" + "A".repeat(200);
  const folded = fold(long);
  assert(folded.includes("\r\n "));
  for (const line of folded.split("\r\n")) {
    assert(new TextEncoder().encode(line).length <= 75);
  }
  assert(folded.startsWith("DESCRIPTION:" + "A".repeat(75 - "DESCRIPTION:".length)));

  // Required VCALENDAR / VEVENT properties
  assertEquals(lines[0], "BEGIN:VCALENDAR");
  assert(lines.includes("END:VCALENDAR"));
  assert(lines.includes("VERSION:2.0"));
  assert(lines.some((l) => l.startsWith("PRODID:")));
  assert(lines.includes("BEGIN:VTIMEZONE"));
  assert(lines.includes("END:VTIMEZONE"));
  assert(lines.some((l) => l === "TZID:America/New_York" || l.startsWith("TZID:America/New_York")));
  const events: string[][] = [];
  let cur: string[] | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = [];
    else if (line === "END:VEVENT") { events.push(cur!); cur = null; }
    else if (cur) cur.push(line);
  }
  assert(events.length >= 1);
  for (const ev of events) {
    assert(ev.some((l) => l.startsWith("UID:")), "VEVENT UID");
    assert(ev.some((l) => l.startsWith("DTSTAMP:")), "VEVENT DTSTAMP");
    assert(ev.some((l) => l.startsWith("DTSTART")), "VEVENT DTSTART");
    const start = ev.find((l) => l.startsWith("DTSTART"))!;
    // TZID present together with a VTIMEZONE, or UTC Z
    const tzid = start.includes("TZID=") || start.endsWith("Z") || /DTSTART:\d{8}T\d{6}Z$/.test(start);
    assert(tzid, `DTSTART must use TZID or UTC Z: ${start}`);
    if (start.includes("TZID=")) assert(lines.includes("BEGIN:VTIMEZONE"));
  }

  // Parser check (ical.js): Google/Apple consume the same iCalendar object model
  const ICAL = (await import("npm:ical.js@2.2.1")).default;
  const jcal = ICAL.parse(ics);
  const comp = new ICAL.Component(jcal);
  assertEquals(comp.name, "vcalendar");
  assertEquals(comp.getFirstPropertyValue("version"), "2.0");
  assert(comp.getFirstPropertyValue("prodid"));
  const vtz = comp.getFirstSubcomponent("vtimezone");
  assert(vtz, "VTIMEZONE present");
  assertEquals(vtz.getFirstPropertyValue("tzid"), "America/New_York");
  const vevents = comp.getAllSubcomponents("vevent");
  assertEquals(vevents.length, 3);
  for (const ev of vevents) {
    assert(ev.getFirstPropertyValue("uid"));
    assert(ev.getFirstPropertyValue("dtstamp"));
    const dt = ev.getFirstPropertyValue("dtstart");
    assert(dt, "parsed DTSTART");
  }
});

Deno.test("P1-12 fold counts octets (multibyte), never splits a character, unfolds back exactly", () => {
  const line = "DESCRIPTION:" + "é".repeat(60) + "✓".repeat(20);
  const folded = fold(line);
  const enc = new TextEncoder();
  for (const l of folded.split("\r\n")) assert(enc.encode(l).length <= 75, `octets ${enc.encode(l).length}`);
  assertEquals(folded.replace(/\r\n /g, ""), line);
  assertEquals(fold("SHORT:ascii"), "SHORT:ascii");
});

Deno.test("P1-12 after the day-8 roll or a quick check (next_check_at = next_retest_at): retest only, no duplicate check-in", () => {
  const ics = buildIcs({
    timezone: "America/New_York", reminder_time: "07:00",
    next_check_at: "2026-12-13T12:00:00.000Z", next_retest_at: "2026-12-13T12:00:00.000Z",
    now: new Date("2026-11-15T18:00:00Z"),
  });
  assertFalse(ics.includes("UID:romrx-check@romrx.io"));
  assert(ics.includes("UID:romrx-retest@romrx.io"));
  assertEquals(ics.split("BEGIN:VEVENT").length - 1, 2);
});
