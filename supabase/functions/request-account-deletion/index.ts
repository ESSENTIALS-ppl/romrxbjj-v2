// request-account-deletion
// In-app "Request account deletion" button on romrx.io and romrxbjj.com.
// Jim GO 2026-09-24. This function NEVER deletes, cancels or changes user data.
// Flow: verify_jwt:true at the gateway AND getUser() in-function -> per-user
// rate limit (rate_limit_hit RPC) -> email
// privacy@romrx.io via Resend (same RESEND_API_KEY path as submit-feedback) ->
// on Resend success only, write a client_feedback note as a second record.
// If the email fails the caller gets a non-2xx and must show an error.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const PRIVACY_TO = "privacy@romrx.io";
const FROM = "ROMRx Privacy <jim@romrx.io>";
const SITES = ["romrx.io", "romrxbjj.com"] as const;
type Site = typeof SITES[number];

// Basic repeat-tap protection: 3 requests per user per hour.
const RL_LIMIT = 3;
const RL_WINDOW_MS = 3_600_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

function formatET(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "numeric", minute: "2-digit", second: "2-digit",
    timeZoneName: "short",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { ok: false, error: "unauthorized" });
  const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await supaUser.auth.getUser();
  if (userErr || !user) return json(401, { ok: false, error: "unauthorized" });

  const body = await req.json().catch(() => ({}));
  const site: Site | null = SITES.includes(body?.site) ? body.site as Site : null;
  if (!site) return json(400, { ok: false, error: "invalid_site" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limit (fail-open on RPC error, same as the other edges).
  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: `request-account-deletion:${user.id}`,
      p_limit: RL_LIMIT,
      p_window_ms: RL_WINDOW_MS,
    });
    const row = data as { allowed?: boolean } | null;
    if (!error && row && row.allowed === false) {
      return json(429, { ok: false, error: "rate_limited" });
    }
  } catch { /* fail-open */ }

  if (!RESEND_KEY) {
    console.error("[request-account-deletion] RESEND_API_KEY missing");
    return json(502, { ok: false, error: "email_failed" });
  }

  const now = new Date();
  const iso = now.toISOString();
  const et = formatET(now);
  const email = user.email ?? "(no email on account)";

  const subject = `Account deletion request: ${email} (${site})`;
  const rows: Array<[string, string]> = [
    ["Email", email],
    ["User ID", user.id],
    ["Requested (ISO)", iso],
    ["Requested (ET)", et],
    ["Source site", site],
  ];
  const text = [
    "Account deletion request from the in-app button.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Nothing was deleted or canceled automatically. Confirm with the user by email and complete within 30 days.",
  ].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2e2e;">
  <h2 style="margin:0 0 12px;">Account deletion request</h2>
  <table style="font-size:14px;line-height:1.7;border-collapse:collapse;">
    ${rows.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;"><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join("\n    ")}
  </table>
  <p style="font-size:13px;margin-top:16px;">Nothing was deleted or canceled automatically. Confirm with the user by email and complete within 30 days.</p>
</div>`;

  let resendId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [PRIVACY_TO],
        subject,
        html,
        text,
        ...(user.email ? { reply_to: user.email } : {}),
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || typeof out?.id !== "string") {
      console.error("[request-account-deletion] resend failed", { status: res.status, name: out?.name });
      return json(502, { ok: false, error: "email_failed" });
    }
    resendId = out.id;
  } catch (err) {
    console.error("[request-account-deletion] resend exception", { err: String(err) });
    return json(502, { ok: false, error: "email_failed" });
  }

  // Second record (best effort). Also flows to Notion via the existing trigger.
  let feedbackId: string | null = null;
  try {
    const { data: fb, error: fbErr } = await admin
      .from("client_feedback")
      .insert({
        user_id: user.id,
        sport: site === "romrxbjj.com" ? "bjj" : "base",
        category: "general",
        message: `Account deletion requested by ${email} (id: ${user.id}) on ${site} at ${iso}. Emailed ${PRIVACY_TO} (Resend ${resendId}). Nothing deleted.`,
        metadata: {
          page_url: "/settings",
          email: user.email ?? null,
          user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
          kind: "account_deletion_request",
          site,
          resend_id: resendId,
        },
      })
      .select("id")
      .single();
    if (fbErr) console.error("[request-account-deletion] feedback insert failed", { code: fbErr.code });
    else feedbackId = fb.id;
  } catch (err) {
    console.error("[request-account-deletion] feedback exception", { err: String(err) });
  }

  return json(200, { ok: true, resend_id: resendId, feedback_id: feedbackId, site, requested_at: iso });
});
