// create-portal-session v2
// Fix: env var STRIPE_SECRET_KEY (was lowercase stripe_secret_key in v1)
// Creates a Stripe Billing Portal session so athletes can manage/cancel their subscription
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? Deno.env.get("stripe_secret_key") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "Unauthorized" }, 401);
  if (!STRIPE_SECRET) return json({ error: "Stripe not configured" }, 500);

  // Get Stripe customer ID from users table
  const admin = createClient(SUPABASE_URL, SUPABASE_SVC);
  const { data: userRow } = await admin.from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

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
    headers: { Authorization: `Bearer ${STRIPE_SECRET}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const session = await res.json();
  if (!res.ok) return json({ error: session.error?.message ?? "Stripe error" }, 500);
  return json({ url: session.url });
});
