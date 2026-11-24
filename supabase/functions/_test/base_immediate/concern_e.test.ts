// Concern (e) (Stacy 2:32 PM ET Nov 24): trial_end is 1798822800 (Fri Jan 1, 2027 12:00 PM ET). Under A and C, from the cutover
// (including between the cutover and Jan 1 noon) no trial checkout and no trial wording can be produced; the Jan 1 trial cohort
// and post-cutover paid buys do not collide (no double entitlement, no wrong ack); a trial user buying again is refused.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { checkoutReq, checkoutTree, loadHandler, OPTIONS, Opt, PAID_VERSIONS, resetMocks, setNow, trace, TRIAL_END_MS, webhookReq, webhookTree } from "./harness.ts";

type C = Record<string, any>;
const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const UID = "00000000-0000-4000-8000-000000000001";
const UID2 = "00000000-0000-4000-8000-000000000002";
const EMAIL = "user@example.com";
const OPTS = ["A", "C"] as Opt[];
const CK: Record<string, (r: Request) => Promise<Response>> = {
  pinOn: await loadHandler(checkoutTree("pin"), { ARL_LIVE_ENABLED: "true" }),
};
const WH: Record<string, (r: Request) => Promise<Response>> = { pin: await loadHandler(webhookTree("pin")) };
for (const o of OPTS) {
  const t = checkoutTree(o);
  CK[`${o}On`] = await loadHandler(t, { ARL_LIVE_ENABLED: "true" });
  CK[`${o}Off`] = await loadHandler(t, { ARL_LIVE_ENABLED: undefined });
  WH[o] = await loadHandler(webhookTree(o));
}
Deno.env.set("ARL_LIVE_ENABLED", "true");
const creates = (t: { calls: unknown[] }) => (t.calls as C[]).filter((c) => c.kind === "stripe.checkout.sessions.create");

async function checkout(h: (r: Request) => Promise<Response>, body: Record<string, unknown>, now: number, heldStatus?: string, packsOpen = false) {
  const st = resetMocks();
  if (packsOpen) Deno.env.set("PACKS_CHECKOUT_OPEN", "true"); else Deno.env.delete("PACKS_CHECKOUT_OPEN");
  st.tables.leads = { id: "lead-1", email: EMAIL, assessment_data: null, prs_score: null, converted_user_id: null };
  if (heldStatus) st.tables.users = { base_status: heldStatus };
  setNow(now);
  return await trace(h, checkoutReq(body, "jwt-u1"));
}
const BODIES: Record<string, unknown>[] = [
  { mode: "base", user_id: UID, email: EMAIL },
  { mode: "base", user_id: UID, email: EMAIL, lead_token: "lt1" },
  { mode: "base", user_id: UID, email: EMAIL, lead_token: "lt1", pending_sport: "bjj" },
  { mode: "base", user_id: UID, email: EMAIL, pending_sport: "bjj" },
  { mode: "base", user_id: UID, email: EMAIL, add: "bodybuilding" },
  { mode: "base", user_id: UID, email: EMAIL, sport: "bjj" },
  { mode: "unlock", token: "bjj" },
  { mode: "config" },
];
const after = (o: Opt) => {
  const T = OPTIONS[o] * 1000;
  return [T, T + 1, T + 1000, Date.UTC(2027, 0, 1, 5, 0, 1), TRIAL_END_MS - 1000, TRIAL_END_MS - 1, TRIAL_END_MS, TRIAL_END_MS + 1000, Date.UTC(2027, 5, 1, 16)]
    .filter((t) => t >= T);
};

for (const o of OPTS) {
  Deno.test(`concern (e) option ${o}: from the cutover through Jan 1 noon and after, no trial checkout and no trial wording (ARL on and off, packs open and closed)`, async () => {
    for (const t of after(o)) for (const arl of ["On", "Off"]) for (const packsOpen of [false, true]) for (const b of BODIES) {
      const r = await checkout(CK[`${o}${arl}`], b, t, undefined, packsOpen);
      const label = `${JSON.stringify(b)} ARL ${arl} packsOpen ${packsOpen} @ ${new Date(t).toISOString()}`;
      for (const c of creates(r)) {
        const p = JSON.stringify(c.params);
        assertFalse(p.includes("trial_end"), `trial_end: ${label}`);
        assertFalse(p.includes("trial_period_days"), label);
        assertFalse(p.includes("January 1, 2027"), `Jan 1 wording: ${label}`);
        assertFalse(p.includes("Free period") || p.includes("free through"), label);
        assertFalse(c.params.metadata?.arl_period === "free", `arl_period free: ${label}`);
        if (c.params.metadata?.purpose === "base") {
          assertEquals(c.params.metadata.arl_version, PAID_VERSIONS[o].disclosure, label);
          assertEquals(JSON.stringify(c.params.line_items), JSON.stringify([{ price: BASE, quantity: 1 }]), label);
        }
      }
      if (b.mode === "config") assertEquals((r.body as C).base_phase, "paid", label);
      const started = (r.calls as C[]).filter((x) => x.kind === "event" && x.name === "checkout_started");
      // Base sessions carry the paid version. (A sport-pack unlock, possible only if Jim opens packs after Jan 1 noon, is
      // charged at checkout with no trial and keeps the pack path's own version label: pack-fix behavior, out of scope here.)
      if (b.mode === "base") for (const s of started) assertFalse(JSON.stringify(s).includes("ca-arl-3b-2026-09-29-v3"), label);
    }
  });

  Deno.test(`concern (e) option ${o}: Jan 1 trial-cohort user (base active or past_due) buying again after the cutover is refused 409 base_already_active, no session`, async () => {
    for (const t of after(o)) {
      for (const held of ["active", "past_due"]) {
        const r = await checkout(CK[`${o}On`], BODIES[0], t, held);
        assertEquals(r.status, 409, `${held} @ ${t}`);
        assertEquals((r.body as C).error, "base_already_active");
        assertEquals(creates(r).length, 0);
        assert((r.calls as C[]).some((c) => c.kind === "event" && c.name === "checkout_base_already_active"));
      }
      // A user who canceled (or never held Base) buys normally: one paid session.
      for (const held of ["canceled", "inactive", undefined]) {
        const r = await checkout(CK[`${o}On`], BODIES[0], t, held);
        assertEquals(r.status, 200, `${held} @ ${t}`);
        assertEquals(creates(r).length, 1);
      }
    }
    // Before the cutover the guard does not exist: identical to 643e27f0 even for an active user.
    for (const t of [Date.UTC(2026, 10, 24, 19), OPTIONS[o] * 1000 - 1000]) {
      const a = await checkout(CK.pinOn, BODIES[0], t, "active"), b = await checkout(CK[`${o}On`], BODIES[0], t, "active");
      assertEquals(JSON.stringify(b), JSON.stringify(a), `pre-cutover active user @ ${t}`);
    }
  });
}

// ---- webhook side ----
const P1 = "$60 per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.";
function session(id: string, uid: string, meta: Record<string, string>) {
  return { id: `evt_${id}`, type: "checkout.session.completed", livemode: true, data: { object: {
    id, object: "checkout.session", livemode: true, created: 1798649000, customer: `cus_${uid.slice(-1)}`, subscription: `sub_${uid.slice(-1)}`,
    currency: "usd", amount_total: meta.arl_period === "paid" ? 6000 : 0, payment_status: meta.arl_period === "paid" ? "paid" : "no_payment_required",
    customer_details: { email: EMAIL }, metadata: { purpose: "base", user_id: uid, arl_offer: "base", arl_price_ids: BASE, arl_amounts: "6000", arl_ua: "ua", arl_mode: "live", ...meta },
    consent: { terms_of_service: "accepted" }, consent_collection: { terms_of_service: "required" },
    custom_text: { submit: { message: `**${P1}**` } }, total_details: { amount_discount: 0 },
  } } };
}
const TRIAL_SUB = { id: "sub_1", status: "trialing", current_period_end: 1798822800, trial_end: 1798822800, items: { data: [{ price: { unit_amount: 6000 }, current_period_end: 1798822800 }] } };
const PAID_SUB = { id: "sub_2", status: "active", current_period_end: 1830186000, trial_end: null, items: { data: [{ price: { unit_amount: 6000 }, current_period_end: 1830186000 }] } };
async function hook(h: (r: Request) => Promise<Response>, ev: unknown, now: number, sub: C) {
  const st = resetMocks();
  st.subscription = JSON.parse(JSON.stringify(sub));
  st.tables.users = { full_name: "Test User", base_expiry: null, email: EMAIL };
  setNow(now);
  return await trace(h, webhookReq(ev));
}
const acks = (t: { calls: unknown[] }) => (t.calls as C[]).filter((c) => c.kind === "fetch" && String(c.headers?.["Idempotency-Key"] ?? "").startsWith("arl_ack"));
const consent = (t: { calls: unknown[] }) => (t.calls as C[]).filter((c) => c.kind === "db" && c.table === "billing_consents");
const userUpdates = (t: { calls: unknown[] }) => (t.calls as C[]).filter((c) => c.kind === "db" && c.table === "users" && c.ops.some((x: C) => x.op === "update"));

for (const o of OPTS) {
  const T = OPTIONS[o] * 1000;
  Deno.test(`concern (e) option ${o}: webhook, the Jan 1 trial cohort and a paid buy after the cutover do not collide (no double entitlement, no wrong ack)`, async () => {
    const trialSession = session("cs_trial_1", UID, { arl_period: "free", arl_version: "ca-arl-3b-2026-09-29-v3" });
    const paidSession = session("cs_paid_2", UID2, { arl_period: "paid", arl_version: PAID_VERSIONS[o].disclosure });
    // 1) Trial session completed just before the cutover, and one created before but completed after it: trial ack, trial_end Jan 1, same as live.
    for (const t of [T - 1000, T + 1000]) {
      const a = await hook(WH.pin, trialSession, t, TRIAL_SUB), b = await hook(WH[o], trialSession, t, TRIAL_SUB);
      assertEquals(JSON.stringify(b), JSON.stringify(a), `trial session @ ${t - T} ms`);
      assertEquals(consent(b)[0].ops.find((x: C) => x.op === "upsert").args[0].trial_end, new Date(TRIAL_END_MS).toISOString());
      assertEquals(acks(b).length, 1);
      assert(acks(b)[0].body.text.includes("Free period"));
    }
    // 2) The trial converting at Jan 1 noon (subscription.updated trialing->active, invoice paid): same as live, no ack, no consent row.
    const conv = { id: "evt_c", type: "customer.subscription.updated", livemode: true, data: { object: { id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, current_period_end: 1830358800, metadata: { purpose: "base", user_id: UID } } } };
    const inv = { id: "evt_i", type: "invoice.payment_succeeded", livemode: true, data: { object: { id: "in_1", customer: "cus_1", subscription: "sub_1" } } };
    for (const ev of [conv, inv]) for (const t of [TRIAL_END_MS, TRIAL_END_MS + 1000]) {
      const a = await hook(WH.pin, ev, t, { ...TRIAL_SUB, status: "active", current_period_end: 1830358800 });
      const b = await hook(WH[o], ev, t, { ...TRIAL_SUB, status: "active", current_period_end: 1830358800 });
      assertEquals(JSON.stringify(b), JSON.stringify(a), `${ev.type} @ ${t}`);
      assertEquals(acks(b).length, 0);
      assertEquals(consent(b).length, 0);
    }
    // 3) A paid buy by another user between the cutover and Jan 1 noon, and after: paid ack once, trial_end NULL, only that user updated.
    for (const t of [T, TRIAL_END_MS - 1000, TRIAL_END_MS + 1000]) {
      const r = await hook(WH[o], paidSession, t, PAID_SUB);
      assertEquals(consent(r)[0].ops.find((x: C) => x.op === "upsert").args[0].trial_end, null);
      assertEquals(acks(r).length, 1);
      assertFalse(acks(r)[0].body.text.includes("Free period"));
      assertFalse(acks(r)[0].body.text.includes("January 1, 2027"));
      const ups = userUpdates(r);
      assertEquals(ups.length, 1, "one entitlement write");
      assert(JSON.stringify(ups[0].ops).includes(UID2));
      assertFalse(JSON.stringify(ups[0].ops).includes(UID), "trial user untouched");
      assertFalse((r.calls as C[]).some((c) => c.kind === "db" && c.table === "sport_entitlements"));
    }
    // 4) Stripe redelivers the paid session: same ack idempotency key and same consent row key (no second ack, no second entitlement).
    const r1 = await hook(WH[o], paidSession, T + 1000, PAID_SUB), r2 = await hook(WH[o], paidSession, T + 1000, PAID_SUB);
    assertEquals(acks(r1)[0].headers["Idempotency-Key"], "arl_ack-cs_paid_2");
    assertEquals(acks(r2)[0].headers["Idempotency-Key"], "arl_ack-cs_paid_2");
    assertEquals(JSON.stringify(consent(r2)[0].ops), JSON.stringify(consent(r1)[0].ops));
    assertEquals(JSON.stringify(consent(r1)[0].ops[0].args[1]), JSON.stringify({ onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }));
    assertEquals(JSON.stringify(userUpdates(r2)), JSON.stringify(userUpdates(r1)));
  });
}
Deno.test("concern (e) cleanup env", () => { Deno.env.delete("PACKS_CHECKOUT_OPEN"); });
