// Offline tests: no network, no key. Stripe is mocked by replacing globalThis.fetch.
import { assertEquals } from "jsr:@std/assert@1";
import { IDEMPOTENCY_KEY, NEW_TRIAL_END, OLD_TRIAL_END, skipFlags, stripe, SUB_ID, summary, warnings, webhookWillSync } from "../l1487_sub_move.ts";
import { ROLLBACK_DEADLINE, ROLLBACK_IDEMPOTENCY_KEY } from "../l1487_rollback.ts";

const good = () => ({ id: SUB_ID, object: "subscription", livemode: true, status: "trialing", trial_end: OLD_TRIAL_END,
  cancel_at_period_end: false, cancel_at: null, canceled_at: null, ended_at: null, schedule: null, pause_collection: null,
  default_payment_method: "pm_x", customer: "cus_abcdefgh123", metadata: { user_id: "21647e5a-0000", purpose: "base" },
  items: { data: [{ price: { unit_amount: 6000 } }] } });

Deno.test("constants", () => {
  assertEquals(OLD_TRIAL_END, Date.parse("2027-01-01T12:00:00-05:00") / 1000);
  assertEquals(NEW_TRIAL_END, Date.parse("2027-03-01T12:00:00-05:00") / 1000);
  assertEquals(IDEMPOTENCY_KEY, "L1487-sub_1UVa8YDou9Iktbw0s4QIPS7b-1803920400");
  assertEquals(ROLLBACK_IDEMPOTENCY_KEY, "L1487-ROLLBACK-sub_1UVa8YDou9Iktbw0s4QIPS7b-1798822800");
  assertEquals(ROLLBACK_DEADLINE, Date.parse("2026-12-30T12:00:00-05:00") / 1000);
  assertEquals(SUB_ID, "sub_1UVa8YDou9Iktbw0s4QIPS7b");
});
Deno.test("good sub: no skip flags, no warnings", () => { assertEquals(skipFlags(good(), "apply"), []); assertEquals(warnings(good()), []); });
Deno.test("skip: not trialing", () => assertEquals(skipFlags({ ...good(), status: "active" }, "apply"), ["status_not_trialing:active"]));
Deno.test("skip: trial_end not Jan 1", () => assertEquals(skipFlags({ ...good(), trial_end: 1798822801 }, "apply"), ["trial_end_not_1798822800:1798822801"]));
Deno.test("skip: other sub / test mode / cancel / schedule / excluded user", () => {
  assertEquals(skipFlags({ ...good(), id: "sub_other" }, "apply"), ["wrong_id:sub_other"]);
  assertEquals(skipFlags({ ...good(), livemode: false }, "apply"), ["not_livemode"]);
  assertEquals(skipFlags({ ...good(), cancel_at_period_end: true }, "apply"), ["cancel_at_period_end"]);
  assertEquals(skipFlags({ ...good(), schedule: "sub_sched_1" }, "apply"), ["has_subscription_schedule"]);
  assertEquals(skipFlags({ ...good(), metadata: { user_id: "7c71e421-x" } }, "apply"), ["excluded_user", "metadata_user_not_21647e5a:7c71e421"]);
});
Deno.test("after check wants Mar 1", () => {
  assertEquals(skipFlags({ ...good(), trial_end: NEW_TRIAL_END }, "after"), []);
  assertEquals(skipFlags(good(), "after"), ["trial_end_not_1803920400:1798822800"]);
});
Deno.test("summary has no PII and cuts ids", () => {
  const s = summary(good());
  assertEquals(s.customer8, "cus_abcd"); assertEquals(s.trial_end_et, "1/1/2027, 12:00:00 PM ET");
  assertEquals(JSON.stringify(s).includes("@"), false);
});
Deno.test("POST sends trial_end, proration none, the idempotency key; key never in body", async () => {
  // deno-lint-ignore no-explicit-any
  let seen: any = null; const orig = globalThis.fetch;
  globalThis.fetch = ((url: string, init: RequestInit) => { seen = { url, init }; return Promise.resolve(new Response("{}", { headers: { date: "Tue, 24 Nov 2026 21:00:00 GMT" } })); }) as typeof fetch;
  try {
    const r = await stripe("POST", `subscriptions/${SUB_ID}`, "sk_live_FAKE", new URLSearchParams({ trial_end: String(NEW_TRIAL_END), proration_behavior: "none" }), IDEMPOTENCY_KEY);
    assertEquals(seen.url, "https://api.stripe.com/v1/subscriptions/sub_1UVa8YDou9Iktbw0s4QIPS7b");
    assertEquals(String(seen.init.body), "trial_end=1803920400&proration_behavior=none");
    assertEquals(seen.init.headers["Idempotency-Key"], IDEMPOTENCY_KEY);
    assertEquals(String(seen.init.body).includes("sk_"), false);
    assertEquals(r.date, "Tue, 24 Nov 2026 21:00:00 GMT");
  } finally { globalThis.fetch = orig; }
});
Deno.test("webhook sync needs purpose base + user_id (v59 :688)", () => {
  assertEquals(webhookWillSync(good()), true);
  assertEquals(webhookWillSync({ ...good(), metadata: { user_id: "21647e5a" } }), false);
  assertEquals(webhookWillSync({ ...good(), metadata: { purpose: "base" } }), false);
});
