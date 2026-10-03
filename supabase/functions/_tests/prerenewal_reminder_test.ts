// DRAFT Base pre-renewal reminder: decision rules + rendered copy. No network, nothing is sent.
//   deno test --allow-env --allow-read --allow-write --import-map=supabase/functions/_tests/import_map.json supabase/functions/_tests/
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { decideReminder, reminderHtml, reminderLines, reminderSubject, reminderText, chargeDateLabel, freePeriodEndLabel } from "../_shared/prerenewal_copy.ts";
import { POSTAL_ADDRESS } from "../_shared/email_footer.ts";

const TRIAL_END = 1798822800; // 2027-01-01 12:00 ET
const NOW = Date.UTC(2026, 11, 29, 17, 0); // Dec 29 2026 12:00 ET: default trial_will_end time (3 days before)
const baseSub = (over: Record<string, unknown> = {}) => ({
  id: "sub_test", status: "trialing", trial_end: TRIAL_END, created: Math.floor(Date.UTC(2026, 9, 5) / 1000),
  metadata: { purpose: "base", user_id: "u1" }, items: { data: [{ price: { unit_amount: 6000 } }] }, ...over,
});

Deno.test("labels use New York time", () => {
  assertEquals(chargeDateLabel(TRIAL_END), "January 1, 2027");
  assertEquals(freePeriodEndLabel(TRIAL_END), "December 31, 2026");
});

Deno.test("sends for a normal Base trial; skips non-Base, canceled, scheduled cancel, brand-new signups", () => {
  const ok = decideReminder(baseSub(), NOW);
  assert(ok.send);
  if (ok.send) { assertEquals(ok.basePrice, "$60"); assertEquals(ok.sportPack, null); assertEquals(ok.userId, "u1"); }
  assertEquals(decideReminder(baseSub({ metadata: { purpose: "sport_unlock", user_id: "u1" } }), NOW), { send: false, reason: "not_base" });
  assertEquals(decideReminder(baseSub({ metadata: {} }), NOW), { send: false, reason: "not_base" });
  assertEquals(decideReminder(baseSub({ status: "canceled" }), NOW), { send: false, reason: "status_canceled" });
  assertEquals(decideReminder(baseSub({ cancel_at_period_end: true }), NOW), { send: false, reason: "cancel_scheduled_or_canceled" });
  assertEquals(decideReminder(baseSub({ trial_end: null }), NOW), { send: false, reason: "no_trial_end" });
  const justSignedUp = baseSub({ created: Math.floor(NOW / 1000) - 3600 });
  assertEquals(decideReminder(justSignedUp, NOW), { send: false, reason: "created_under_24h_ack_just_sent" });
  assertEquals(decideReminder(baseSub({ items: { data: [] } }), NOW), { send: false, reason: "no_price_amounts" });
});

Deno.test("combo (Base + sport pack) shows both prices", () => {
  const d = decideReminder(baseSub({ metadata: { purpose: "base", user_id: "u1", pending_sport: "bjj" }, items: { data: [{ price: { unit_amount: 6000 } }, { price: { unit_amount: 8900 } }] } }), NOW);
  assert(d.send);
  if (d.send) {
    const lines = reminderLines(d.trialEnd, d.basePrice, d.sportPack, d.sportPrice).join("\n");
    assertStringIncludes(lines, "$60");
    assertStringIncludes(lines, "ROMRx+BJJ");
    assertStringIncludes(lines, "Canceling Base also cancels any sport packs.");
  }
});

Deno.test("copy: price, charge date, cancel link and steps, address, DRAFT marker, no dashes", async () => {
  const html = reminderHtml(TRIAL_END, "$60");
  const text = reminderText(TRIAL_END, "$60");
  for (const t of [html, text]) {
    assertStringIncludes(t, "$60");
    assertStringIncludes(t, "January 1, 2027");
    assertStringIncludes(t, "https://romrx.io/app/dashboard/settings");
    assertStringIncludes(t, "Cancel subscription");
    assertStringIncludes(t, POSTAL_ADDRESS);
    assertStringIncludes(t, "DRAFT");
    assert(!/[\u2014\u2013]|&mdash;|&ndash;/.test(t), "no em or en dashes");
  }
  assertStringIncludes(reminderSubject(TRIAL_END), "[DRAFT] Your ROMRx plan renews on January 1, 2027");
  const dir = Deno.env.get("PREVIEW_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(`${dir}/4-prerenewal-reminder-base.html`, html);
    await Deno.writeTextFile(`${dir}/4-prerenewal-reminder-combo.html`, reminderHtml(TRIAL_END, "$60", "ROMRx+BJJ", "$89"));
  }
});
