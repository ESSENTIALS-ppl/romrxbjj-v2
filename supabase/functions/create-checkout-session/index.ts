// v32 (CA auto-renewal law fix, Legal plan ca-arl-plan-20260929 sections 3b + 4D, Jim GO via Grant 2026-09-29):
//   - Base, Base + sport (combo) and sport unlock sessions now require an UNCHECKED terms consent box
//     (consent_collection.terms_of_service = required) with Stacy's exact consent text in
//     custom_text.terms_of_service_acceptance.
//   - Base and combo sessions show Stacy's 3b disclosure line in bold directly above the pay button
//     (custom_text.submit). Prices in the line are read from the Stripe Price objects at runtime.
//   - Sport unlock (existing Base user adds a pack): Stacy's 3b-2 line (free-period version through Dec 31, 2026;
//     "charged today" version from Jan 1, 2027, when no trial_end is sent because it would be in the past).
//   - Session metadata carries arl_* fields so stripe-webhook can write public.billing_consents.
//   - Fixture-only Stripe TEST mode, all four required: (1) request body stripe_test_mode === true, (2) a valid
//     Supabase JWT whose email passes public.is_test_account(email) (base mode: JWT user id must equal body.user_id),
//     (3) STRIPE_TEST_SECRET_KEY is set and starts with sk_test_. Then the session is created in test mode with
//     test-mirror prices. Anything else (including the flag from a real customer) uses the live key exactly as before.
//   - If Stripe rejects consent collection because the Terms URL is missing in Public details, the session is retried
//     with the disclosure line but without the box (never worse than v31) and checkout_arl_consent_unavailable is logged.
// v31 (Jim beta trial lock 2026-09-16): Base + sport unlock checkouts collect card always,
// trial_end Unix 1798822800 (2027-01-01 12:00:00 America/New_York; noon ET Jan 1 display fix), then bill normally. Coach unchanged.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logEvent } from "../_shared/events.ts";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import {
  ARL_DISCLOSURE_VERSION, ARL_CONSENT_TEXT, SPORT_PACK_NAMES, formatUsd, disclosureBase, disclosureCombo,
  disclosureSport, disclosureSportPaid, inFreePeriod, BETA_TRIAL_END_UNIX,
} from "../_shared/arl_copy.ts";
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_KEY    = Deno.env.get("STRIPE_SECRET_KEY")!;
const PUBLIC_ORIGIN = Deno.env.get("PUBLIC_ORIGIN") ?? "https://romrx.io";
const BASE_PRICE_ID = "price_1TpvnqDou9Iktbw0GMayhIQ7";
const SPORT_PRICE_IDS: Record<string, string> = {
  bjj: "price_1TpvpxDou9Iktbw0hDQOEDwy",
  bodybuilding: "price_1TpvriDou9Iktbw0oiHxtLfB",
};
const COACH_PRICE_ID = "price_1TKKTgDou9Iktbw0YqnV3411";
const COACH_ORIGIN = Deno.env.get("COACH_ORIGIN") ?? "https://romrxbjj.com";
const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });
// Fixture-only test mode (see header). Never used unless the key is a real sk_test_ key.
const STRIPE_TEST_KEY = (Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "").trim();
const stripeTest = STRIPE_TEST_KEY.startsWith("sk_test_")
  ? new Stripe(STRIPE_TEST_KEY, { apiVersion: "2024-11-20.acacia" })
  : null;
// Test-mode mirror prices, found (or created once, in TEST mode only) by lookup_key. Live prices are never touched.
const TEST_MIRROR: Record<string, { lookup: string; name: string; amount: number }> = {
  base: { lookup: "romrx_base_yearly_testmirror", name: "ROMRx Base (test mirror)", amount: 6000 },
  bjj: { lookup: "romrx_bjj_yearly_testmirror", name: "ROMRx+BJJ (test mirror)", amount: 14900 },
  bodybuilding: { lookup: "romrx_bodybuilding_yearly_testmirror", name: "ROMRx+BodyBuilding (test mirror)", amount: 14900 },
};
type YearlyPrice = { id: string; amount: number };
class ArlPriceError extends Error {}
async function resolveYearlyPrice(s: Stripe, testMode: boolean, key: string, livePriceId: string): Promise<YearlyPrice> {
  let price: Stripe.Price;
  if (testMode) {
    const m = TEST_MIRROR[key];
    if (!m) throw new ArlPriceError(`no test mirror for ${key}`);
    const found = await s.prices.list({ lookup_keys: [m.lookup], active: true, limit: 1 });
    if (found.data.length) {
      price = found.data[0];
    } else {
      const product = await s.products.create({ name: m.name, metadata: { romrx_test_mirror: "true" } });
      price = await s.prices.create({
        product: product.id, unit_amount: m.amount, currency: "usd",
        recurring: { interval: "year" }, lookup_key: m.lookup,
      });
    }
  } else {
    price = await s.prices.retrieve(livePriceId);
  }
  const ok = price.active && price.currency === "usd" && typeof price.unit_amount === "number" &&
    price.recurring?.interval === "year" && (price.recurring?.interval_count ?? 1) === 1;
  if (!ok) throw new ArlPriceError(`price ${price.id} is not an active USD yearly price`);
  return { id: price.id, amount: price.unit_amount as number };
}
/** Test mode needs an explicit request flag AND a test-fixture email AND a real sk_test_ key. */
async function callerIsTestFixture(admin: ReturnType<typeof createClient>, email: string | null | undefined, requested: boolean): Promise<boolean> {
  if (!requested || !stripeTest || !email) return false;
  const { data, error } = await admin.rpc("is_test_account", { p_email: email });
  if (error) { console.error("is_test_account rpc failed", error.message); return false; }
  return data === true;
}
function isMissingTermsUrlError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
  return msg.includes("terms of service");
}
const ARL_CONSENT = { terms_of_service: "required" as const };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}
function normalizePendingSport(raw: unknown): "bjj" | "bodybuilding" | null {
  if (raw === "bjj" || raw === "bodybuilding") return raw;
  return null;
}
async function getCallerUserId(admin: ReturnType<typeof createClient>, req: Request): Promise<string | null> {
  return (await getCallerUser(admin, req))?.id ?? null;
}
async function getCallerUser(admin: ReturnType<typeof createClient>, req: Request): Promise<{ id: string; email: string | null } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7);
  const { data } = await admin.auth.getUser(jwt);
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
async function claimLead(
  admin: ReturnType<typeof createClient>,
  leadToken: string,
  userId: string,
  userEmail: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id, email, assessment_data, prs_score, converted_user_id")
    .eq("unlock_token", leadToken)
    .maybeSingle();
  if (leadErr) return { ok: false, status: 500, error: `lead_lookup_failed: ${leadErr.message}` };
  if (!lead)   return { ok: false, status: 404, error: "lead_not_found" };
  if (lead.converted_user_id && lead.converted_user_id !== userId) {
    return { ok: false, status: 409, error: "lead_already_claimed" };
  }
  if (lead.email && userEmail && lead.email.toLowerCase() !== userEmail.toLowerCase()) {
    console.warn(`lead ${lead.id}: email mismatch lead=${lead.email} caller=${userEmail}`);
  }
  const { error: convertErr } = await admin
    .from("leads")
    .update({ converted_user_id: userId, converted_at: new Date().toISOString() })
    .eq("id", lead.id);
  if (convertErr) {
    console.error("lead convert update failed", convertErr);
  }
  return { ok: true };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")     return json(405, { error: "Method not allowed" });
  {
    const limited = await enforceRateLimit(req, "create-checkout-session", { corsHeaders: CORS });
    if (limited) return limited;
  }
  let body: {
    mode?: "base" | "unlock" | "coach";
    plan?: string;
    user_id?: string;
    email?: string;
    full_name?: string;
    gym?: string;
    sport?: string;
    token?: string;
    price_id?: string;
    lead_token?: string;
    pending_sport?: string;
    add?: string;
    stripe_test_mode?: boolean;
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const testRequested = body.stripe_test_mode === true;
  const mode = body.mode ?? (String(body.plan ?? "").toLowerCase() === "coach" ? "coach" : undefined);
  if (mode === "base") {
    if (!body.user_id || !body.email) return json(400, { error: "user_id and email required" });
    if (body.lead_token) {
      const claim = await claimLead(admin, body.lead_token, body.user_id, body.email);
      if (!claim.ok) return json(claim.status, { error: claim.error });
    }
    const pendingSport = normalizePendingSport(body.pending_sport ?? body.add);
    const meta: Record<string, string> = { purpose: "base", user_id: body.user_id };
    if (pendingSport) meta.pending_sport = pendingSport;
    if (pendingSport && !SPORT_PRICE_IDS[pendingSport]) return json(400, { error: "invalid_pending_sport" });
    // Test mode only for a signed-in fixture checking out as themself.
    const caller = stripeTest && testRequested ? await getCallerUser(admin, req) : null;
    const testMode = !!caller && caller.id === body.user_id && await callerIsTestFixture(admin, caller.email, testRequested);
    const s = testMode ? stripeTest! : stripe;
    let basePrice: YearlyPrice;
    let sportPriceR: YearlyPrice | null = null;
    try {
      basePrice = await resolveYearlyPrice(s, testMode, "base", BASE_PRICE_ID);
      // Locked Legal terms (spec 3b, signup page) say $60 per year. Refuse rather than show a different price.
      if (basePrice.amount !== 6000) throw new ArlPriceError(`base price ${basePrice.id} is ${basePrice.amount}, expected 6000`);
      if (pendingSport) sportPriceR = await resolveYearlyPrice(s, testMode, pendingSport, SPORT_PRICE_IDS[pendingSport]);
    } catch (e) {
      console.error("arl price resolve failed", String(e));
      return json(502, { error: "stripe_error", stripe_type: null, stripe_code: null, message: "Could not load plan price" });
    }
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: basePrice.id, quantity: 1 },
    ];
    if (sportPriceR) line_items.push({ price: sportPriceR.id, quantity: 1 });
    const disclosure = pendingSport && sportPriceR
      ? disclosureCombo(formatUsd(basePrice.amount), formatUsd(sportPriceR.amount), SPORT_PACK_NAMES[pendingSport])
      : disclosureBase(formatUsd(basePrice.amount));
    const arlMeta: Record<string, string> = {
      ...meta,
      arl_version: ARL_DISCLOSURE_VERSION,
      arl_offer: pendingSport ? "combo" : "base",
      arl_period: "free",
      arl_price_ids: line_items.map((l) => l.price).join(","),
      arl_amounts: [basePrice.amount, ...(sportPriceR ? [sportPriceR.amount] : [])].join(","),
      arl_ua: (req.headers.get("user-agent") ?? "").slice(0, 255),
      arl_mode: testMode ? "test" : "live",
    };
    const successUrl = pendingSport
      ? `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_success&add=${pendingSport}`
      : `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_success`;
    try {
      const baseParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items,
        allow_promotion_codes: true,
        client_reference_id: body.user_id,
        customer_email: body.email,
        success_url: successUrl,
        cancel_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_cancel`,
        metadata: arlMeta,
        subscription_data: {
          metadata: meta,
          trial_end: 1798822800,
        },
        payment_method_collection: "always",
      };
      let session: Stripe.Checkout.Session;
      let consentOn = true;
      try {
        session = await s.checkout.sessions.create({
          ...baseParams,
          consent_collection: ARL_CONSENT,
          custom_text: {
            submit: { message: `**${disclosure}**` },
            terms_of_service_acceptance: { message: ARL_CONSENT_TEXT },
          },
        });
      } catch (e) {
        if (!isMissingTermsUrlError(e)) throw e;
        console.error("ARL consent unavailable (Terms URL missing in Stripe Public details?)", String((e as Error)?.message));
        consentOn = false;
        await logEvent("checkout_arl_consent_unavailable", { userId: body.user_id, props: { mode: "base", testmode: testMode } });
        session = await s.checkout.sessions.create({
          ...baseParams,
          metadata: { ...arlMeta, arl_consent: "unavailable" },
          custom_text: { submit: { message: `**${disclosure}**` } },
        });
      }
      await logEvent("checkout_started", { userId: body.user_id, sport: pendingSport ?? "general", props: { mode: "base", pending_sport: pendingSport, lead_token: !!body.lead_token, arl_version: ARL_DISCLOSURE_VERSION, arl_consent: consentOn, testmode: testMode } });
      return json(200, { url: session.url, pending_sport: pendingSport });
    } catch (e) {
      const err = e as { message?: string; type?: string; code?: string };
      console.error("stripe base checkout failed", err);
      return json(502, {
        error: "stripe_error",
        stripe_type: err.type ?? null,
        stripe_code: err.code ?? null,
        message: err.message ?? "Stripe checkout session creation failed",
      });
    }
  }
  if (mode === "unlock") {
    const token = body.token ?? "";
    const isSportSlug = token === "bjj" || token === "bodybuilding";
    if (!isSportSlug) return json(404, { error: "invalid_token" });
    const callerU = await getCallerUser(admin, req);
    const userId = callerU?.id ?? null;
    if (!userId) return json(404, { error: "invalid_token" });
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: profileData, error: profileErr } = await asUser.rpc("get_my_profile");
    if (profileErr) {
      console.error("get_my_profile error", profileErr);
      return json(500, { error: "Could not verify Base status" });
    }
    const baseStatus = (profileData as { profile?: { base_status?: string } })?.profile?.base_status;
    if (baseStatus !== "active") {
      return json(409, { error: "base_required", checkout_url: null });
    }
    const priceId = body.price_id ?? SPORT_PRICE_IDS[token];
    if (!priceId) return json(404, { error: "invalid_token" });
    const unlockMeta = { purpose: "sport_unlock", user_id: userId, sport: token };
    const testMode = await callerIsTestFixture(admin, callerU?.email, testRequested);
    const s = testMode ? stripeTest! : stripe;
    let unlockPrice: YearlyPrice;
    try {
      // Live: the caller-supplied price_id (v31 behavior) must still be an active USD yearly price.
      unlockPrice = await resolveYearlyPrice(s, testMode, token, priceId);
    } catch (e) {
      console.error("arl unlock price resolve failed", String(e));
      return json(502, { error: "stripe_error", stripe_type: null, stripe_code: null, message: "Could not load plan price" });
    }
    const freePeriod = inFreePeriod();
    const packName = SPORT_PACK_NAMES[token];
    const sportDisclosure = freePeriod
      ? disclosureSport(formatUsd(unlockPrice.amount), packName)
      : disclosureSportPaid(formatUsd(unlockPrice.amount), packName);
    const unlockArlMeta: Record<string, string> = {
      ...unlockMeta,
      arl_period: freePeriod ? "free" : "paid",
      arl_version: ARL_DISCLOSURE_VERSION,
      arl_offer: "sport",
      arl_price_ids: unlockPrice.id,
      arl_amounts: String(unlockPrice.amount),
      arl_ua: (req.headers.get("user-agent") ?? "").slice(0, 255),
      arl_mode: testMode ? "test" : "live",
    };
    try {
      const unlockParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [{ price: unlockPrice.id, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: userId,
        metadata: unlockArlMeta,
        subscription_data: freePeriod
          ? { metadata: unlockMeta, trial_end: BETA_TRIAL_END_UNIX }
          : { metadata: unlockMeta },
        payment_method_collection: "always",
        success_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=unlock_success`,
        cancel_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=unlock_cancel`,
      };
      let session: Stripe.Checkout.Session;
      let consentOn = true;
      try {
        session = await s.checkout.sessions.create({
          ...unlockParams,
          consent_collection: ARL_CONSENT,
          custom_text: {
            submit: { message: `**${sportDisclosure}**` },
            terms_of_service_acceptance: { message: ARL_CONSENT_TEXT },
          },
        });
      } catch (e) {
        if (!isMissingTermsUrlError(e)) throw e;
        console.error("ARL consent unavailable (Terms URL missing in Stripe Public details?)", String((e as Error)?.message));
        consentOn = false;
        await logEvent("checkout_arl_consent_unavailable", { userId, props: { mode: "unlock", testmode: testMode } });
        session = await s.checkout.sessions.create({
          ...unlockParams,
          metadata: { ...unlockArlMeta, arl_consent: "unavailable" },
          custom_text: { submit: { message: `**${sportDisclosure}**` } },
        });
      }
      await logEvent("checkout_started", { userId, sport: token, props: { mode: "unlock", arl_version: ARL_DISCLOSURE_VERSION, arl_consent: consentOn, testmode: testMode } });
      return json(200, { url: session.url });
    } catch (e) {
      const err = e as { message?: string; type?: string; code?: string };
      console.error("stripe unlock checkout failed", err);
      return json(502, {
        error: "stripe_error",
        stripe_type: err.type ?? null,
        stripe_code: err.code ?? null,
        message: err.message ?? "Stripe checkout session creation failed",
      });
    }
  }
  if (mode === "coach") {
    let userId = body.user_id ?? null;
    if (!userId) userId = await getCallerUserId(admin, req);
    if (!userId || !body.email) return json(400, { error: "user_id and email required" });
    const gym = (body.gym ?? "").trim();
    const meta: Record<string, string> = {
      plan: "coach",
      supabase_user_id: userId,
    };
    if (gym) meta.gym = gym;
    if (body.sport) meta.sport = body.sport;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: COACH_PRICE_ID, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: userId,
        customer_email: body.email,
        success_url: `${COACH_ORIGIN}/onboarding/payment-success`,
        cancel_url: `${COACH_ORIGIN}/signup/coach?checkout=cancel`,
        metadata: meta,
        subscription_data: { metadata: meta },
      });
      return json(200, { url: session.url });
    } catch (e) {
      const err = e as { message?: string; type?: string; code?: string };
      console.error("stripe coach checkout failed", err);
      return json(502, {
        error: "stripe_error",
        stripe_type: err.type ?? null,
        stripe_code: err.code ?? null,
        message: err.message ?? "Stripe checkout session creation failed",
      });
    }
  }
  return json(400, { error: "Invalid mode" });
});
