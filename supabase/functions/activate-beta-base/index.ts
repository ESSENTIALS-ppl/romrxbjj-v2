// activate-beta-base (v1) — Grant Base dashboard during beta WITHOUT Stripe.
// Jim lock: Base free through Dec 31 2026; billing starts Jan 1 2027.
// base_status is protected (guard_users_protected_columns) — only service_role
// may set it. Never set client-side (incident 2026-06-10).
//
// Behavior:
//   - Requires caller JWT (Authorization Bearer).
//   - If now < 2027-01-01Z → set public.users.base_status='active' for caller.
//   - Else → 402 { error: "beta_ended", checkout_required: true } (FE falls back to Stripe).
// Idempotent when already active. Does NOT invent sport entitlements or Stripe IDs.
// Rate limit: lightweight inline (fail-open) — no shared import so deploy is single-file.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Exclusive end of free beta (UTC). Billing begins 2027-01-01. */
const BETA_ENDS_AT = new Date("2027-01-01T00:00:00.000Z");
const RL_LIMIT = 20;
const RL_WINDOW_MS = 3_600_000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

async function rateLimitOrNull(identity: string): Promise<Response | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: `activate-beta-base:${identity}`,
      p_limit: RL_LIMIT,
      p_window_ms: RL_WINDOW_MS,
    });
    if (error) return null; // fail-open
    const row = data as { allowed?: boolean; reset_at?: number } | null;
    if (row && row.allowed === false) {
      const retry = Math.max(1, Math.ceil(((row.reset_at ?? Date.now() + RL_WINDOW_MS) - Date.now()) / 1000));
      return json(429, { error: "rate_limit_exceeded", message: "Too many requests. Please try again later." });
    }
  } catch {
    // fail-open
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const xf = req.headers.get("x-forwarded-for");
  const ip = (xf ? xf.split(",")[0]!.trim() : null)
    ?? req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  {
    const limited = await rateLimitOrNull(ip);
    if (limited) return limited;
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );

  const { data: { user }, error: userErr } = await anon.auth.getUser();
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  {
    const limited = await rateLimitOrNull(user.id);
    if (limited) return limited;
  }

  const now = new Date();
  if (now >= BETA_ENDS_AT) {
    return json(402, {
      error: "beta_ended",
      checkout_required: true,
      message: "Beta free unlock ended. Use Stripe checkout.",
      beta_ends_at: BETA_ENDS_AT.toISOString(),
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Ensure public.users row exists (orphan-safe) without touching entitlements.
  await admin.from("users").upsert({
    id: user.id,
    email: user.email ?? `${user.id}@unknown.local`,
    portal_role: "athlete",
    base_status: "inactive",
  }, { onConflict: "id", ignoreDuplicates: true });

  const { data: before } = await admin
    .from("users")
    .select("id, base_status, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!before) {
    return json(500, { error: "profile_missing" });
  }

  if (before.base_status === "active") {
    return json(200, {
      ok: true,
      already_active: true,
      base_status: "active",
      beta_ends_at: BETA_ENDS_AT.toISOString(),
    });
  }

  const { data: updated, error: updErr } = await admin
    .from("users")
    .update({ base_status: "active" })
    .eq("id", user.id)
    .select("id, base_status")
    .maybeSingle();

  if (updErr) {
    console.error("activate-beta-base update failed", updErr);
    return json(500, { error: "activate_failed", message: updErr.message });
  }

  if (!updated || updated.base_status !== "active") {
    return json(500, { error: "activate_failed", message: "base_status not active after update" });
  }

  console.log(JSON.stringify({
    event: "activate_beta_base",
    user_id: user.id,
    from: before.base_status,
    to: "active",
    at: now.toISOString(),
  }));

  return json(200, {
    ok: true,
    already_active: false,
    base_status: "active",
    beta_ends_at: BETA_ENDS_AT.toISOString(),
  });
});
