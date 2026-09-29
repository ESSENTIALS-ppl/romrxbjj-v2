// create-portal-session v13 (CA auto-renewal law fix, Legal plan ca-arl-plan-20260929 section 4B, Jim GO via Grant 2026-09-29)
//   - body { action: "cancel_status" }: tells the Settings page whether the signed-in user has an active
//     Stripe subscription they can cancel (Base first, else a sport pack). DB-only, no Stripe call.
//   - body { action: "cancel" }: opens the Stripe Customer Portal straight to the cancel screen
//     (flow_data.type = subscription_cancel) for the CALLER's own subscription only. The subscription id is
//     never taken from the request: it is read from public.users / public.sport_entitlements for the JWT user,
//     then re-checked against Stripe (same customer, still active/trialing/past_due, not already canceling).
//   - Default (no action): unchanged v12 behavior, the general "Manage billing" portal.
//   - Fixture-only TEST mode: STRIPE_TEST_SECRET_KEY (sk_test_) is used only when public.is_test_account(email)
//     is true for the signed-in user. Everyone else uses the live key exactly as before.
// create-portal-session v2
// Fix: env var STRIPE_SECRET_KEY (was lowercase stripe_secret_key in v1)
// Creates a Stripe Billing Portal session so athletes can manage/cancel their subscription
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("stripe_secret_key") ?? "";
const STRIPE_TEST_SECRET = (Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

const CANCELABLE = new Set(["active", "trialing", "past_due"]);

type Candidate = { subscription_id: string; kind: "base" | "sport"; sport?: string };

async function stripeGet(key: string, path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${key}` } });
  return { ok: res.ok, body: await res.json() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "Unauthorized" }, 401);
  if (!STRIPE_SECRET) return json({ error: "Stripe not configured" }, 500);

  let action = "";
  try { const b = await req.json(); action = String(b?.action ?? ""); } catch { /* empty body = manage billing */ }

  // Get Stripe customer ID from users table
  const admin = createClient(SUPABASE_URL, SUPABASE_SVC);
  const { data: userRow } = await admin.from("users")
    .select("stripe_customer_id, base_status, base_stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  // Key choice: test key only for test fixtures (and only if a real sk_test_ key is configured).
  let stripeKey = STRIPE_SECRET;
  if (STRIPE_TEST_SECRET.startsWith("sk_test_") && user.email) {
    const { data: isTest } = await admin.rpc("is_test_account", { p_email: user.email });
    if (isTest === true) stripeKey = STRIPE_TEST_SECRET;
  }

  if (action === "cancel_status" || action === "cancel") {
    // Caller's own subscriptions only. Base first (cancelling Base also cancels sport packs via stripe-webhook).
    const candidates: Candidate[] = [];
    if (userRow?.stripe_customer_id && userRow.base_stripe_subscription_id &&
        (userRow.base_status === "active" || userRow.base_status === "past_due")) {
      candidates.push({ subscription_id: userRow.base_stripe_subscription_id as string, kind: "base" });
    }
    if (userRow?.stripe_customer_id) {
      const { data: ents } = await admin.from("sport_entitlements")
        .select("sport, status, stripe_subscription_id")
        .eq("user_id", user.id);
      for (const e of ents ?? []) {
        const sid = e.stripe_subscription_id as string | null;
        if (!sid || e.status === "canceled") continue;
        if (candidates.some((c) => c.subscription_id === sid)) continue; // combo: same subscription as Base
        candidates.push({ subscription_id: sid, kind: "sport", sport: e.sport as string });
      }
    }

    if (action === "cancel_status") {
      const first = candidates[0];
      return json({ cancelable: !!first, kind: first?.kind ?? null });
    }

    // action === "cancel": verify with Stripe, then open the portal cancel flow.
    for (const c of candidates) {
      const { ok, body: sub } = await stripeGet(stripeKey, `subscriptions/${encodeURIComponent(c.subscription_id)}`);
      if (!ok) { console.error("subscription lookup failed", c.subscription_id, sub?.error?.message); continue; }
      if (sub.customer !== userRow?.stripe_customer_id) { console.error("subscription/customer mismatch", c.subscription_id); continue; }
      if (!CANCELABLE.has(sub.status) || sub.cancel_at_period_end || sub.cancel_at) continue;

      const origin = req.headers.get("origin") ?? "https://romrx.io";
      const returnUrl = `${origin}/app/dashboard/settings`;
      const params = new URLSearchParams({
        customer: userRow!.stripe_customer_id as string,
        return_url: returnUrl,
        "flow_data[type]": "subscription_cancel",
        "flow_data[subscription_cancel][subscription]": c.subscription_id,
        "flow_data[after_completion][type]": "redirect",
        "flow_data[after_completion][redirect][return_url]": `${returnUrl}?canceled=1`,
      });
      const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const session = await res.json();
      if (!res.ok) {
        console.error("portal cancel flow failed", session?.error?.message);
        return json({ error: session.error?.message ?? "Stripe error" }, 500);
      }
      return json({ url: session.url, kind: c.kind });
    }
    return json({ error: "No active subscription to cancel." }, 404);
  }

  if (!userRow?.stripe_customer_id) {
    return json({ error: "No subscription found. Contact support at hello@romrx.io" }, 404);
  }

  const origin = req.headers.get("origin") ?? "https://romrx.io";

  // Create Stripe Customer Portal session
  const params = new URLSearchParams({
    customer: userRow.stripe_customer_id,
    return_url: `${origin}/app/dashboard/settings`,
  });

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const session = await res.json();
  if (!res.ok) return json({ error: session.error?.message ?? "Stripe error" }, 500);
  return json({ url: session.url });
});
