// D3 (2026-11-24): reminder dates follow the Stripe trial end the webhook copies into users.base_expiry.
// Pure logic only (logic.ts). No network, no DB, no Stripe. Placeholder recipient user@example.com.
import { assertEquals } from "jsr:@std/assert@1";
import { chargeAt, planReminders, type CandidateRow } from "../logic.ts";

const MAR1 = new Date(1803920400 * 1000).toISOString(); // 2027-03-01 12:00 PM EST
const JAN1 = new Date(1798822800 * 1000).toISOString(); // 2027-01-01 12:00 PM EST
const SUB = "sub_TEST_placeholder";
const row = (base_expiry: string | null, consentTrialEnd: string | null): CandidateRow => ({
  id: "00000000-0000-4000-8000-000000000001", email: "user@example.com", full_name: "Alex Placeholder", active_sport: "general",
  base_status: "active", base_stripe_subscription_id: SUB, base_expiry, base_cancel_at_period_end: false, base_canceled_at: null,
  grandfathered_at: null, subscription_tier: "free", subscription_expiry: null, stripe_subscription_id: null, is_test: false,
  consents: [{ stripe_subscription_id: SUB, trial_end: consentTrialEnd, amounts: [6000], offer: "base" }],
});
// Cron job 1 runs at 12:00 UTC = 7:00 AM EST every day. Simulate each daily run with the renewal_reminders unique key
// (user_id, reminder_type, subscription_expiry) so a claimed reminder never sends twice.
export function simulate(r: CandidateRow, from: string, to: string, alreadyClaimed: string[] = []) {
  const claimed = new Set(alreadyClaimed);
  const sends: { run_et: string; type: string; charge_date: string; days_until: number }[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86400000) {
    for (const d of planReminders([r], new Date(t)).due) {
      const k = `${d.user_id}|${d.type}|${d.charge_date}`;
      if (claimed.has(k)) continue;
      claimed.add(k);
      sends.push({ run_et: new Date(t).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET", type: d.type, charge_date: d.charge_date, days_until: d.days_until });
    }
  }
  return sends;
}
const NOV17 = ["00000000-0000-4000-8000-000000000001|45_day|2027-01-01"]; // the live 45-day claim already in renewal_reminders

Deno.test("moved sub (base_expiry Mar 1 from webhook, consent still Jan 1): sends Jan 15, Jan 30, Feb 27, 2027 at 7:00 AM ET, NOT Dec 2", () => {
  const s = simulate(row(MAR1, JAN1), "2026-11-24", "2027-03-01", NOV17);
  assertEquals(s.map((x) => [x.run_et, x.type, x.charge_date, x.days_until]), [
    ["Jan 15, 2027, 7:00 AM ET", "45_day", "2027-03-01", 45],
    ["Jan 30, 2027, 7:00 AM ET", "30_day", "2027-03-01", 30],
    ["Feb 27, 2027, 7:00 AM ET", "2_day", "2027-03-01", 2],
  ]);
  assertEquals(s.some((x) => x.run_et.startsWith("Dec")), false);
});
Deno.test("control: unmoved sub (base_expiry Jan 1) still sends Dec 2 and Dec 30, 2026", () => {
  const s = simulate(row(JAN1, JAN1), "2026-11-24", "2027-01-01", NOV17);
  assertEquals(s.map((x) => [x.run_et, x.type]), [["Dec 2, 2026, 7:00 AM ET", "30_day"], ["Dec 30, 2026, 7:00 AM ET", "2_day"]]);
});
Deno.test("new checkout from D3 webhook: consent 1803920400 and base_expiry 1803920400 give the same three dates", () => {
  const s = simulate(row(MAR1, MAR1), "2026-11-24", "2027-03-01");
  assertEquals(s.map((x) => x.run_et), ["Jan 15, 2027, 7:00 AM ET", "Jan 30, 2027, 7:00 AM ET", "Feb 27, 2027, 7:00 AM ET"]);
});
Deno.test("fallback: base_expiry NULL uses consent trial_end", () => {
  assertEquals(chargeAt(row(null, MAR1), new Date("2026-11-24T20:00:00Z"))?.at, MAR1);
  assertEquals(chargeAt(row(null, null), new Date("2026-11-24T20:00:00Z")), null);
});
Deno.test("base_expiry wins over a future consent trial_end, and a past base_expiry means no date (no consent fallback)", () => {
  assertEquals(chargeAt(row(MAR1, JAN1), new Date("2026-11-24T20:00:00Z"))?.at, MAR1);
  assertEquals(chargeAt(row("2026-11-01T17:00:00.000Z", MAR1), new Date("2026-11-24T20:00:00Z")), null);
});
Deno.test("amount stays $60 (6000) from the consent", () => assertEquals(chargeAt(row(MAR1, JAN1), new Date("2026-11-24T20:00:00Z"))?.amount, 6000));
Deno.test("boundary: 45-day window opens on Jan 15 (46 days out on Jan 14 = none), 2-day on Feb 27", () => {
  assertEquals(planReminders([row(MAR1, JAN1)], new Date("2027-01-14T12:00:00Z")).due.length, 0);
  assertEquals(planReminders([row(MAR1, JAN1)], new Date("2027-01-15T12:00:00Z")).due[0].type, "45_day");
  assertEquals(planReminders([row(MAR1, JAN1)], new Date("2027-02-27T12:00:00Z")).due[0].type, "2_day");
});
Deno.test("P6 renewal Mar 1, 2028 (1835542800): Jan 16, Jan 31, Feb 28, 2028", () => {
  const M28 = new Date(1835542800 * 1000).toISOString();
  const s = simulate(row(M28, null), "2027-12-01", "2028-03-01");
  assertEquals(s.map((x) => x.run_et), ["Jan 16, 2028, 7:00 AM ET", "Jan 31, 2028, 7:00 AM ET", "Feb 28, 2028, 7:00 AM ET"]);
});

// --- first-charge wording (Stacy 1518 concern 15; P6 rest unchanged) ---
import { isFirstCharge } from "../logic.ts";
import { buildFirstChargeEmail, buildFirstChargeText, cardPhrase, firstChargeSubject } from "../email.ts";
Deno.test("the three moved sends are first_charge; the Mar 1, 2028 renewal is not", () => {
  const s = [ "2027-01-15", "2027-01-30", "2027-02-27" ].map((d) => planReminders([row(MAR1, JAN1)], new Date(`${d}T12:00:00Z`)).due[0]);
  assertEquals(s.map((x) => x.first_charge), [true, true, true]);
  const M28 = new Date(1835542800 * 1000).toISOString();
  assertEquals(isFirstCharge(row(M28, JAN1), M28), false);
  assertEquals(isFirstCharge(row(M28, MAR1), M28), false);
  assertEquals(isFirstCharge(row(M28, null), M28), false);
});
Deno.test("first-charge text: trial-ending sentence, no 'renews on', cancel how-to, $60, March 1, 2027", () => {
  const t = buildFirstChargeText("Alex", "March 1, 2027", "$60", cardPhrase({ brand: "visa", last4: "4242" }));
  assertEquals(t.includes("Your ROMRx Base beta launch trial period ends on March 1, 2027, and your plan starts automatically."), true);
  assertEquals(t.includes("We will charge Visa ending 4242 $60 for one year of ROMRx Base. It renews every year at $60 until you cancel."), true);
  assertEquals(t.includes("Want to stop it? Cancel online anytime before March 1, 2027: https://romrx.io/app/dashboard/settings. You can also email hello@romrx.io with the subject \"Cancel.\""), true);
  assertEquals(/renews on/.test(t), false);
  assertEquals(firstChargeSubject("March 1, 2027"), "Your ROMRx Base beta launch trial period ends March 1, 2027");
  const h = buildFirstChargeEmail("Alex", "March 1, 2027", "$60", "Visa ending 4242", "user@example.com");
  assertEquals(h.includes("https://romrx.io/app/dashboard/settings"), true);
  assertEquals(/renews on/.test(h), false);
  assertEquals(cardPhrase(null), "the card on file");
});

Deno.test("subject equals Stacy Notice B subject (1530, 54ca69e6) exactly; no 'ends on'", () => {
  const NOTICE_B_SUBJECT = "Your ROMRx Base beta launch trial period ends March 1, 2027";
  assertEquals(firstChargeSubject("March 1, 2027"), NOTICE_B_SUBJECT);
  assertEquals(firstChargeSubject("March 1, 2027").includes("ends on"), false);
});

Deno.test("v3 (Sable 3:57 PM): no 'one more year' anywhere in the renewal function source or first-charge output", () => {
  const dir = new URL("../", import.meta.url);
  for (const f of ["email.ts", "logic.ts", "index.ts"]) {
    assertEquals(Deno.readTextFileSync(new URL(f, dir)).includes("one more year"), false, f);
  }
  const out = buildFirstChargeText("Alex", "March 1, 2027", "$60", "Visa ending 4242") + buildFirstChargeEmail("Alex", "March 1, 2027", "$60", "Visa ending 4242", "user@example.com");
  assertEquals(out.includes("one more year"), false);
  assertEquals(out.includes("for one year of ROMRx Base"), true);
  assertEquals(cardPhrase(null), "the card on file");
  const rd = Deno.env.get("D3_RENDERS_DIR");
  if (rd) for (const e of Deno.readDirSync(rd)) assertEquals(Deno.readTextFileSync(`${rd}/${e.name}`).includes("one more year"), false, e.name);
});
