// ROMRx send-renewal-reminders v2 — uses verified romrxbjj.com domain
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "ROMRxBJJ <noreply@romrxbjj.com>";
const DASHBOARD_URL = "https://romrxbjj.com/dashboard/settings";

const REMINDER_WINDOWS = [
  { type: "45_day" as const, days: 45, label: "45 days" },
  { type: "30_day" as const, days: 30, label: "30 days" },
  { type: "2_day"  as const, days: 2,  label: "2 days"  },
];

function buildEmail(name: string, plan: string, price: string, daysUntil: number, expiryDateStr: string, reminderLabel: string, email: string): string {
  const urgency = daysUntil <= 2;
  const accentColor = urgency ? "#dc2626" : "#008080";
  const bodyMessage = daysUntil <= 2
    ? `This is your final reminder. Your ${plan} membership renews on <strong>${expiryDateStr}</strong> and you will be charged <strong>${price}</strong>. If you do not wish to renew, cancel before that date in your account settings.`
    : daysUntil <= 30
    ? `As required by law, we are notifying you that your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong> unless you cancel before that date.`
    : `Your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong>. If you want to cancel, you have time to do so in your account settings.`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fcfc;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;"><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e2e;">ROMRx<sup style="font-size:11px;font-weight:400;">BJJ</sup></span></div>
  <div style="background:#fff;border-radius:12px;border:1px solid #cde0e0;padding:32px;">
    <div style="display:inline-block;background:${accentColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:20px;">Renewal in ${reminderLabel}</div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a2e2e;margin:0 0 12px;">Hey ${name},</h1>
    <p style="font-size:14px;color:#1a2e2e;line-height:1.7;margin:0 0 16px;">${bodyMessage}</p>
    <div style="background:#f8fcfc;border-radius:10px;border:1px solid #cde0e0;padding:16px 20px;margin:20px 0;">
      <table style="width:100%;font-size:13px;">
        <tr><td style="color:#5a7070;padding:4px 0;">Plan</td><td style="text-align:right;font-weight:600;color:#1a2e2e;">${plan}</td></tr>
        <tr><td style="color:#5a7070;padding:4px 0;">Renewal date</td><td style="text-align:right;font-weight:600;color:#1a2e2e;">${expiryDateStr}</td></tr>
        <tr><td style="color:#5a7070;padding:4px 0;">Amount</td><td style="text-align:right;font-weight:700;color:${accentColor};font-size:15px;">${price}</td></tr>
      </table>
    </div>
    <a href="${DASHBOARD_URL}" style="display:inline-block;background:#1a2e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;">Manage Subscription</a>
    <p style="font-size:11px;color:#5a7070;margin-top:24px;line-height:1.6;">To cancel, go to Settings and click Manage Subscription before your renewal date. All sales are final per our <a href="https://romrxbjj.com/legal" style="color:#008080;">Refund Policy</a>.</p>
  </div>
  <p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">ROMRx LLC &mdash; Dublin, Ohio &mdash; <a href="mailto:ROMRxBJJ@gmail.com" style="color:#008080;">ROMRxBJJ@gmail.com</a></p>
<p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">This message was sent to ${email}. If you don't want to receive these emails from ROMRxBJJ in the future, please <a href="https://romrxbjj.com/unsubscribe?email=${encodeURIComponent(email)}" style="color:#5a7070;">unsubscribe</a>.</p></div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, reply_to: "ROMRxBJJ@gmail.com" }),
  });
  if (!res.ok) { console.error("Resend error:", await res.text()); return false; }
  return true;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results: Record<string, { sent: number; skipped: number; errors: string[] }> = {};
  const today = new Date();

  for (const window of REMINDER_WINDOWS) {
    results[window.type] = { sent: 0, skipped: 0, errors: [] };
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + window.days);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: users, error: fetchErr } = await supabase
      .from("users")
      .select("id, email, full_name, subscription_tier, subscription_expiry")
      .eq("subscription_status", "active")
      .gte("subscription_expiry", `${targetDateStr}T00:00:00Z`)
      .lt("subscription_expiry", `${targetDateStr}T23:59:59Z`);

    if (fetchErr) { results[window.type].errors.push(fetchErr.message); continue; }
    if (!users || users.length === 0) continue;

    for (const user of users) {
      const { data: existing } = await supabase.from("renewal_reminders").select("id")
        .eq("user_id", user.id).eq("reminder_type", window.type).eq("subscription_expiry", targetDateStr).maybeSingle();
      if (existing) { results[window.type].skipped++; continue; }

      const planLabel = user.subscription_tier === "coach" ? "Coach Starter" : "Athlete";
      const price = user.subscription_tier === "coach" ? "$349/yr" : "$149/yr";
      const expiryFormatted = new Date(user.subscription_expiry).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const firstName = (user.full_name ?? user.email).split(" ")[0];
      const subject = window.days <= 2
        ? `Your ROMRxBJJ membership renews in ${window.label} - last chance to cancel`
        : `Your ROMRxBJJ membership renews in ${window.label}`;

      const { data: profile } = await supabase
          .from('profiles')
          .select('marketing_opt_out')
          .eq('email', user.email)
          .single()
        if (profile?.marketing_opt_out) {
          results[window.type].skipped++
          continue
        }
        const sent = await sendEmail(user.email, subject, buildEmail(firstName, `ROMRxBJJ+ ${planLabel}`, price, window.days, expiryFormatted, window.label, user.email));
      if (sent) {
        await supabase.from("renewal_reminders").insert({ user_id: user.id, reminder_type: window.type, subscription_expiry: targetDateStr });
        results[window.type].sent++;
      } else { results[window.type].errors.push(`Failed: ${user.email}`); }
    }
  }

  return new Response(JSON.stringify({ success: true, date: today.toISOString().split("T")[0], results }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
});
