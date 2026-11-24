// Handler tests for create-checkout-session: the real index.ts with Stripe/Supabase/events mocked.
//  - "pin" = 643e27f0 (pinned pack fix 22c490f8 + Spring 2027 packs message; fixture sha256-checked in unit.test.ts)
//  - "A" / "B" / "C" = this branch with BASE_PAID_CUTOVER_UNIX set to Jim's option A, B or C (one line each)
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { checkoutReq, checkoutTree, CLOSE_MS, loadHandler, OPTIONS, Opt, resetMocks, S, setNow, trace, TRIAL_END_MS } from "./harness.ts";

const BASE = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const BJJ = "price_1TpvpxDou9Iktbw0hDQOEDwy";
const UID = "00000000-0000-4000-8000-000000000001";
const EMAIL = "user@example.com";

const OPTS = ["A", "B", "C"] as Opt[];
const H: Record<string, (r: Request) => Promise<Response>> = {
  pinOn: await loadHandler(checkoutTree("pin"), { ARL_LIVE_ENABLED: "true" }),
  pinOff: await loadHandler(checkoutTree("pin"), { ARL_LIVE_ENABLED: undefined }),
};
for (const o of OPTS) {
  const t = checkoutTree(o);
  H[`${o}On`] = await loadHandler(t, { ARL_LIVE_ENABLED: "true" });
  H[`${o}Off`] = await loadHandler(t, { ARL_LIVE_ENABLED: undefined });
}
// Promo flag flipped (the one line in base_cutover.ts), option A.
{
  const t = checkoutTree("A");
  const f = `${t}/source/base_cutover.ts`;
  const src = Deno.readTextFileSync(f);
  const line = "export const BASE_PAID_ALLOW_PROMOTION_CODES = true;";
  if (!src.includes(line)) throw new Error("promo line missing");
  Deno.writeTextFileSync(f, src.replace(line, "export const BASE_PAID_ALLOW_PROMOTION_CODES = false;"));
  H.AnoPromo = await loadHandler(t, { ARL_LIVE_ENABLED: "true" });
}

type Scn = { name: string; body: Record<string, unknown>; jwt?: string; packsOpen?: boolean; tosError?: boolean; basePrice?: number };
const SCENARIOS: Scn[] = [
  { name: "plain Base", body: { mode: "base", user_id: UID, email: EMAIL } },
  { name: "Base + pending_sport (packs closed)", body: { mode: "base", user_id: UID, email: EMAIL, pending_sport: "bjj" } },
  { name: "Base + add (packs closed)", body: { mode: "base", user_id: UID, email: EMAIL, add: "bodybuilding" } },
  { name: "Base + pending_sport (PACKS_CHECKOUT_OPEN=true)", body: { mode: "base", user_id: UID, email: EMAIL, pending_sport: "bjj" }, packsOpen: true },
  { name: "Base + sport price_id", body: { mode: "base", user_id: UID, email: EMAIL, price_id: BJJ } },
  { name: "Base + lead_token + sport (dropped)", body: { mode: "base", user_id: UID, email: EMAIL, lead_token: "lt1", pending_sport: "bjj" } },
  { name: "Base + lead_token", body: { mode: "base", user_id: UID, email: EMAIL, lead_token: "lt1" } },
  { name: "Base, consent box rejected (Terms URL missing)", body: { mode: "base", user_id: UID, email: EMAIL }, tosError: true },
  { name: "Base, price not $60", body: { mode: "base", user_id: UID, email: EMAIL }, basePrice: 5000 },
  { name: "Base, JWT for another user", body: { mode: "base", user_id: "someone-else", email: EMAIL } },
  { name: "Base, no JWT", body: { mode: "base", user_id: UID, email: EMAIL }, jwt: "nope" },
  { name: "Base, missing email", body: { mode: "base", user_id: UID } },
  { name: "unlock bjj (packs closed)", body: { mode: "unlock", token: "bjj" } },
  { name: "unlock bjj (PACKS_CHECKOUT_OPEN=true)", body: { mode: "unlock", token: "bjj" }, packsOpen: true },
  { name: "coach", body: { mode: "coach", user_id: UID, email: EMAIL } },
  { name: "plan athlete, no mode", body: { plan: "athlete", email: EMAIL } },
  { name: "sport field on base", body: { mode: "base", user_id: UID, email: EMAIL, sport: "bjj" } },
];

async function run(h: (r: Request) => Promise<Response>, s: Scn, nowMs: number) {
  const st = resetMocks();
  if (s.packsOpen) Deno.env.set("PACKS_CHECKOUT_OPEN", "true"); else Deno.env.delete("PACKS_CHECKOUT_OPEN");
  if (s.tosError) st.sessionCreateErrors.push(new Error("You must provide a Terms of Service URL in your Public details"));
  if (s.basePrice) st.prices[BASE].unit_amount = s.basePrice;
  st.tables.leads = { id: "lead-1", email: EMAIL, assessment_data: null, prs_score: null, converted_user_id: null };
  setNow(nowMs);
  return await trace(h, checkoutReq(s.body, s.jwt ?? "jwt-u1"));
}
const creates = (t: { calls: unknown[] }) =>
  (t.calls as Record<string, unknown>[]).filter((c) => c.kind === "stripe.checkout.sessions.create") as { params: Record<string, any> }[];

const P1 = "$60 per year for ROMRx Base, charged to your card today and on this date every year until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before each yearly renewal.";
const P3 = "I agree that ROMRx Base renews automatically every year at $60 until I cancel, and I agree to the [Terms](https://romrx.io/legal).";

const TIMES: [string, number][] = [
  ["Tue Nov 24, 2026 2:00 PM ET (today)", Date.UTC(2026, 10, 24, 19, 0, 0)],
  ["Dec 30, 2026 11:59:59 AM ET", CLOSE_MS - 1000],
  ["Dec 30, 2026 11:59:59.999 AM ET", CLOSE_MS - 1],
  ["Dec 30, 2026 12:00:00.000 PM ET", CLOSE_MS],
  ["Dec 30, 2026 12:00:01 PM ET", CLOSE_MS + 1000],
  ["Dec 31, 2026 6:00 PM ET", Date.UTC(2026, 11, 31, 23)],
  ["Dec 31, 2026 11:59:59 PM ET", OPTIONS.C * 1000 - 1000],
  ["Jan 1, 2027 12:00:00 AM ET", OPTIONS.C * 1000],
  ["Jan 1, 2027 12:00:01 AM ET", OPTIONS.C * 1000 + 1000],
  ["Jan 1, 2027 11:59:59 AM ET", TRIAL_END_MS - 1000],
  ["Jan 1, 2027 12:00:00 PM ET", TRIAL_END_MS],
  ["Jan 1, 2027 12:00:01 PM ET", TRIAL_END_MS + 1000],
  ["Jun 1, 2027", Date.UTC(2027, 5, 1, 16)],
];
const isPackShaped = (s: Scn) => /pending_sport|add|price_id|sport field|unlock/.test(s.name);

// 1. Before each option's cutover, behavior is byte-identical to 643e27f0 (pack fix 22c490f8 + Spring 2027 message; ARL on and off).
for (const o of OPTS) {
  for (const [label, t] of TIMES.filter(([, t]) => t < OPTIONS[o] * 1000)) {
    Deno.test(`option ${o}, before cutover, byte-identical to 643e27f0: ${label}`, async () => {
      for (const s of SCENARIOS) {
        for (const arl of ["On", "Off"]) {
          const a = await run(H[`pin${arl}`], s, t), b = await run(H[`${o}${arl}`], s, t);
          assertEquals(JSON.stringify(b), JSON.stringify(a), `${s.name} ARL ${arl}`);
        }
      }
    });
  }
}

// 2. From each option's cutover (0 s, +1 ms, +1 s, later): paid Base, $60 charged now, no trial_end, Stacy P1 + P3.
for (const o of OPTS) {
  for (const [label, t] of TIMES.filter(([, t]) => t >= OPTIONS[o] * 1000)) {
    Deno.test(`option ${o}, paid from cutover: ${label}`, async () => {
      const r = await run(H[`${o}On`], SCENARIOS[0], t);
      assertEquals(r.status, 200);
      const c = creates(r);
      assertEquals(c.length, 1);
      const p = c[0].params;
      assertFalse(JSON.stringify(p).includes("trial_end"), "no trial_end anywhere");
      assertEquals(JSON.stringify(p.subscription_data), JSON.stringify({ metadata: { purpose: "base", user_id: UID } }));
      assertEquals(p.mode, "subscription");
      assertEquals(p.payment_method_collection, "always");
      assertEquals(p.allow_promotion_codes, true);
      assertEquals(JSON.stringify(p.line_items), JSON.stringify([{ price: BASE, quantity: 1 }]));
      assertEquals(p.metadata.arl_amounts, "6000");
      assertEquals(p.metadata.arl_period, "paid");
      assertEquals(p.metadata.arl_offer, "base");
      assertEquals(p.metadata.arl_version, "ca-arl-3b-2026-12-30-v4");
      assertFalse("pending_sport" in p.metadata);
      assertEquals(p.consent_collection?.terms_of_service, "required");
      assertEquals(p.custom_text.submit.message, `**${P1}**`);
      assertEquals(p.custom_text.terms_of_service_acceptance.message, P3);
      const started = (r.calls as Record<string, any>[]).find((x) => x.kind === "event" && x.name === "checkout_started");
      assertEquals(started?.opts.props.arl_version, "ca-arl-3b-2026-12-30-v4");
      // Packs: every pack-shaped Base request is refused, never added (packs closed and PACKS_CHECKOUT_OPEN=true).
      for (const s of SCENARIOS.filter((x) => isPackShaped(x) && !(x.body.mode === "unlock" && x.packsOpen))) {
        const rr = await run(H[`${o}On`], s, t);
        assertEquals(rr.status, 403, s.name);
        assertEquals((rr.body as Record<string, unknown>).code, "packs_closed", s.name);
        assertEquals(creates(rr).length, 0, s.name);
      }
      // Lead-email unlock naming a sport: sport dropped (packs closed) or refused (packs open); never a pack line.
      const lead = await run(H[`${o}On`], SCENARIOS.find((x) => x.name.startsWith("Base + lead_token + sport"))!, t);
      for (const cc of creates(lead)) assertFalse(JSON.stringify(cc.params).includes(BJJ));
      // Fail closed: price not $60, consent box refused, ARL gate off.
      const bad = await run(H[`${o}On`], SCENARIOS.find((x) => x.basePrice === 5000)!, t);
      assertEquals(bad.status, 502); assertEquals(creates(bad).length, 0);
      const tos = await run(H[`${o}On`], SCENARIOS.find((x) => x.tosError)!, t);
      assertEquals(tos.status, 503); assertEquals(creates(tos).length, 1, "no retry without the box");
      const off = await run(H[`${o}Off`], SCENARIOS[0], t);
      assertEquals(off.status, 503); assertEquals(creates(off).length, 0);
      assert(JSON.stringify(off.calls).includes("checkout_base_paid_needs_arl"));
      // Auth, coach, bad mode unchanged.
      assertEquals((await run(H[`${o}On`], SCENARIOS.find((x) => x.name === "Base, JWT for another user")!, t)).status, 401);
      assertEquals((await run(H[`${o}On`], SCENARIOS.find((x) => x.name === "coach")!, t)).status, 403);
      assertEquals((await run(H[`${o}On`], SCENARIOS.find((x) => x.name === "plan athlete, no mode")!, t)).status, 400);
    });
  }
}

// 3. The gap (B and C): between the v50 close and the cutover, every Base request gets the v50 503 and no session.
for (const o of ["B", "C"] as Opt[]) {
  Deno.test(`option ${o}: closed from Dec 30 noon ET until its cutover`, async () => {
    for (const [, t] of TIMES.filter(([, t]) => t > CLOSE_MS && t < OPTIONS[o] * 1000)) {
      for (const s of SCENARIOS.filter((x) => x.body.mode === "base" && !x.name.includes("JWT") && !x.name.includes("missing") && !isPackShaped(x) && !x.name.includes("lead_token + sport"))) {
        const r = await run(H[`${o}On`], s, t);
        assertEquals(r.status, 503, `${s.name} @${t}`);
        assertEquals((r.body as Record<string, unknown>).error, "base_checkout_unavailable");
        assertEquals(creates(r).length, 0);
      }
    }
  });
}

// 4. mode=config: the client's read of the SAME cutover. Flips with checkout at -1 s / 0 / +1 s for every option.
for (const o of OPTS) {
  Deno.test(`option ${o}: mode=config base_paid_now flips with checkout (1 s either side)`, async () => {
    const T = OPTIONS[o] * 1000;
    for (const t of [T - 1000, T - 1, T, T + 1, T + 1000]) {
      const cfg = await run(H[`${o}On`], { name: "config", body: { mode: "config" }, jwt: "anon" }, t);
      assertEquals(cfg.status, 200);
      const b = cfg.body as Record<string, unknown>;
      const chk = await run(H[`${o}On`], SCENARIOS[0], t);
      const paidCheckout = chk.status === 200 && creates(chk)[0]?.params.metadata.arl_period === "paid";
      assertEquals(b.base_paid_now, paidCheckout, `${o} @ ${t - T} ms`);
      assertEquals(b.base_paid_now, t >= T);
      assertEquals(b.cutover_unix, OPTIONS[o]);
      assertEquals(b.server_now_unix, Math.floor(t / 1000));
      assertEquals(b.base_phase, t >= T ? "paid" : (t > CLOSE_MS ? "closed" : "trial"));
      assertEquals((cfg.calls as Record<string, unknown>[]).filter((c) => c.kind !== "event").length, 0, "no DB, Stripe or auth call");
    }
  });
}
Deno.test("mode=config is the only pre-cutover difference from 643e27f0 (which answers 400 Invalid mode)", async () => {
  const t = Date.UTC(2026, 10, 24, 19);
  const a = await run(H.pinOn, { name: "config", body: { mode: "config" } }, t);
  assertEquals(a.status, 400);
  const b = await run(H.AOn, { name: "config", body: { mode: "config" } }, t);
  assertEquals(b.status, 200);
  assertEquals((b.body as Record<string, unknown>).base_paid_now, false);
});

// 5. Promo flag: false applies to the paid path only; the trial path stays true (live).
Deno.test("promo flag false: paid session has allow_promotion_codes false, trial session unchanged (true)", async () => {
  const paid = await run(H.AnoPromo, SCENARIOS[0], OPTIONS.A * 1000 + 1000);
  assertEquals(creates(paid)[0].params.allow_promotion_codes, false);
  const trial = await run(H.AnoPromo, SCENARIOS[0], Date.UTC(2026, 10, 24, 19));
  assertEquals(creates(trial)[0].params.allow_promotion_codes, true);
  const a = await run(H.pinOn, SCENARIOS[0], Date.UTC(2026, 10, 24, 19));
  assertEquals(JSON.stringify(trial), JSON.stringify(a));
});

Deno.test("cleanup env", () => { Deno.env.delete("PACKS_CHECKOUT_OPEN"); assert(S()); });
