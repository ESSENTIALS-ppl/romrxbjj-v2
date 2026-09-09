// ============================================================
// ROMRx embed-knowledge — Supabase Edge Function
// Sprint 2: require x-romrx-cron-secret or Authorization Bearer matching ROMRX_CRON_SECRET/CRON_SECRET
// Embeds all rombot_knowledge rows that lack an embedding
// Uses OpenAI text-embedding-ada-002
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_KEY = Deno.env.get("romrx_openai_key") ?? "";

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-ada-002", input: text.slice(0, 8000) }),
    });
    const data = await res.json();
    if (!res.ok) { console.error("OpenAI embeddings error:", data.error?.message); return null; }
    return data.data?.[0]?.embedding ?? null;
  } catch (err) { console.error("Embedding fetch error:", err); return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-romrx-cron-secret" } });
  }

  // Sprint 2: require cron secret (header or Bearer). verify_jwt stays false for cron callers.
  const expected = Deno.env.get("ROMRX_CRON_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "";
  const headerSecret = req.headers.get("x-romrx-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = headerSecret || bearer;
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: rows, error: fetchError } = await supabase.from("rombot_knowledge").select("id, topic, chunk").is("embedding", null);
    if (fetchError) throw new Error(`Failed to fetch rows: ${fetchError.message}`);
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ message: "No rows to embed", embedded: 0 }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    let embedded = 0, failed = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const embedding = await getEmbedding(`${row.topic}: ${row.chunk}`);
      if (!embedding) { failed++; errors.push(`Row ${row.id}: embedding failed`); continue; }
      const { error: updateError } = await supabase.from("rombot_knowledge").update({ embedding }).eq("id", row.id);
      if (updateError) { failed++; errors.push(`Row ${row.id}: ${updateError.message}`); } else { embedded++; }
      await new Promise(r => setTimeout(r, 100));
    }
    return new Response(JSON.stringify({ message: "Embedding complete", total_rows: rows.length, embedded, failed, errors: errors.length > 0 ? errors : undefined }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
