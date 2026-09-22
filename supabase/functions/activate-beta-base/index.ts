// activate-beta-base (v2) — TEMP free Unlock gated by ops.feature_flags.free_unlock
// Jim corrected 2026-09-22: NOT permanent Dec31 free. TEMP for Heavy audit only.
// After audit cleanup residue 0: SET ops.feature_flags.enabled=false WHERE key='free_unlock'
// → Unlock falls through to Stripe (paywall = billing + bot/security).
// base_status only via service_role (never client-side — incident 2026-06-10).
// Idempotent. Does NOT invent sport entitlements or Stripe IDs.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RL_LIMIT = 20;
const RL_WINDOW_MS = 3_600_000;
const FLAG_KEY = "free_unlock";

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
    if (error) return null;
    const row = data as { allowed?: boolean } | null;
    if (row && row.allowed === false) {
      return json(429, { error: "rate_limited" });
    }
  } catch {
    /* fail-open */
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  {
    const limited = await rateLimitOrNull(req.headers.get("x-forwarded-for") ?? "ip");
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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // TEMP flag: ops.feature_flags.free_unlock must be true. Env FREE_UNLOCK_ENABLED=true also works as override.
  const envOn = (Deno.env.get("FREE_UNLOCK_ENABLED") ?? "").toLowerCase() === "true";
  let flagOn = envOn;
  if (!flagOn) {
    const { data: flagRow } = await admin
      .schema("ops")
      .from("feature_flags")
      .select("enabled")
      .eq("key", FLAG_KEY)
      .maybeSingle();
    flagOn = flagRow?.enabled === true;
  }

  if (!flagOn) {
    return json(402, {
      error: "free_unlock_disabled",
      checkout_required: true,
      message: "Temporary free Unlock is off. Use Stripe checkout.",
    });
  }

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

  if (!before) return json(500, { error: "profile_missing" });

  if (before.base_status === "active") {
    return json(200, {
      ok: true,
      already_active: true,
      base_status: "active",
      free_unlock: true,
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
    flag: FLAG_KEY,
    at: new Date().toISOString(),
  }));

  return json(200, {
    ok: true,
    already_active: false,
    base_status: "active",
    free_unlock: true,
  });
});
