// submit-feedback
// Called by the in-app Feedback widget (Settings section + floating button).
// verify_jwt:false at the gateway (matches the other ROMRx functions); the JWT
// is verified IN-FUNCTION via supabase.auth.getUser(). Anonymous/invalid -> 401.
// Flow: verify user -> validate + sanitize -> server-set severity/status ->
// INSERT into public.client_feedback -> notify jim@romrx.io (HQ) via Resend.
// Sport-aware: caller passes `sport` ("base" | "bjj" | "bodybuilding").
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const JIM_EMAIL    = "jim@romrx.io";

interface Brand { name: string; from: string; replyTo: string; }
const BRANDS: Record<string, Brand> = {
  base: {
    name: "ROMRx",
    from: "Jim Scott <jim@romrx.io>",
    replyTo: "jim@romrx.io",
  },
  bjj: {
    name: "ROMRxBJJ",
    from: "Jim Scott <jim@romrxbjj.com>",
    replyTo: "jim@romrxbjj.com",
  },
  bodybuilding: {
    name: "ROMRxBodybuilding",
    from: "Jim Scott <jim@romrxbodybuilding.com>",
    replyTo: "jim@romrxbodybuilding.com",
  },
};
function brandFor(sport?: string | null): Brand {
  if (sport === "bodybuilding") return BRANDS.bodybuilding;
  if (sport === "bjj") return BRANDS.bjj;
  return BRANDS.base;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Something's broken",
  feature: "Feature idea",
  general: "General feedback",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

async function sendEmail(brand: Brand, to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: brand.from, to: [to], subject, html, reply_to: brand.replyTo }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supaUser.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const { category, message, sport, page_url, app_version, honeypot } = body ?? {};

  if (honeypot) {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (!category || !(category in CATEGORY_LABELS)) {
    return new Response(JSON.stringify({ error: "invalid category" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const msg = typeof message === "string" ? message.normalize("NFC").trim() : "";
  if (msg.length < 5 || msg.length > 1000) {
    return new Response(JSON.stringify({ error: "message must be 5-1000 characters" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const sportKey = sport === "bjj" || sport === "bodybuilding" ? sport : "base";
  const brand = brandFor(sportKey);

  const supaAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const metadata = {
    page_url: typeof page_url === "string" ? page_url.slice(0, 500) : null,
    app_version: typeof app_version === "string" ? app_version.slice(0, 50) : null,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500),
    email: user.email ?? null,
  };
  const { data: row, error: dbErr } = await supaAdmin
    .from("client_feedback")
    .insert({ user_id: user.id, sport: sportKey, category, message: msg, metadata })
    .select("id")
    .single();

  if (dbErr) {
    return new Response(JSON.stringify({ error: "could not save feedback" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const clientName = (user.email ?? "Unknown").split("@")[0];
  const label = CATEGORY_LABELS[category];
  try {
    await sendEmail(brand, JIM_EMAIL,
      `[${brand.name} Feedback] ${label} from ${clientName}`,
      `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="font-family:Georgia,serif;color:#1a2e2e;margin:0 0 12px;">New ${esc(brand.name)} feedback</h2>
        <table style="font-size:14px;color:#1a2e2e;line-height:1.7;border-collapse:collapse;">
          <tr><td style="padding:2px 12px 2px 0;"><strong>Type</strong></td><td>${esc(label)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;"><strong>Client</strong></td><td>${esc(clientName)} (${esc(user.email ?? "")})</td></tr>
          <tr><td style="padding:2px 12px 2px 0;"><strong>Platform</strong></td><td>${esc(brand.name)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;"><strong>Page</strong></td><td>${esc(metadata.page_url ?? "-")}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;"><strong>Date</strong></td><td>${new Date().toLocaleString("en-US")}</td></tr>
        </table>
        <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin-top:16px;white-space:pre-wrap;border-left:3px solid #008080;padding-left:12px;">${esc(msg)}</p>
        <p style="font-size:12px;color:#5a7070;margin-top:20px;">Feedback ID: ${esc(row.id)} - Reply to this email to reach the client.</p>
      </div>`);
  } catch (_) { /* swallow */ }

  return new Response(JSON.stringify({ ok: true, id: row.id }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
