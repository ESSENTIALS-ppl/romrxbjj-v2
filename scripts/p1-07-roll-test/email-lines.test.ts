// P1-07 rules 1-3 vs lifecycle-emails W2 (b8fcae18, unchanged): digest uses nextCheck(), lapsed uses Stacy's lapsedNextLine().
// Run: node roll.test.mjs && node backfill.test.mjs (write cases.json, backfill-cases.json), then
//   LIFECYCLE_SRC=<supabase/functions/lifecycle-emails at b8fcae18> deno test --allow-read --allow-env --no-lock email-lines.test.ts
// Checks both emails point to the SAME next date in every case, with the expected words.
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
  else if (n && n.days <= 0) expectLapsed = "Your next check is ready now.";
  else expectLapsed = n ? `Your next check: ${friendlyDate(schedule.next_check_at, tz, now)}` : null;
  return { digest, lapsed, expectLapsed, n };
}
Deno.test("P1-07 rules: digest (nextCheck) and lapsed (Stacy lapsedNextLine) agree on the date in every scenario", async () => {
  const EXPECT: Record<string, string> = {
    "no quick check|2026-11-08": "Your next check is today.",
    "no quick check|2026-11-09": "Your next check is in 34 days.",
    "quick on day 7|2026-11-09": "Your next check is in 34 days.",
    "no quick check|2026-11-21": "Your next check is in 22 days.",
    "quick on day 7|2026-11-21": "Your next check is in 22 days.",
    "full reassessment day 42|2026-12-13": "Your next check is in 7 days.",
    "full reassessment day 42|2026-12-20": "Your next check is today.",
    "full reassessment day 42|2026-12-21": "Your next check is in 34 days.",
  };
  for (const c of await read("cases.json")) {
    const key = `${c.scenario}|${c.today}`;
    const { digest, lapsed, expectLapsed } = lines(c.schedule, c.today, c.tz ?? "America/Chicago");
    assertEquals(digest, EXPECT[key], key);
    assertEquals(lapsed, expectLapsed, key);
    console.log(`${key} -> digest "${digest}" | lapsed "${lapsed}"`);
  }
});
Deno.test("P1-07 backfill: from local day 8 to 41 no row gives 'today', 'ready now' or a past date; both emails agree", async () => {
  const cases = await read("backfill-cases.json");
  let n8 = 0;
  for (const c of cases) {
    const { digest, lapsed, expectLapsed, n } = lines(c.schedule, c.today, c.tz);
    assertEquals(lapsed, expectLapsed, `day ${c.day}`);
    if (c.day >= 8 && c.day < 42) {
      n8++;
      assert(n && n.days > 0, `day ${c.day} days=${n?.days}`);
      assert(digest !== "Your next check is today." && !/ready now/.test(lapsed ?? ""), `day ${c.day}: ${digest} | ${lapsed}`);
    }
  }
  console.log(`backfill rows checked: ${cases.length}; days 8-41: ${n8}`);
});
