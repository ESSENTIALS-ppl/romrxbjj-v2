// Renders the three moved Base reminder emails (first charge, Mar 1, 2027, $60) with this branch's template code for Vera.
// Placeholder recipient user@example.com, placeholder name and placeholder card (Visa ending 4242); no customer data.
// Writes files only; sends nothing. Same steps as index.ts (send path). Usage:
//   deno run --allow-write=<outdir> render_moved_reminders.ts <outdir>
import { buildFirstChargeEmail, buildFirstChargeText, cardPhrase, firstChargeSubject, BRAND_BASE } from "../email.ts";
import { formatUsd, planReminders, type CandidateRow } from "../logic.ts";
const out = Deno.args[0];
const SUB = "sub_TEST_placeholder";
const r: CandidateRow = { id: "00000000-0000-4000-8000-000000000001", email: "user@example.com", full_name: "Alex Placeholder", active_sport: "general",
  base_status: "active", base_stripe_subscription_id: SUB, base_expiry: new Date(1803920400e3).toISOString(), base_cancel_at_period_end: false,
  base_canceled_at: null, is_test: false, consents: [{ stripe_subscription_id: SUB, trial_end: new Date(1798822800e3).toISOString(), amounts: [6000], offer: "base" }] };
for (const day of ["2027-01-15", "2027-01-30", "2027-02-27"]) {
  const d = planReminders([r], new Date(`${day}T12:00:00Z`)).due[0];
  if (!d.first_charge) throw new Error("expected first_charge");
  const expiryFormatted = new Date(d.charge_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
  const greet = d.full_name ? (d.full_name ?? d.email).split(" ")[0] : "there";
  const card = cardPhrase({ brand: "visa", last4: "4242" });
  const subject = firstChargeSubject(expiryFormatted);
  const html = buildFirstChargeEmail(greet, expiryFormatted, formatUsd(d.amount_cents), card, d.email);
  const text = buildFirstChargeText(greet, expiryFormatted, formatUsd(d.amount_cents), card);
  const base = `${out}/${day}-${d.type}`;
  Deno.writeTextFileSync(`${base}.html`, html);
  Deno.writeTextFileSync(`${base}.txt`, `To: user@example.com\nFrom: ${BRAND_BASE.from}\nSubject: ${subject}\nSend: ${day} 7:00 AM ET (cron 12:00 UTC)\n\n${text}\n`);
  console.log(`${day} 7:00 AM ET\t${d.type}\tdays_until ${d.days_until}\t${subject}\t${formatUsd(d.amount_cents)}\t${expiryFormatted}`);
}
