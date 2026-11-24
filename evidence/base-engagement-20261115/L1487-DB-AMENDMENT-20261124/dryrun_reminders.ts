// Read-only dry run: the reminder selection logic (live v32 bytes and D3 v2 bytes) over this user's REAL rows as read
// from the DB at 3:51 PM ET Nov 24, 2026 (AFTER). No DB, no network, no sends, no function invoke. Email = placeholder.
import * as V32 from "/workspace/process/batches/base-engagement-20261115/BASE-CARD-NOW-MAR1-20261124/sets/D3-WEBHOOK-TRIALEND-v2/1-send-renewal-reminders/rollback-live-v32/source/logic.ts";
import * as D3 from "/workspace/process/batches/base-engagement-20261115/BASE-CARD-NOW-MAR1-20261124/sets/D3-WEBHOOK-TRIALEND-v2/1-send-renewal-reminders/source/logic.ts";
const row = { id: "21647e5a-cca0-48c8-8203-1786db2f39d3", email: "user@example.com", full_name: "x", active_sport: "general",
  base_status: "active", base_stripe_subscription_id: "sub_1UVa8YDou9Iktbw0s4QIPS7b", base_expiry: "2027-03-01T17:00:00+00:00",
  base_cancel_at_period_end: false, base_canceled_at: null, grandfathered_at: null, subscription_tier: "free", subscription_expiry: null,
  stripe_subscription_id: null, is_test: false,
  consents: [{ stripe_subscription_id: "sub_1UVa8YDou9Iktbw0s4QIPS7b", trial_end: "2027-01-01T17:00:00+00:00", amounts: [6000], offer: "base" }] };
const sent = new Set(["45_day|2027-01-01"]); // renewal_reminders 3edf1fb8 (UNIQUE user_id, reminder_type, subscription_expiry)
const days = ["2026-12-02","2026-12-30","2027-01-15","2027-01-30","2027-02-27","2026-11-25","2027-01-16","2027-02-28"];
console.log("run_7am_et\tlogic\tselected\ttype\tcharge_date\tfirst_charge\tdedupe_blocked");
for (const day of days) for (const [n, L] of [["live_v32", V32], ["d3_v2", D3]] as const) {
  // deno-lint-ignore no-explicit-any
  const due = (L as any).planReminders([row], new Date(day + "T12:00:00Z")).due as any[];
  if (!due.length) { console.log(day+"\t"+n+"\tno\t-\t-\t-\t-"); continue; }
  for (const d of due) console.log([day, n, "YES", d.type, d.charge_date, d.first_charge ?? "-", sent.has(d.type+"|"+d.charge_date)].join("\t"));
}
