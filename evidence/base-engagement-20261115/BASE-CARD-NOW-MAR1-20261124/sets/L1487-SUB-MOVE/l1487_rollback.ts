// L1487 ROLLBACK: put sub_1UVa8YDou9Iktbw0s4QIPS7b back to trial_end 1798822800 (Jan 1, 2027 12:00 PM ET).
// VALID ONLY UNTIL Wed Dec 30, 2026 12:00 PM ET (1798650000): Stripe needs trial_end at least 48 h ahead. After that the old
// date cannot be restored; the move is then one-way. Default = DRY RUN (GET only). --apply does one POST, own idempotency key.
// Key: env L1487_STRIPE_KEY (never printed). Run only with Sable's release.
// Run: deno run --allow-net=api.stripe.com --allow-env=L1487_STRIPE_KEY --allow-write=. l1487_rollback.ts [--apply]
import { NEW_TRIAL_END, OLD_TRIAL_END, stripe, SUB_ID, summary } from "./l1487_sub_move.ts";
export const ROLLBACK_IDEMPOTENCY_KEY = "L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800";
export const ROLLBACK_DEADLINE = OLD_TRIAL_END - 48 * 3600; // 1798650000 = Dec 30, 2026 12:00 PM ET

if (import.meta.main) {
  const apply = Deno.args.includes("--apply");
  const key = Deno.env.get("L1487_STRIPE_KEY") ?? "";
  if (!/^(sk|rk)_live_/.test(key)) { console.error("L1487_STRIPE_KEY missing or not a live key (value not shown). Abort."); Deno.exit(2); }
  if (Math.floor(Date.now() / 1000) >= ROLLBACK_DEADLINE - 600) { console.error("Too late: rollback window closed (Dec 30, 2026 12:00 PM ET, 10 min margin). Abort."); Deno.exit(2); }
  const b = await stripe("GET", `subscriptions/${SUB_ID}`, key);
  if (!b.ok) { console.error("GET failed", b.status); Deno.exit(1); }
  console.log("BEFORE", JSON.stringify(summary(b.json)));
  if (b.json.status !== "trialing" || b.json.trial_end !== NEW_TRIAL_END || b.json.cancel_at_period_end || b.json.cancel_at || b.json.schedule) {
    console.error("ABORT: not in the moved state (trialing, trial_end 1803920400, no cancel, no schedule). No write."); Deno.exit(3);
  }
  if (!apply) { console.log(`DRY RUN ONLY. Would POST trial_end=${OLD_TRIAL_END} proration_behavior=none Idempotency-Key ${ROLLBACK_IDEMPOTENCY_KEY}`); Deno.exit(0); }
  const u = await stripe("POST", `subscriptions/${SUB_ID}`, key, new URLSearchParams({ trial_end: String(OLD_TRIAL_END), proration_behavior: "none" }), ROLLBACK_IDEMPOTENCY_KEY);
  console.log("ROLLBACK", u.status, "stripe_date", u.date, "request_id", u.requestId);
  if (!u.ok) { console.error("ROLLBACK FAILED", u.json?.error?.code); Deno.exit(1); }
  const a = await stripe("GET", `subscriptions/${SUB_ID}`, key);
  console.log("AFTER", JSON.stringify(summary(a.json)));
  Deno.writeTextFileSync("L1487-ROLLBACK-RECORD.json", JSON.stringify({ stripe_subscription_id: SUB_ID, from: NEW_TRIAL_END, to: OLD_TRIAL_END, stripe_changed_at: new Date(u.date ?? Date.now()).toISOString(), stripe_request_id: u.requestId, idempotency_key: ROLLBACK_IDEMPOTENCY_KEY }, null, 1) + "\n");
}
