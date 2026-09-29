// notify-inbound-lead
// Emails Jim when a romrx.io lead form row is inserted:
//   public.investor_requests  (romrx.io/investors form)
//   public.partner_inquiries  (romrx.io/partners form)
//
// Why here and not in the Netlify function: the romrx.io Netlify site has no
// RESEND_API_KEY, and copying provider keys to more places widens exposure.
// The Netlify function only persists the row; an AFTER INSERT trigger
// (public.tg_webhook_notify_inbound_lead) calls this function via pg_net with
// the Vault secret lead_notify_webhook_secret in x-webhook-secret.
//
// Auth: verify_jwt = false; the Vault-backed header is the gate (fails CLOSED),
// same model as feedback-to-notion v16. Verified with RPC
// public.verify_webhook_secret (service_role only; returns boolean).
// Logs never include the submitter's name, email or notes: only table, row id
// and the Resend message id.
// 2026-09-29 v2: partner email reads the live form fields (website,
// product_category, offer_type); v1 read the old track/athletes names.
// Requires: RESEND_API_KEY (+ auto-injected SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const VAULT_SECRET_NAME = "lead_notify_webhook_secret";
const TO = "jim@romrx.io";
const FROM = "ROMRx Leads <jim@romrx.io>";

async function webhookSecretOk(got: string): Promise<boolean> {
  if (!got || !SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("verify_webhook_secret", {
      p_name: VAULT_SECRET_NAME,
      p_candidate: got,
    });
    if (error) console.error("verify_webhook_secret error:", error.message);
    return data === true;
  } catch (e) {
    console.error("verify_webhook_secret threw:", String(e));
    return false;
  }
}

const oneLine = (v: unknown, max = 200) =>
  String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const got = (req.headers.get("x-webhook-secret") ?? "").trim();
  if (!(await webhookSecretOk(got))) return new Response("forbidden", { status: 403 });

  const payload = await req.json().catch(() => null);
  const table = payload?.table;
  const r = payload?.record;
  if (!r?.id || (table !== "investor_requests" && table !== "partner_inquiries")) {
    return json({ error: "unsupported payload" }, 400);
  }
  if (!RESEND_API_KEY) {
    console.error(`notify-inbound-lead: RESEND_API_KEY missing; ${table} ${r.id} not emailed`);
    return json({ error: "email not configured" }, 500);
  }

  const email = oneLine(r.email, 320);
  let subject: string;
  let lines: string[];
  if (table === "investor_requests") {
    subject = `Investor request: ${oneLine(r.name, 80)}${r.firm ? ` (${oneLine(r.firm, 80)})` : ""}`;
    lines = [
      `Name:  ${oneLine(r.name)}`,
      `Email: ${email}`,
      `Firm:  ${oneLine(r.firm) || "(not provided)"}`,
      `Stage: ${oneLine(r.stage) || "(not provided)"}`,
      "",
      "Notes:",
      String(r.notes ?? "").slice(0, 5000) || "(none)",
    ];
  } else {
    // Live /partners form (#100): website, product_category, offer_type.
    // track/athletes are legacy (old 3-track form); shown only if present.
    const cat = oneLine(r.product_category, 60);
    subject = `Partner inquiry: ${oneLine(r.org, 80)}${cat ? ` (${cat})` : ""}`;
    lines = [
      `Name:             ${oneLine(r.name)}`,
      `Email:            ${email}`,
      `Brand/company:    ${oneLine(r.org)}`,
      `Website:          ${oneLine(r.website, 500) || "(not provided)"}`,
      `Product category: ${cat || "(not provided)"}`,
      `How to partner:   ${oneLine(r.offer_type) || "(not provided)"}`,
    ];
    if (r.track) lines.push(`Track (legacy):    ${oneLine(r.track)}`);
    if (r.athletes) lines.push(`Athletes (legacy): ${oneLine(r.athletes)}`);
    lines.push("", "Notes:", String(r.notes ?? "").slice(0, 5000) || "(none)");
  }
  lines.push("", `Source: ${oneLine(r.source) || "romrx.io"}`, `Row: ${table} ${r.id}`,
    "Reply to this email to answer the sender directly.");

  const body: Record<string, unknown> = { from: FROM, to: [TO], subject, text: lines.join("\n") };
  if (EMAIL_RE.test(email)) body.reply_to = email;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`notify-inbound-lead: Resend ${res.status} for ${table} ${r.id}`);
    return json({ error: "send failed", status: res.status }, 502);
  }
  console.log(`notify-inbound-lead: sent ${table} ${r.id} resend_id=${out?.id ?? "?"}`);
  return json({ ok: true, table, row_id: r.id, resend_id: out?.id ?? null });
});
