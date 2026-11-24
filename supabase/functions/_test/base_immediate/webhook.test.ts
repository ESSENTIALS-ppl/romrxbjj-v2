// Handler tests for stripe-webhook: live v59 ("pin") vs this branch at options A and C, Stripe/Supabase/Resend mocked.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { CLOSE_MS, loadHandler, OPTIONS, Opt, PAID_VERSIONS, resetMocks, setNow, trace, TRIAL_END_MS, webhookReq, webhookTree } from "./harness.ts";

const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const BJJ = "price_1TpvpxDou9Iktbw0hDQOEDwy";
const UID = "00000000-0000-4000-8000-000000000001";
const P1 = "$60 per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.";
const P3 = "I agree that ROMRx Base renews automatically every year at $60 until I cancel, and I agree to the [Terms](https://romrx.io/legal).";

const H: Record<string, (r: Request) => Promise<Response>> = { pin: await loadHandler(webhookTree("pin")) };
for (const o of ["A", "C"] as Opt[]) H[o] = await loadHandler(webhookTree(o));

function session(meta: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: "evt_1", type: "checkout.session.completed", livemode: true,
    data: { object: {
      id: "cs_live_mock_1", object: "checkout.session", livemode: true, created: 1798650100,
      customer: "cus_mock_1", subscription: "sub_mock_1", currency: "usd", amount_total: 6000, payment_status: "paid",
      customer_details: { email: "user@example.com" }, metadata: meta,
      consent: { terms_of_service: "accepted" }, consent_collection: { terms_of_service: "required" },
      custom_text: { submit: { message: `**${P1}**` }, terms_of_service_acceptance: { message: P3 } },
      total_details: { amount_discount: 0 }, ...extra,
    } },
  };
}
const PAID_META = { purpose: "base", user_id: UID, arl_version: "ca-arl-3b-2026-12-30-v4", arl_offer: "base", arl_period: "paid", arl_price_ids: BASE, arl_amounts: "6000", arl_ua: "ua", arl_mode: "live" };
const EVENTS: Record<string, unknown> = {
  freeBase: session({ ...PAID_META, arl_version: "ca-arl-3b-2026-09-29-v3", arl_period: "free" }),
  freeCombo: session({ ...PAID_META, arl_version: "ca-arl-3b-2026-09-29-v3", arl_period: "free", arl_offer: "combo", pending_sport: "bjj", arl_price_ids: `${BASE},${BJJ}`, arl_amounts: "6000,14900" }),
  preArlBase: session({ purpose: "base", user_id: UID }),
  sportFree: session({ purpose: "sport_unlock", user_id: UID, sport: "bjj", arl_period: "free", arl_version: "ca-arl-3b-2026-09-29-v3", arl_offer: "sport", arl_price_ids: BJJ, arl_amounts: "14900" }),
  sportPaid: session({ purpose: "sport_unlock", user_id: UID, sport: "bjj", arl_period: "paid", arl_version: "ca-arl-3b-2026-09-29-v3", arl_offer: "sport", arl_price_ids: BJJ, arl_amounts: "14900" }),
  invoicePaid: { id: "evt_2", type: "invoice.payment_succeeded", livemode: true, data: { object: { id: "in_1", customer: "cus_mock_1", subscription: "sub_mock_1" } } },
  subUpdated: { id: "evt_3", type: "customer.subscription.updated", livemode: true, data: { object: { id: "sub_mock_1", customer: "cus_mock_1", status: "active", cancel_at_period_end: false, current_period_end: 1830186000, metadata: { purpose: "base", user_id: UID } } } },
  paidBaseTwoItems: session({ ...PAID_META, arl_amounts: "6000,14900", arl_price_ids: `${BASE},${BJJ}` }),
};

async function run(h: (r: Request) => Promise<Response>, ev: unknown, now: number) {
  const st = resetMocks();
  st.subscription = { id: "sub_mock_1", status: "active", current_period_end: 1830186000, trial_end: null, items: { data: [{ price: { unit_amount: 6000 }, current_period_end: 1830186000 }] } };
  st.tables.users = { full_name: "Test User", base_expiry: null, email: "user@example.com" };
  setNow(now);
  return await trace(h, webhookReq(ev));
}
type C = Record<string, any>;
const consentRow = (t: { calls: unknown[] }) => (t.calls as C[]).find((c) => c.kind === "db" && c.table === "billing_consents")?.ops.find((o: C) => o.op === "upsert")?.args[0];
const acks = (t: { calls: unknown[] }) => (t.calls as C[]).filter((c) => c.kind === "fetch" && String(c.headers?.["Idempotency-Key"] ?? "").startsWith("arl_ack"));

const NOWS = [Date.UTC(2026, 10, 24, 19), CLOSE_MS + 1000, TRIAL_END_MS + 1000];

Deno.test("every non-paid event is byte-identical to live v59 (options A and C)", async () => {
  for (const [name, ev] of Object.entries(EVENTS)) {
    if (name === "paidBaseTwoItems") continue;
    for (const now of NOWS) {
      const a = await run(H.pin, ev, now);
      for (const o of ["A", "C"]) assertEquals(JSON.stringify(await run(H[o], ev, now)), JSON.stringify(a), `${name} ${o} @${now}`);
    }
  }
});

for (const o of ["A", "C"] as Opt[]) {
  Deno.test(`option ${o}: paid Base session -> entitlement, trial_end NULL, P5 ack v4 (never the free ack)`, async () => {
    const r = await run(H[o], session({ ...PAID_META, arl_version: PAID_VERSIONS[o].disclosure }), OPTIONS[o] * 1000 + 1000);
    assertEquals(r.status, 200);
    const row = consentRow(r);
    assertEquals(row.trial_end, null);
    assertEquals(row.offer, "base");
    assertEquals(row.disclosure_text_version, PAID_VERSIONS[o].disclosure);
    assertEquals(row.disclosure_text, `**${P1}**`);
    assertEquals(row.consent_text, P3);
    assertEquals(row.stripe_consent_terms_of_service, "accepted");
    assertEquals(JSON.stringify(row.amounts), "[6000]");
    const ups = (r.calls as C[]).filter((c) => c.kind === "db" && c.table === "users" && c.ops.some((x: C) => x.op === "update"));
    const patch = ups[0].ops.find((x: C) => x.op === "update").args[0];
    assertEquals(patch.base_status, "active");
    assertEquals(patch.base_stripe_subscription_id, "sub_mock_1");
    assertEquals(patch.base_expiry, new Date(1830186000 * 1000).toISOString());
    const a = acks(r);
    assertEquals(a.length, 1);
    assertEquals(a[0].headers["Idempotency-Key"], "arl_ack-cs_live_mock_1");
    assertEquals(a[0].body.subject, "Your ROMRx subscription: terms and how to cancel");
    assert(a[0].body.text.includes("- Charged today: $60 for one year of ROMRx Base."));
    assert(a[0].body.text.includes("- Reminders: we will email you before each yearly renewal."));
    assertFalse(a[0].body.text.includes("Free period"));
    assertFalse(a[0].body.text.includes("January 1, 2027"));
    assertFalse(a[0].body.text.includes("sport packs"));
    const sent = (r.calls as C[]).find((c) => c.kind === "event" && c.name === "email_sent");
    assertEquals(sent.opts.props.template_version, PAID_VERSIONS[o].ack);
    assertFalse((r.calls as C[]).some((c) => c.kind === "db" && c.table === "sport_entitlements"), "no pack entitlement");
    assertFalse((r.calls as C[]).some((c) => c.kind === "rpc" && c.name === "add_sport_access"));
    // Jim's PAID alert still goes (no Idempotency-Key).
    assertEquals((r.calls as C[]).filter((c) => c.kind === "fetch" && !c.headers?.["Idempotency-Key"]).length, 1);
  });
}

Deno.test("live v59 on the same paid session would record trial_end Jan 1 and send the free-period ack (what this fixes)", async () => {
  const r = await run(H.pin, session(PAID_META), OPTIONS.A * 1000 + 1000);
  assertEquals(consentRow(r).trial_end, new Date(1798822800 * 1000).toISOString());
  assert(acks(r)[0].body.text.includes("Free period"));
});

Deno.test("paid Base session with two line items: no ack sent, logged", async () => {
  const r = await run(H.A, EVENTS.paidBaseTwoItems, OPTIONS.A * 1000 + 1000);
  assertEquals(acks(r).length, 0);
  assert((r.calls as C[]).some((c) => c.kind === "event" && c.name === "arl_ack_skipped_unexpected_items"));
});
