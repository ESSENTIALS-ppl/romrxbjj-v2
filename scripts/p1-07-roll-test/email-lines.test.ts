// P1-07 v3 window rules vs lifecycle-emails at 6d25bb35 (W2 v2 17c5c9f3 + quick-skip, unchanged): digest uses nextCheck(),
// lapsed uses Stacy's lapsedNextLine() (L1090: line omitted while the check is due and the retest is not).
// Run: node roll.test.mjs && node backfill.test.mjs (write cases.json, backfill-cases.json), then
//   LIFECYCLE_SRC=<supabase/functions/lifecycle-emails at 6d25bb35> deno test --allow-read --allow-env --no-lock email-lines.test.ts
// Checks both emails never disagree: same date when a future date is shown; digest "today" <-> lapsed omitted (retest not
// due) or "Your retest is ready now." (retest due). No new words: digest says "Your next check is today." on local days 7-14.
import { assert, assertEquals } from "jsr:@std/assert@1";
const src = Deno.env.get("LIFECYCLE_SRC");
if (!src) throw new Error("set LIFECYCLE_SRC");
const { nextCheck, lapsedNextLine, friendlyDate, localParts } = await import(`file://${src}/source/logic.ts`);
const { BRANDS, buildEmail } = await import(`file://${src}/source/email.ts`);
const read = async (f: string) => JSON.parse(await Deno.readTextFile(new URL(`./${f}`, import.meta.url)));
const links = { offKind: "https://x/k", offAll: "https://x/a", oneClick: "https://x/o" };
const pick = (t: string) => t.split("\n").find((l: string) => /^Your (next check|retest)/.test(l)) ?? null;
type S = { last_assessment_id: string; last_assessed_at: string; next_check_at: string | null; next_retest_at: string | null };
function lines(schedule: S, today: string, tz: string) {
  const now = new Date(`${today}T17:00:00Z`);
  const n = nextCheck(schedule, today, tz);
  const base = { user_id: "u", email: "alex@example.com", first_name: "Alex", active_sport: "general", email_id: "x", local_date: today };
  const digest = pick(buildEmail({ ...base, kind: "digest", next_check_line: n?.label ?? null, digest: { score: 70, delta: 4, streak: 0, sessions_this_week: 0, days_to_next_check: n ? n.days : null } }, BRANDS.base, links, "ROMRx LLC").text);
  const lapsed = pick(buildEmail({ ...base, kind: "lapsed", next_check_line: lapsedNextLine({ schedule } as never, tz, now, today) }, BRANDS.base, links, "ROMRx LLC").text);
  const retestDay = schedule.next_retest_at ? localParts(new Date(schedule.next_retest_at), tz).date : null;
  // Same date: digest "in N days" <-> lapsed "Your next check: <that date>"; digest "today" <-> lapsed "ready now".
  let expectLapsed: string | null;
  if (retestDay && retestDay <= today) expectLapsed = "Your retest is ready now.";
  else if (n && n.days <= 0) expectLapsed = null; // L1090 (17c5c9f3): check due, retest not due -> line omitted
  else expectLapsed = n ? `Your next check: ${friendlyDate(schedule.next_check_at, tz, now)}` : null;
  // Agreement: a dated lapsed line names the same local date as the digest's "in N days".
  if (lapsed && lapsed.startsWith("Your next check: ") && n) assertEquals(lapsed, `Your next check: ${friendlyDate(schedule.next_check_at, tz, now)}`);
  return { digest, lapsed, expectLapsed, n };
}
Deno.test("P1-07 v3 window: digest (nextCheck) and lapsed (Stacy lapsedNextLine) agree on every test day", async () => {
  const EXPECT: Record<string, [string | null, string | null]> = {
    "no quick check|3": ["Your next check is in 4 days.", "Your next check: Sunday, November 8"],
    "no quick check|7": ["Your next check is today.", null],
    "no quick check|8": ["Your next check is today.", null],
    "no quick check|10": ["Your next check is today.", null],
    "quick on day 10|10": ["Your next check is in 32 days.", "Your next check: Sunday, December 13"],
    "no quick check|14": ["Your next check is today.", null],
    "no quick check|15": ["Your next check is in 27 days.", "Your next check: Sunday, December 13"],
    "no quick check|20": ["Your next check is in 22 days.", "Your next check: Sunday, December 13"],
    "quick on day 10|20": ["Your next check is in 22 days.", "Your next check: Sunday, December 13"],
    "no quick check|42": ["Your next check is today.", "Your retest is ready now."],
    "full retest day 42|0": ["Your next check is in 7 days.", "Your next check: Sunday, December 20"],
    "full retest day 42|7": ["Your next check is today.", null],
    "full retest day 42|8": ["Your next check is today.", null],
    "full retest day 42|14": ["Your next check is today.", null],
    "full retest day 42|15": ["Your next check is in 27 days.", "Your next check: Sunday, January 24, 2027"],
  };
  const seen = new Set<string>();
  for (const c of await read("cases.json")) {
    const key = `${c.scenario}|${c.day}`;
    const { digest, lapsed, expectLapsed } = lines(c.schedule, c.today, c.tz ?? "America/Chicago");
    assert(key in EXPECT, `no expectation for ${key}`);
    assertEquals(digest, EXPECT[key][0], key);
    assertEquals(lapsed, EXPECT[key][1], key);
    assertEquals(lapsed, expectLapsed, key);
    seen.add(key);
    console.log(`${key} (${c.today}) -> digest "${digest}" | lapsed ${lapsed === null ? "(omitted)" : `"${lapsed}"`}`);
  }
  assertEquals(seen.size, Object.keys(EXPECT).length);
});
Deno.test("P1-07 v3 backfill: days 7-14 digest 'today' + lapsed omitted; days 15-41 future retest date in both; both emails agree", async () => {
  const cases = await read("backfill-cases.json");
  const tally: Record<string, number> = {};
  for (const c of cases) {
    const { digest, lapsed, expectLapsed, n } = lines(c.schedule, c.today, c.tz);
    assertEquals(lapsed, expectLapsed, `day ${c.day}`);
    const k = c.quick ? "quick" : c.day <= 6 ? "0-6" : c.day <= 14 ? "7-14" : c.day <= 41 ? "15-41" : "42+";
    tally[k] = (tally[k] ?? 0) + 1;
    if (!c.quick && c.day >= 7 && c.day <= 14) assert(digest === "Your next check is today." && lapsed === null, `day ${c.day}: ${digest} | ${lapsed}`);
    if (c.day >= 15 && c.day < 42) {
      assert(n && n.days > 0, `day ${c.day} days=${n?.days}`);
      assert(digest !== "Your next check is today." && !/ready now/.test(lapsed ?? ""), `day ${c.day}: ${digest} | ${lapsed}`);
    }
    if (c.day >= 42) assert(digest === "Your next check is today." && lapsed === "Your retest is ready now.", `day ${c.day}`);
  }
  console.log(`backfill rows checked: ${cases.length}; buckets ${JSON.stringify(tally)}`);
});
