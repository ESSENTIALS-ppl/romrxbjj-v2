import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { termsVersion, medicalWaiverVersion, signedName } = body ?? {};
  if (!termsVersion || !medicalWaiverVersion || !signedName?.trim()) {
    return json({ error: "Missing required fields" }, 400);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = req.headers.get("user-agent") ?? null;

  const { error } = await supabase.from("consents").insert({
    user_id: user.id,
    terms_version: termsVersion,
    medical_waiver_version: medicalWaiverVersion,
    signed_name: signedName.trim(),
    ip_address: ip,
    user_agent: ua,
  });

  if (error) return json({ error: error.message }, 400);
  return json({ ok: true }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}