// notify-coach-signup
// Called by CoachSignup.tsx after account creation (before payment)
// Sends: 1) Jim notification, 2) Coach 'complete your payment' email
// Coach signup is a BJJ-only flow today, so brand is fixed to ROMRxBJJ.
// From + reply_to use jim@romrxbjj.com (a send-as alias on the jim@romrx.io
// mailbox), so all replies land in the unified jim@romrx.io inbox.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { enforceRateLimit } from "../_shared/rate_limit.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM       = "Jim Scott <jim@romrxbjj.com>";
const REPLY_TO   = "jim@romrxbjj.com";
const JIM_EMAIL  = "jim@romrx.io";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, reply_to: REPLY_TO }),
  });
}

Deno.serve(async (req: Request) => {
  const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Sprint 8 scaffold: signup/notify spam guard
  {
    const limited = enforceRateLimit(req, "notify-coach-signup", { corsHeaders: CORS });
    if (limited) return limited;
  }

  const { email, fullName, gym, paid, sendToCoach } = await req.json().catch(() => ({}));
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });

  const name = fullName || email.split("@")[0];

  if (sendToCoach) {
    await sendEmail(email, "One more step to access your ROMRxBJJ Coach dashboard",
      `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
        <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a2e2e;margin:0 0 12px;">Hey ${name},</h1>
        <p style="font-size:14px;color:#1a2e2e;line-height:1.7;">Your ROMRxBJJ Coach account has been created. You are one step away from accessing your team dashboard.</p>
        <p style="font-size:14px;color:#1a2e2e;line-height:1.7;">Complete your payment to unlock your roster, RAMP warmup generator, coaching notes, and ROMBot.</p>
        <a href="https://romrxbjj.com/signup/coach" style="display:inline-block;background:#008080;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Complete Payment - $349/yr</a>
        <p style="font-size:12px;color:#5a7070;margin-top:24px;">Questions? Just reply to this email &mdash; jim@romrxbjj.com</p>
      </div>`);
  } else {
    await sendEmail(JIM_EMAIL, `New Coach Account Created (unpaid): ${email}`,
      `<p>A new coach created an account but has NOT paid yet.</p>
       <p><strong>Email:</strong> ${email}<br>
       <strong>Name:</strong> ${name}<br>
       <strong>Gym:</strong> ${gym || "Not specified"}</p>
       <p>If they need a nudge, reply to their email or reach out directly.</p>`);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
});
