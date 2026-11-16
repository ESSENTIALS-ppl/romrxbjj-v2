// unsubscribe v9 (2026-11-02, FG-09/10/11): adds the scoped signed-token path (?t=...) for lifecycle emails on top of v8.
// The v8 email path below is UNCHANGED (kept verbatim from live v8, see v8_index_reference.ts.txt).
// Secret name (NOT set by this batch): UNSUBSCRIBE_HMAC_SECRET (>= 32 chars). With no secret, tokens never verify (fail closed).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { logEvent } from "../_shared/events.ts";
import { handleTokenRequest, needsRateLimit, SCOPE_COLUMN } from "./token_path.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "Method not allowed" });

  // A valid signed one-click POST (and any GET with a token, which only redirects) is never rate limited: a genuine opt-out must not be refused,
  // even from a shared mail-provider IP. Everything else (v8 email path, bad or missing tokens) keeps the 20 per hour per IP limit.
  if (await needsRateLimit(req.clone(), Deno.env.get("UNSUBSCRIBE_HMAC_SECRET"))) {
    const limited = await enforceRateLimit(req, "unsubscribe", { corsHeaders: CORS, config: { limit: 20, windowMs: 3600000 } });
    if (limited) return limited;
  }

  // v9: token path. POST one-click applies; GET only redirects to the brand confirm page (applies nothing).
  const tok = await handleTokenRequest(req, {
    secret: Deno.env.get("UNSUBSCRIBE_HMAC_SECRET"),
    apply: async (userId, scope) => {
      const a = admin();
      let n = 0;
      if (scope === "all") {
        const u = await a.from("users").update({ marketing_opt_out: true }).eq("id", userId).select("id");
        if (u.error) throw new Error("users update failed");
        n += u.data?.length ?? 0;
        const p = await a.from("notification_preferences")
          .update({ retest_reminders: false, email_reminders: false, weekly_digest: false }).eq("user_id", userId).select("id");
        if (p.error) throw new Error("preferences update failed");
        n += p.data?.length ?? 0;
      } else {
        const p = await a.from("notification_preferences").update({ [SCOPE_COLUMN[scope]]: false }).eq("user_id", userId).select("id");
        if (p.error) throw new Error("preferences update failed");
        n += p.data?.length ?? 0;
      }
      return n;
    },
    log: (userId, scope) => logEvent("unsubscribed", { userId, props: { via: "email_token", scope } }),
  });
  if (tok) {
    if (tok.redirect) return new Response(null, { status: tok.status, headers: { Location: tok.redirect, "Cache-Control": "no-store", ...CORS } });
    return json(tok.status, tok.body ?? {});
  }

  // v8 email path (unchanged)
  let email = "";
  if (req.method === "GET") {
    email = new URL(req.url).searchParams.get("email") ?? "";
  } else {
    try { const b = await req.json(); email = String(b?.email ?? ""); } catch { return json(400, { error: "Invalid JSON" }); }
  }
  email = email.toLowerCase().trim();
  if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: "Valid email required" });

  const a = admin();
  const { data, error } = await a.from("users").update({ marketing_opt_out: true }).ilike("email", email).select("id");
  if (error) console.error("unsubscribe update failed:", error.message);
  const matched = data?.length ?? 0;
  if (matched > 0) {
    await logEvent("unsubscribed", { userId: data![0].id as string, props: { via: "email_link" } });
  }
  console.log(`unsubscribe: ${matched} row(s) updated`);
  return json(200, { ok: true });
});
