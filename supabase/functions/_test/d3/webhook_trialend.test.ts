// D3: stripe-webhook consent row trial_end comes from the Stripe subscription (live v59 :226 wrote the Jan 1 literal).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { loadHandler, LIVE_V59_SHA256, liveWebhookV59, resetMocks, setNow, sha256Hex, trace, webhookReq, webhookTree } from "./harness.ts";

const UID = "00000000-0000-4000-8000-000000000001";
const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const BJJ = "price_1TpvpxDou9Iktbw0hDQOEDwy";
const H = { pin: await loadHandler(webhookTree("pin")), now: await loadHandler(webhookTree("new")) };
const MAR1 = 1803920400, JAN1 = 1798822800;
type C = Record<string, any>;
function session(meta: Record<string, string>) {
  return { id: "evt_1", type: "checkout.session.completed", livemode: true, data: { object: {
    id: "cs_live_mock_1", object: "checkout.session", livemode: true, created: 1795550000, customer: "cus_mock_1", subscription: "sub_mock_1",
    currency: "usd", amount_total: 0, payment_status: "no_payment_required", customer_details: { email: "user@example.com" }, metadata: meta,
    consent: { terms_of_service: "accepted" }, consent_collection: { terms_of_service: "required" },
    custom_text: { submit: { message: "**S1**" }, terms_of_service_acceptance: { message: "S3" } }, total_details: { amount_discount: 0 } } } };
}
const META = { purpose: "base", user_id: UID, arl_version: "ca-arl-3b-2026-09-29-v3", arl_offer: "base", arl_period: "free", arl_price_ids: BASE, arl_amounts: "6000", arl_ua: "ua", arl_mode: "live" };
const SPORT = { purpose: "sport_unlock", user_id: UID, sport: "bjj", arl_period: "paid", arl_version: "ca-arl-3b-2026-09-29-v3", arl_offer: "sport", arl_price_ids: BJJ, arl_amounts: "14900" };
async function run(h: (r: Request) => Promise<Response>, ev: unknown, sub: C | null) {
  const st = resetMocks();
  st.subscription = sub;
  st.tables.users = { full_name: "Test User", base_expiry: null, email: "user@example.com" };
  setNow(Date.UTC(2026, 10, 24, 20));
  return await trace(h, webhookReq(ev));
}
const consentRow = (t: { calls: unknown[] }) => (t.calls as C[]).find((c) => c.kind === "db" && c.table === "billing_consents")?.ops.find((o: C) => o.op === "upsert")?.args[0];
const trialSub = (te: number | null) => ({ id: "sub_mock_1", status: te ? "trialing" : "active", current_period_end: te ?? 1835542800, trial_end: te,
  items: { data: [{ price: { unit_amount: 6000 }, current_period_end: te ?? 1835542800 }] } });

Deno.test("baseline: harness pin is live v59 byte-exact (sha256 0f895087)", async () => {
  assertEquals(await sha256Hex(new TextEncoder().encode(liveWebhookV59())), LIVE_V59_SHA256);
});
Deno.test("session whose subscription has trial_end 1803920400 writes consent trial_end 2027-03-01T17:00:00.000Z", async () => {
  const r = await run(H.now, session(META), trialSub(MAR1));
  assertEquals(r.status, 200);
  assertEquals(consentRow(r).trial_end, new Date(MAR1 * 1000).toISOString());
  assertEquals(consentRow(r).trial_end, "2027-03-01T17:00:00.000Z");
});
Deno.test("live v59 on the same session writes the Jan 1 literal (what this fixes)", async () => {
  assertEquals(consentRow(await run(H.pin, session(META), trialSub(MAR1))).trial_end, new Date(JAN1 * 1000).toISOString());
});
Deno.test("paid at sign-up (no trial) writes trial_end NULL; sport unlock too", async () => {
  assertEquals(consentRow(await run(H.now, session(META), trialSub(null))).trial_end, null);
  assertEquals(consentRow(await run(H.now, session(SPORT), trialSub(null))).trial_end, null);
});
Deno.test("Stripe retrieve fails: trial_end NULL (never a literal), row still written", async () => {
  const row = consentRow(await run(H.now, session(META), null));
  assert(row, "row written");
  assertEquals(row.trial_end, null);
});
Deno.test("late-window trial_end (sign-up + 48h10m) is copied exactly", async () => {
  const te = 1803747600 + 3600; // Feb 27, 2027 1:00 PM ET
  assertEquals(consentRow(await run(H.now, session(META), trialSub(te))).trial_end, new Date(te * 1000).toISOString());
});
Deno.test("every other column of the consent row and every other call is unchanged vs live v59", async () => {
  for (const [ev, sub] of [[session(META), trialSub(JAN1)], [session(SPORT), trialSub(null)]] as [unknown, C][]) {
    const a = await run(H.pin, ev, sub), b = await run(H.now, ev, sub);
    const ra = consentRow(a), rb = consentRow(b);
    const strip = (r: C) => { const { trial_end: _t, ...rest } = r; return rest; };
    assertEquals(strip(rb), strip(ra));
    if (sub.trial_end === JAN1) assertEquals(rb.trial_end, ra.trial_end); // a Jan 1 sub still records Jan 1
    const noRetrieve = (t: { calls: unknown[] }) => JSON.stringify((t.calls as C[]).filter((c) => c.kind !== "stripe.subscriptions.retrieve").map((c) => c.kind === "db" && c.table === "billing_consents" ? "consent" : c));
    assertEquals(noRetrieve(b), noRetrieve(a));
  }
});
Deno.test("customer.subscription.updated after the L1487 move sets users.base_expiry to Mar 1 (unchanged code path)", async () => {
  const ev = { id: "evt_3", type: "customer.subscription.updated", livemode: true, data: { object: { id: "sub_mock_1", customer: "cus_mock_1", status: "trialing",
    cancel_at_period_end: false, current_period_end: MAR1, trial_end: MAR1, items: { data: [{ current_period_end: MAR1 }] }, metadata: { purpose: "base", user_id: UID } } } };
  for (const h of [H.pin, H.now]) {
    const r = await run(h, ev, trialSub(MAR1));
    const up = (r.calls as C[]).find((c) => c.kind === "db" && c.table === "users" && c.ops.some((o: C) => o.op === "update"));
    assertEquals(up.ops.find((o: C) => o.op === "update").args[0].base_expiry, "2027-03-01T17:00:00.000Z");
    assertEquals(up.ops.find((o: C) => o.op === "update").args[0].base_status, "active");
  }
});
Deno.test("no 1798822800 literal left in the webhook", () => {
  const src = Deno.readTextFileSync(new URL("../../stripe-webhook/index.ts", import.meta.url));
  assertEquals(src.includes("1798822800"), false);
  assertEquals((src.match(/await subTrialEndIso\(stripe, subId\)/g) ?? []).length, 2);
});
