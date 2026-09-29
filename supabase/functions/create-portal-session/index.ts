// create-portal-session v13 (CA auto-renewal law fix, Legal plan ca-arl-plan-20260929 section 4B, Jim GO via Grant 2026-09-29)
//   - body { action: "cancel_status" }: DB-only state for Settings > Subscription: Base state
//     (active | canceled | none), each sport pack's state, and which subscriptions the signed-in user can cancel.
//     Jim 2026-09-29 (decision c): cancel ends access immediately, so a scheduled cancel also reads as "canceled"
//     (stripe-webhook v40 converts it to an immediate cancel). There is no "active until {date}" state.
//   - body { action: "cancel", target?: "base" | "bjj" | "bodybuilding" }: opens the Stripe Customer Portal straight
//     to the cancel screen (flow_data.type = subscription_cancel) for the CALLER's own subscription only. The
//     subscription id is never taken from the request: target only picks among the JWT user's own rows in
//     public.users / public.sport_entitlements, then Stripe re-checks it (same customer, still active/trialing/
//     past_due, not already canceling). No retention offer is ever requested.
//   - Default (no action): unchanged v12 behavior, the general "Manage billing" portal.
//   - Fixture-only TEST mode, all required: body stripe_test_mode === true, the JWT user's email passes
//     public.is_test_account(email), and STRIPE_TEST_SECRET_KEY starts with sk_test_. Otherwise live key, as before.
// create-portal-session v2
// Fix: env var STRIPE_SECRET_KEY (was lowercase stripe_secret_key in v1)
// Creates a Stripe Billing Portal session so athletes can manage/cancel their subscription
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("stripe_secret_key") ?? "";
const STRIPE_TEST_SECRET = (Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "").trim();

// Release gate: until ARL_LIVE_ENABLED=true, live (non-fixture) callers get the v14 behavior (plain Manage billing
// portal; cancel_status/cancel are ignored). Fixtures using the explicit test flag get the new actions.
const ARL_LIVE = (Deno.env.get("ARL_LIVE_ENABLED") ?? "").toLowerCase() === "true";
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
  let target = "";
  let testRequested = false;
  try {
    const b = await req.json();
    action = String(b?.action ?? "");
    target = String(b?.target ?? "");
    testRequested = b?.stripe_test_mode === true;
  } catch { /* empty body = manage billing */ }

  // Get Stripe customer ID from users table
  const admin = createClient(SUPABASE_URL, SUPABASE_SVC);
  // Cancel-state columns come from migration 20260929060000; fall back so Manage billing never breaks without it.
  type Row = Record<string, unknown>;
  const first = await admin.from("users")
    .select("stripe_customer_id, base_status, base_stripe_subscription_id, base_expiry, base_cancel_at_period_end, base_cancel_at")
    .eq("id", user.id)
    .maybeSingle();
  let userRow = first.data as Row | null;
  if (first.error) {
    console.error("users select (cancel cols) failed, falling back", first.error.message);
    const fb = await admin.from("users")
      .select("stripe_customer_id, base_status, base_stripe_subscription_id, base_expiry")
      .eq("id", user.id)
      .maybeSingle();
    userRow = fb.data as Row | null;
  }

  // Key choice: test key only for test fixtures (and only if a real sk_test_ key is configured).
  let stripeKey = STRIPE_SECRET;
  let usingTest = false;
  if (testRequested && STRIPE_TEST_SECRET.startsWith("sk_test_") && user.email) {
    const { data: isTest } = await admin.rpc("is_test_account", { p_email: user.email });
    if (isTest === true) { stripeKey = STRIPE_TEST_SECRET; usingTest = true; }
  }

  if ((action === "cancel_status" || action === "cancel") && (usingTest || ARL_LIVE)) {
    // Caller's own subscriptions only. Base first (canceling Base also cancels sport packs via stripe-webhook).
    const baseSub = (userRow?.base_stripe_subscription_id as string | null) ?? null;
    const baseScheduled = userRow?.base_cancel_at_period_end === true || !!userRow?.base_cancel_at;
    const baseLive = userRow?.base_status === "active" || userRow?.base_status === "past_due";
    const baseState = !baseSub ? "none"
      : userRow?.base_status === "canceled" || (baseLive && baseScheduled) ? "canceled"
      : baseLive ? "active" : "none";

    const candidates: Candidate[] = [];
    if (userRow?.stripe_customer_id && baseSub && baseState === "active") {
      candidates.push({ subscription_id: baseSub, kind: "base" });
    }
    const sports: { sport: string; state: string; date: string | null; own_subscription: boolean; cancelable: boolean }[] = [];
    const entFirst = await admin.from("sport_entitlements")
      .select("sport, status, stripe_subscription_id, expires_at, cancel_at_period_end, cancel_at")
      .eq("user_id", user.id);
    let ents = entFirst.data as Row[] | null;
    if (entFirst.error) {
      const fb = await admin.from("sport_entitlements")
        .select("sport, status, stripe_subscription_id, expires_at")
        .eq("user_id", user.id);
      ents = fb.data as Row[] | null;
    }
    for (const e of ents ?? []) {
      const sid = e.stripe_subscription_id as string | null;
      const own = !!sid && sid !== baseSub; // own = separate Stripe subscription (sport unlock), not the combo item
      // Combo packs ride on the Base subscription, so they inherit Base's canceled state.
      const inherit = !own && baseState === "canceled";
      const scheduled = e.cancel_at_period_end === true || !!e.cancel_at;
      const state = e.status === "canceled" || inherit || scheduled ? "canceled" : (e.status as string);
      const cancelable = !!userRow?.stripe_customer_id && own && state !== "canceled";
      if (cancelable) candidates.push({ subscription_id: sid!, kind: "sport", sport: e.sport as string });
      sports.push({ sport: e.sport as string, state, date: null, own_subscription: own, cancelable });
    }

    if (action === "cancel_status") {
      const first = candidates[0];
      return json({
        cancelable: !!first, kind: first?.kind ?? null,
        base: { state: baseState, date: null, cancelable: candidates.some((c) => c.kind === "base") },
        sports,
      });
    }

    // action === "cancel": optional target narrows to the caller's own Base or one own pack.
    const picked = target === "base" ? candidates.filter((c) => c.kind === "base")
      : target ? candidates.filter((c) => c.kind === "sport" && c.sport === target)
      : candidates;
    for (const c of picked) {
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
    customer: userRow.stripe_customer_id as string,
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
