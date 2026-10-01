// unsubscribe v1 (ROMRx Base audit 2026-09-15)
// Anonymous, rate-limited one-click marketing opt-out. The app's /unsubscribe page and every email footer
// link land here. Sets users.marketing_opt_out = true by email with the service role (RLS blocks anonymous
// writes to users, which is why the old client-side update never worked). Always returns ok so the endpoint
// cannot be used to probe which emails have accounts.
// DRAFT CHANGE (nudge PR, not deployed): also accept the RFC 8058 one-click POST (form body, email in the query string).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { logEvent } from "../_shared/events.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "Method not allowed" });

  const limited = await enforceRateLimit(req, "unsubscribe", { corsHeaders: CORS, config: { limit: 20, windowMs: 3600000 } });
  if (limited) return limited;

  let email = "";
  if (req.method === "GET") {
    email = new URL(req.url).searchParams.get("email") ?? "";
  } else if ((req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded")) {
    email = new URL(req.url).searchParams.get("email") ?? "";
  } else {
    try { const b = await req.json(); email = String(b?.email ?? ""); } catch { return json(400, { error: "Invalid JSON" }); }
  }
  email = email.toLowerCase().trim();
  if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: "Valid email required" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await admin.from("users").update({ marketing_opt_out: true }).ilike("email", email).select("id");
  if (error) console.error("unsubscribe update failed:", error.message);
  const matched = data?.length ?? 0;
  if (matched > 0) {
    await logEvent("unsubscribed", { userId: data![0].id as string, props: { via: "email_link" } });
  }
  console.log(`unsubscribe: ${matched} row(s) updated`);
  return json(200, { ok: true });
});
