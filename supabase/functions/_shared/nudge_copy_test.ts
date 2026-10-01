import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildEmail } from "./nudge_copy.ts";
import type { Stage } from "./nudge_rules.ts";

const STAGES: Stage[] = ["incomplete_a", "incomplete_b", "incomplete_catchup"];
const BANNED = [/\u2014/, /\u2013/, /&mdash;/i, /&ndash;/i, /stiffest/i, /most uneven/i, /\ba real plan\b/i, /real person/i, /\bfix(es|ed|ing)?\b/i, /injur/i, /\bpain\b/i, /walk/i, /performance/i, /Position Readiness/i, /AT RISK/i, /ELITE/i, /\$\s?\d/, /\b60\b/, /free through/i, /billing/i, /built around your joints/i];

for (const s of STAGES) {
  Deno.test(`copy ${s}: banned words and dashes absent`, () => {
    const e = buildEmail(s, { firstName: "Sam", email: "sam+test@example.com", ymd: "20261006" });
    for (const re of BANNED) { assert(!re.test(e.html), `${s} html matches ${re}`); assert(!re.test(e.text), `${s} text matches ${re}`); assert(!re.test(e.subject), `${s} subject matches ${re}`); }
  });
  Deno.test(`copy ${s}: footer, unsubscribe, link, UTM`, () => {
    const e = buildEmail(s, { firstName: "", email: "sam+test@example.com", ymd: "20261006" });
    assert(e.html.includes("ROMRx LLC, Dublin, Ohio"));
    assert(e.html.includes("Stop these reminders"));
    assert(e.html.includes("https://romrx.io/app/unsubscribe?email=sam%2Btest%40example.com"));
    assert(e.link.startsWith("https://romrx.io/app/onboarding/assessment?"));
    assert(e.link.includes("utm_medium=email") && e.link.includes("utm_source=owned") && e.link.includes("utm_campaign=ROMRx_Base_Beta_2026"));
    assert(e.html.includes("Hey there,"));
    assertEquals(e.html.includes("Needs focus, Building, or Steady"), true);
  });
}
Deno.test("only email A mentions improve range of motion, with Results vary", () => {
  const a = buildEmail("incomplete_a", { firstName: "S", email: "s@example.com", ymd: "20261006" });
  assert(a.html.includes("improve your range of motion. Results vary."));
  for (const s of ["incomplete_b", "incomplete_catchup"] as Stage[]) assert(!buildEmail(s, { firstName: "S", email: "s@example.com", ymd: "20261006" }).html.includes("improve your range"));
});
