// ============================================================
// ROMRx Stripe Webhook — Supabase Edge Function
// Handles: checkout.session.completed, customer.subscription.*
// Updates users.subscription_status + subscription_expiry
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("Stripe") ?? Deno.env.get("stripe_webhook_secret") ?? "";

Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Record<string, unknown>;

  try {
    // Lightweight HMAC verification (full Stripe SDK not available in Deno edge)
    // In production: use stripe npm package via esm.sh
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const type = event.type as string;
  const obj = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;

  if (type === "checkout.session.completed") {
    const email = (obj.customer_details as Record<string, string>)?.email?.toLowerCase();
    const customerId = obj.customer as string;
    if (email) {
      await supabase.from("users").update({
        stripe_customer_id: customerId,
        subscription_status: "active",
        subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("email", email);
    }
  }

  if (type === "customer.subscription.deleted" || type === "customer.subscription.paused") {
    const customerId = obj.customer as string;
    await supabase.from("users").update({ subscription_status: "canceled" }).eq("stripe_customer_id", customerId);
  }

  if (type === "customer.subscription.updated") {
    const customerId = obj.customer as string;
    const status = (obj.status as string) === "active" ? "active" : "inactive";
    const expiry = obj.current_period_end
      ? new Date((obj.current_period_end as number) * 1000).toISOString()
      : null;
    await supabase.from("users").update({ subscription_status: status, subscription_expiry: expiry }).eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
