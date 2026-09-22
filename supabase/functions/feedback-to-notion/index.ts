// feedback-to-notion
// Triggered by a Supabase Database Webhook on INSERT into public.client_feedback.
// Maps the new row into the Notion "Client Feedback" database so triage starts
// in Notion automatically. One-way sync (Supabase -> Notion).
//
// Auth model: invoked server-to-server by the Supabase webhook. We protect it
// with a shared secret header (WEBHOOK_SECRET) since verify_jwt is false.
// Requires Supabase secrets: NOTION_API_KEY, NOTION_FEEDBACK_DB_ID, WEBHOOK_SECRET
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOTION_API_KEY = (Deno.env.get("NOTION_API_KEY") ?? "").trim();
const NOTION_DB_ID   = (Deno.env.get("NOTION_FEEDBACK_DB_ID") ?? "").trim();
const WEBHOOK_SECRET = (Deno.env.get("WEBHOOK_SECRET") ?? "").trim();
const NOTION_VERSION = "2022-06-28";

// ── Mappings: app values -> Notion option names (must match the DB exactly) ──
const CATEGORY_TO_NOTION: Record<string, string[]> = {
  bug: ["UX Bug"],
  feature: ["Feature Request"],
  general: [], // general feedback: no category tag; triager classifies
};
const SPORT_TO_PLATFORM: Record<string, string> = {
  base: "ROMRx",
  bjj: "ROMRxBJJ",
  bodybuilding: "ROMRxBodybuilding",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  // Shared-secret gate (header set on the Supabase webhook config)
  const gotSecret = (req.headers.get("x-webhook-secret") ?? "").trim();
  if (WEBHOOK_SECRET && gotSecret !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  // Supabase DB webhook shape: { type, table, record, old_record, schema }
  const row = payload?.record ?? payload;
  if (!row || !row.id) {
    return new Response(JSON.stringify({ error: "no record" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Match submit-feedback: keep bjj|bodybuilding; everything else (incl. base) → base/ROMRx.
  // Previously non-bodybuilding defaulted to bjj and mis-labeled Base feedback as ROMRxBJJ.
  const sport = row.sport === "bjj" || row.sport === "bodybuilding" ? row.sport : "base";
  const platform = SPORT_TO_PLATFORM[sport];
  const categories = CATEGORY_TO_NOTION[row.category] ?? [];
  const email: string = row?.metadata?.email ?? "";
  const clientName = email ? email.split("@")[0] : "Unknown client";
  const pageUrl: string = row?.metadata?.page_url ?? "";
  const dateStart: string = (row.created_at ?? new Date().toISOString()).slice(0, 10);

  const notes =
    `${row.message ?? ""}` +
    `\n\n— ${email || "unknown"}` +
    (pageUrl ? ` · page: ${pageUrl}` : "") +
    `\nSupabase feedback id: ${row.id}`;

  const properties: Record<string, unknown> = {
    "Client Name": { title: [{ text: { content: clientName.slice(0, 200) } }] },
    "Notes": { rich_text: [{ text: { content: notes.slice(0, 2000) } }] },
    "Platform": { select: { name: platform } },
    "Status": { select: { name: "Logged" } },
    "Priority": { select: { name: "P2 Medium" } },
    "Date": { date: { start: dateStart } },
  };
  if (categories.length) {
    properties["Category"] = { multi_select: categories.map((name) => ({ name })) };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("notion create failed", res.status, detail);
    return new Response(JSON.stringify({ error: "notion create failed", status: res.status, detail }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }

  const created = await res.json();
  return new Response(JSON.stringify({ ok: true, notion_page_id: created.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
