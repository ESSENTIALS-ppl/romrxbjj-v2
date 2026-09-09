// create-checkout-session (v24) — coach mode + dual-unlock
// Modes:
//   mode: "base"   - Base checkout. Optional pending_sport (bjj|bodybuilding) adds sport
//                    price to line_items + metadata for webhook grant.
//   mode: "unlock" - Sport pack checkout, gated on active Base.
//   mode: "coach"  - Coach $349/yr (also accepts plan:"coach" for CoachSignup back-compat).
//                    Metadata uses legacy keys (plan + supabase_user_id) so stripe-webhook
//                    upserts coaches row. Existing BJJ Coach price ID only — no new product.
//
// v24: restore coach checkout path broken when v17+ dropped non-base/unlock modes.
// v23: combo CTA must charge Base+sport (not Base-only). Still uses existing price IDs.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { enforceRateLimit } from "../_shared/rate_limit.ts";

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

// Existing live ROMRxBJJ Coach $349/yr — do not invent products.
const COACH_PRICE_ID = "price_1TKKTgDou9Iktbw0YqnV3411";
const COACH_ORIGIN = Deno.env.get("COACH_ORIGIN") ?? "https://romrxbjj.com";

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });

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
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7);
  const { data } = await admin.auth.getUser(jwt);
  return data.user?.id ?? null;
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

  // Sprint 8 scaffold: rate-limit only — do not change entitlement / Stripe logic
  {
    const limited = enforceRateLimit(req, "create-checkout-session", { corsHeaders: CORS });
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
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Back-compat: CoachSignup historically sent plan:"coach" without mode.
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

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: BASE_PRICE_ID, quantity: 1 },
    ];
    if (pendingSport) {
      const sportPrice = SPORT_PRICE_IDS[pendingSport];
      if (!sportPrice) return json(400, { error: "invalid_pending_sport" });
      line_items.push({ price: sportPrice, quantity: 1 });
    }

    const successUrl = pendingSport
      ? `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_success&add=${pendingSport}`
      : `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_success`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items,
        allow_promotion_codes: true,
        client_reference_id: body.user_id,
        customer_email: body.email,
        success_url: successUrl,
        cancel_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=base_cancel`,
        metadata: meta,
        subscription_data: { metadata: meta },
      });
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

    const userId = await getCallerUserId(admin, req);
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

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: userId,
        metadata: unlockMeta,
        subscription_data: { metadata: unlockMeta },
        success_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=unlock_success`,
        cancel_url: `${PUBLIC_ORIGIN}/app/dashboard?checkout=unlock_cancel`,
      });
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
    // Prefer explicit user_id; fall back to JWT caller (CoachSignup sends Bearer).
    let userId = body.user_id ?? null;
    if (!userId) userId = await getCallerUserId(admin, req);
    if (!userId || !body.email) return json(400, { error: "user_id and email required" });

    const gym = (body.gym ?? "").trim();
    // Legacy metadata — stripe-webhook coach path requires plan=coach + supabase_user_id.
    // Omit purpose so webhook does not take the Base/sport_unlock branches.
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
