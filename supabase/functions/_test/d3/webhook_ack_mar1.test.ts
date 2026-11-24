// deploy-set-WEBHOOK-ACK-TRIALEND-MAR1: live v59 + :226 trial_end fix + _shared/arl_copy.ts cd9b2617 (S1 rev2 bytes).
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { loadHandler, resetMocks, setNow, sha256Hex, trace, webhookReq, webhookTree } from "./harness.ts";
const UID = "00000000-0000-4000-8000-000000000001";
const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const MAR1 = 1803920400;
const H = await loadHandler(webhookTree("new"));
type C = Record<string, any>;
const ev = (meta: Record<string, string>) => ({ id: "evt_1", type: "checkout.session.completed", livemode: true, data: { object: {
  id: "cs_live_mock_1", object: "checkout.session", livemode: true, created: 1795550000, customer: "cus_mock_1", subscription: "sub_mock_1",
  currency: "usd", amount_total: 0, payment_status: "no_payment_required", customer_details: { email: "user@example.com" }, metadata: meta,
  consent: { terms_of_service: "accepted" }, consent_collection: { terms_of_service: "required" },
  custom_text: { submit: { message: "**S1**" }, terms_of_service_acceptance: { message: "S3" } }, total_details: { amount_discount: 0 } } } });
const META = { purpose: "base", user_id: UID, arl_version: "ca-arl-3b-2027-03-01-v5", arl_offer: "base", arl_period: "free", arl_price_ids: BASE, arl_amounts: "6000", arl_ua: "ua", arl_mode: "live" };
async function run() {
  const st = resetMocks();
  st.subscription = { id: "sub_mock_1", status: "trialing", current_period_end: MAR1, trial_end: MAR1, items: { data: [{ price: { unit_amount: 6000 }, current_period_end: MAR1 }] } };
  st.tables.users = { full_name: "Test User", base_expiry: null, email: "user@example.com" };
  setNow(Date.UTC(2026, 10, 24, 20));
  return await trace(H, webhookReq(ev(META)));
}
const S8 = [
  "Plan: ROMRx Base",
  "Beta launch trial period: free until March 1, 2027.",
  "First charge: $60 on March 1, 2027, for one year of ROMRx Base. No charge before then.",
  "Renewal: your plan renews automatically every year on March 1 at $60 until you cancel. We will tell you before any price change.",
  "How to cancel: cancel online anytime at https://romrx.io/app/dashboard/settings or in the app under Settings > Subscription > Cancel subscription. You can also email hello@romrx.io with the subject \"Cancel.\"",
  "Cancel before March 1, 2027 and you will not be charged anything.",
  "When you cancel: your access ends right away and you will not be charged again. All sales are final. We do not refund charges already made, except where the law requires a refund.",
  "Reminders: we will email you before your first charge and before each yearly renewal.",
];
Deno.test("arl_copy in the set is exactly cd9b2617 (same bytes as create-checkout-session S1 rev2)", async () => {
  const b = Deno.readFileSync(new URL("../../_shared/arl_copy.ts", import.meta.url));
  assertEquals(await sha256Hex(b), "cd9b261741642de048a875eb807e2e5e69b67724a7f72bf0817b91b9b0162d74");
});
Deno.test("Base ack renders S8 (ca-arl-3c-2027-03-01-v5) in text and HTML; no Jan 1 / Dec 31 wording", async () => {
  const r = await run();
  assertEquals(r.status, 200);
  const ack = (r.calls as C[]).filter((c) => c.kind === "fetch" && String(c.headers?.["Idempotency-Key"] ?? "").startsWith("arl_ack"));
  assertEquals(ack.length, 1);
  assertEquals(ack[0].body.subject, "Your ROMRx subscription: terms and how to cancel");
  for (const l of S8) assert(ack[0].body.text.includes(l), `text missing: ${l}`);
  const plain = String(ack[0].body.html).replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  for (const l of S8) assert(plain.includes(l), `html missing: ${l}`);
  for (const bad of ["January 1, 2027", "December 31, 2026", "Free period"]) {
    assertFalse(ack[0].body.text.includes(bad), bad);
    assertFalse(ack[0].body.html.includes(bad), bad);
  }
  const sent = (r.calls as C[]).find((c) => c.kind === "event" && c.name === "email_sent");
  assertEquals(sent.opts.props.template_version, "ca-arl-3c-2027-03-01-v5");
});
Deno.test("consent row: trial_end 1803920400 from the subscription, disclosure version from session metadata (v5)", async () => {
  const r = await run();
  const row = (r.calls as C[]).find((c) => c.kind === "db" && c.table === "billing_consents").ops.find((o: C) => o.op === "upsert").args[0];
  assertEquals(row.trial_end, "2027-03-01T17:00:00.000Z");
  assertEquals(Date.parse(row.trial_end) / 1000, MAR1);
  assertEquals(row.disclosure_text_version, "ca-arl-3b-2027-03-01-v5");
});
Deno.test("users.base_expiry on checkout.session.completed is the Stripe period end = 1803920400", async () => {
  const r = await run();
  const up = (r.calls as C[]).find((c) => c.kind === "db" && c.table === "users" && c.ops.some((o: C) => o.op === "update"));
  assertEquals(up.ops.find((o: C) => o.op === "update").args[0].base_expiry, "2027-03-01T17:00:00.000Z");
});
