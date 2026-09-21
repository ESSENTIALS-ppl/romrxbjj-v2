// send-s1-welcome-email v19-recovery (emergency restore after placeholder) — email_sends + stable Idempotency-Key
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logEvent } from "../_shared/events.ts";
const EMAIL_ID = "s1_1_welcome";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
async function callerIsTrusted(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) return true;
  if (!SUPABASE_URL) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rate_limit_buckets?select=bucket_key&limit=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
    });
    return res.status === 200;
  } catch { return false; }
}
Deno.serve(async (req) => {
  try {
    if (!(await callerIsTrusted(req))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const payload = await req.json();
    const record = payload?.record ?? payload;
    const email = record?.email ?? record?.new?.email;
    const meta = record?.raw_user_meta_data ?? record?.new?.raw_user_meta_data ?? {};
    const rawName = meta?.full_name ?? "";
    const firstName = String(rawName).split(" ")[0] || "there";
    const rawSport = String(meta?.active_sport ?? "").toLowerCase();
    const sport = rawSport === "bjj" ? "bjj" : rawSport === "bodybuilding" ? "bodybuilding" : "general";
    const userId = String(record?.id ?? record?.new?.id ?? "").trim();
    if (!email) return new Response(JSON.stringify({ error: "No email found" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (!userId) return new Response(JSON.stringify({ error: "No user id found" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const fromEmail = sport === "bjj" ? "jim@romrxbjj.com" : sport === "bodybuilding" ? "jim@romrxbodybuilding.com" : "jim@romrx.io";
    const brand = sport === "bjj" ? "ROMRxBJJ" : sport === "bodybuilding" ? "ROMRxBodybuilding" : "ROMRx";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: claimErr } = await supabase.from("email_sends").insert({ user_id: userId, email_id: EMAIL_ID });
    if (claimErr) {
      return new Response(JSON.stringify({ success: true, already_sent: true, email_id: EMAIL_ID }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const idempotencyKey = `${EMAIL_ID}-${userId}`;
    const assessmentUrl = "https://romrx.io/app/onboarding/assessment";
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px"><p>Hey ${firstName},</p><p>You're in. Your ${brand} account is ready.</p><p><a href="${assessmentUrl}">Start My Assessment</a></p><p>Talk soon,<br/>Jim Scott<br/>Founder, ${brand}</p></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        from: `Jim Scott <${fromEmail}>`,
        to: [email],
        subject: "Your ROMRx account is ready. Here's your first move.",
        html,
        headers: { "X-Entity-Ref-ID": idempotencyKey },
        tags: [{ name: "stage", value: "s1_registered" }, { name: "email_id", value: EMAIL_ID }, { name: "sport", value: sport }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      await supabase.from("email_sends").delete().eq("user_id", userId).eq("email_id", EMAIL_ID);
      return new Response(JSON.stringify({ error: data }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    await logEvent("email_sent", { userId, sport, props: { email_id: EMAIL_ID, stage: "s1_registered", recovery: true } });
    // Internal alert best-effort
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${brand} Signups <${fromEmail}>`,
          to: ["jim@romrx.io"],
          subject: `New ${brand} signup: ${email}`,
          html: `<p>New signup ${email} sport=${sport} id=${userId}. Welcome Resend ${data.id}. (v19-recovery)</p>`,
          tags: [{ name: "type", value: "internal_signup_alert" }, { name: "sport", value: sport }],
        }),
      });
    } catch {}
    return new Response(JSON.stringify({ success: true, id: data.id, sport, email_id: EMAIL_ID, recovery: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
