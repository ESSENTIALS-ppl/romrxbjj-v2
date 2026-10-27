import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildMoodBlockForUser, moodEmailAllowed, moodWindowStart, renderMoodBlock, summarizeMood, ROMOOD_CONSENT_VERSION } from "./mood_block.ts";

const ok = { saving_on: true, opted_in_at: "2026-10-26T12:00:00Z", consent_version: ROMOOD_CONSENT_VERSION };

Deno.test("gate: env flag, saving on, valid tick, current consent all required", () => {
  assert(moodEmailAllowed("on", ok));
  assert(!moodEmailAllowed(undefined, ok));
  assert(!moodEmailAllowed("off", ok));
  assert(!moodEmailAllowed("on", null));
  assert(!moodEmailAllowed("on", { ...ok, saving_on: false }));
  assert(!moodEmailAllowed("on", { ...ok, opted_in_at: null }));
  assert(!moodEmailAllowed("on", { ...ok, opted_in_at: "not a date" }));
  assert(!moodEmailAllowed("on", { ...ok, consent_version: null }), "old opt-ins need re-consent");
  assert(!moodEmailAllowed("on", { ...ok, consent_version: "v1" }));
});

Deno.test("summary: count and rounded averages; empty is null", () => {
  assertEquals(summarizeMood([]), null);
  assertEquals(summarizeMood([{ energy: 10, pleasantness: 20 }, { energy: 21, pleasantness: 31 }]), { count: 2, energyAvg: 16, pleasantAvg: 26 });
});

Deno.test("window: later of previous assessment and opt-in tick", () => {
  assertEquals(moodWindowStart(null, "2026-10-01T00:00:00Z"), "2026-10-01T00:00:00Z");
  assertEquals(moodWindowStart("2026-10-10T00:00:00Z", "2026-10-01T00:00:00Z"), "2026-10-10T00:00:00Z");
  assertEquals(moodWindowStart("2026-09-10T00:00:00Z", "2026-10-01T00:00:00Z"), "2026-10-01T00:00:00Z");
});

Deno.test("block: Stacy text verbatim, numbers only, no words, omitted at 0", () => {
  assertEquals(renderMoodBlock(null), "");
  assertEquals(renderMoodBlock({ count: 0, energyAvg: 0, pleasantAvg: 0 }), "");
  const h = renderMoodBlock({ count: 3, energyAvg: 55, pleasantAvg: 62 });
  assert(h.includes("Your mood check-ins"));
  assert(h.includes("You checked in 3 times since your last assessment. Your average energy was 55 and your average pleasantness was 62. For your own reflection. Not medical advice. See all your check-ins in My Body."));
  assert(h.includes("Having a really hard time? In the US, call or text 988. In the UK or Ireland, call Samaritans on 116 123. If you are in danger, call your local emergency number."));
  assert(!/href=/.test(h), "no links or URLs in the block");
  assert(!/\u2014/.test(h), "no em dashes");
});

// Minimal fake of the service-role client, records every filter so user scoping can be asserted.
function fakeAdmin(data: Record<string, unknown>, calls: string[] = []) {
  // deno-lint-ignore no-explicit-any
  const q = (table: string): any => {
    const self = {
      select: (c: string) => { calls.push(`${table}.select(${c})`); return self; },
      eq: (k: string, v: string) => { calls.push(`${table}.eq(${k},${v})`); return self; },
      lt: () => self, lte: () => self, gte: () => self, order: () => self, limit: () => self,
      maybeSingle: () => Promise.resolve({ data: data[table] ?? null, error: null }),
      then: (r: (x: unknown) => unknown) => r({ data: data[table] ?? [], error: null }),
    };
    return self;
  };
  return { from: q };
}

Deno.test("buildMoodBlockForUser: scoped to the user, averages only, omitted when gated off", async () => {
  const calls: string[] = [];
  const admin = fakeAdmin({ mood_settings: ok, assessments: null, mood_entries: [{ energy: 40, pleasantness: 60 }, { energy: 60, pleasantness: 80 }] }, calls);
  const h = await buildMoodBlockForUser(admin, "u1", "2026-10-26T20:00:00Z", "on");
  assert(h.includes("You checked in 2 times"));
  assert(h.includes("average energy was 50") && h.includes("average pleasantness was 70"));
  assert(calls.includes("mood_entries.eq(user_id,u1)") && calls.includes("mood_settings.eq(user_id,u1)"));
  assert(!calls.some((c) => c.includes("word")), "never selects the mood word");
  assertEquals(await buildMoodBlockForUser(admin, "u1", "2026-10-26T20:00:00Z", undefined), "");
  const old = fakeAdmin({ mood_settings: { ...ok, consent_version: null }, mood_entries: [{ energy: 1, pleasantness: 1 }] });
  assertEquals(await buildMoodBlockForUser(old, "u1", "2026-10-26T20:00:00Z", "on"), "");
  const none = fakeAdmin({ mood_settings: ok, mood_entries: [] });
  assertEquals(await buildMoodBlockForUser(none, "u1", "2026-10-26T20:00:00Z", "on"), "");
});

Deno.test("index.ts: mood never in subject, tags, URLs or events", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const send = src.slice(src.indexOf("async function sendGreatJob"), src.indexOf("Deno.serve"));
  assert(!/mood/i.test(send.replace(/moodBlock/g, "")), "sendGreatJob only passes moodBlock into html");
  assert(/subject: c\.subject/.test(send));
  const ev = src.slice(src.indexOf('await logEvent("email_sent"'), src.indexOf('await logEvent("email_sent"') + 200);
  assert(!/mood/i.test(ev));
  assert(!/track_opens|track_clicks|tracking/i.test(send), "no tracking field set per send (see RESEND-NOTES.md)");
});
