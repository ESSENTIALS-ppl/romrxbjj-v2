// activate-beta-base (v5) — AUDIT-TEMPS ONLY free Unlock (Jim hard lock 2026-09-22 ~3:54 PM ET)
// Real accounts MUST still hit Stripe. Global free Unlock = REJECTED.
// Allow if ALL of:
//   1) ops.feature_flags.free_unlock=true (master kill; set false after cleanup), AND
//   2) caller email ILIKE jim+romrx-audit-20260922-%  OR  auth uid on Heavy manifest allowlist
// Else → 402 checkout_required (Stripe). Never set active client-side (incident 2026-06-10).

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
const AUDIT_EMAIL_RE = /^jim\+romrx-audit-20260922-\d{2}@romrx\.io$/i;
/** Heavy manifest UIDs 20260922 (01–10). Dead after cleanup; keep gated by flag. */
const AUDIT_UID_ALLOWLIST = new Set<string>([
  "0e034562-f0c4-47c9-8ce3-a0310fb40391",
  "591c8d8b-6c54-4deb-830e-534c5bf78434",
  "1c29432c-a8e3-4a00-b2e2-fb3060b7a12c",
  "876a268a-d2bd-4419-91e5-ad75af291033",
  "890e6abd-432c-4c61-b787-4dddc1718f4a",
  "e48b198f-8e77-41f4-93aa-d1e211421a71",
  "4ab08cd9-23b7-4228-9ced-c8936c5707c6",
  "ef8ca63a-3a73-43b8-9a83-d7ab6d963965",
  "43638983-61de-46bd-954a-b563ac4baea3",
  "40150fa4-ff3f-4b69-bb6f-ca1bc0409ebe"
]);

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

function isAuditTemp(email: string | undefined, userId: string): boolean {
  const em = (email ?? "").trim().toLowerCase();
  if (AUDIT_EMAIL_RE.test(em)) return true;
  if (AUDIT_UID_ALLOWLIST.has(userId)) return true;
  return false;
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

  // HARD: non-audit callers never get free Unlock — Stripe path.
  if (!isAuditTemp(user.email, user.id)) {
    return json(402, {
      error: "not_audit_temp",
      checkout_required: true,
      message: "Free Unlock is audit-temps only. Use Stripe checkout.",
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Master kill after Heavy cleanup (flag false → even audit temps hit Stripe).
  const envOn = (Deno.env.get("FREE_UNLOCK_ENABLED") ?? "").toLowerCase() === "true";
  let flagOn = envOn;
  if (!flagOn) {
    // public.feature_flags view → ops.feature_flags (ops schema not exposed to Data API)
    const { data: flagRow } = await admin
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
      message: "Temporary audit Unlock is off. Use Stripe checkout.",
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

  // Defense in depth: public.users email must also match audit pattern when present.
  const profileEmail = (before.email ?? user.email ?? "").trim().toLowerCase();
  if (!AUDIT_EMAIL_RE.test(profileEmail) && !AUDIT_UID_ALLOWLIST.has(user.id)) {
    return json(402, {
      error: "not_audit_temp",
      checkout_required: true,
      message: "Free Unlock is audit-temps only. Use Stripe checkout.",
    });
  }

  if (before.base_status === "active") {
    return json(200, {
      ok: true,
      already_active: true,
      base_status: "active",
      audit_temp_only: true,
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
    event: "activate_beta_base_audit_only",
    user_id: user.id,
    email: profileEmail,
    from: before.base_status,
    to: "active",
    at: new Date().toISOString(),
  }));

  return json(200, {
    ok: true,
    already_active: false,
    base_status: "active",
    audit_temp_only: true,
  });
});
