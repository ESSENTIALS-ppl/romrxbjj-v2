// ROMRx send-renewal-reminders v6 (2026-11-02, FG-35: explicit legacy skip, send gated by RENEWAL_BASE_SEND). Based on v5 (2026-10-26): targets Base subscribers. v4 read users.subscription_expiry, empty for every
// active account, so the Jan 1, 2027 Base charge got no reminders. v5 reads Base billing state (users.base_*, billing_consents.trial_end),
// claims each reminder row BEFORE sending (unique user_id+reminder_type+subscription_expiry) so retries never double send,
// skips test fixtures and internal accounts, and supports ?dry_run=1 (cron secret still required; no sends, no writes).
// v4 (2026-10-01 security audit): fail-closed x-cron-secret gate
// (only pg_cron via public.cron_call_edge may trigger sends; was open to anonymous callers).
// From + reply_to use the per-brand jim@ alias (send-as aliases on jim@romrx.io
// so replies land in the unified inbox).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { POSTAL_LINE } from "../_shared/email_footer.ts";
import { type CandidateRow, formatUsdYear, maskEmail, planReminders, sendEnabled } from "./logic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) {
    return false;
  }
}

interface Brand { name: string; brandHtml: string; from: string; replyTo: string; domain: string; }
const BRANDS: Record<string, Brand> = {
  bjj: {
    name: "ROMRxBJJ",
    brandHtml: 'ROMRx<sup style="font-size:11px;font-weight:400;">BJJ</sup>',
    from: "Jim Scott <jim@romrxbjj.com>",
    replyTo: "jim@romrxbjj.com",
    domain: "https://romrxbjj.com",
  },
  bodybuilding: {
    name: "ROMRxBodybuilding",
    brandHtml: 'ROMRx<sup style="font-size:11px;font-weight:400;">Bodybuilding</sup>',
    from: "Jim Scott <jim@romrxbodybuilding.com>",
    replyTo: "jim@romrxbodybuilding.com",
    domain: "https://romrxbodybuilding.com",
  },
};
function brandFor(sport?: string | null): Brand {
  return sport === "bodybuilding" ? BRANDS.bodybuilding : BRANDS.bjj;
}


function buildEmail(brand: Brand, name: string, plan: string, price: string, daysUntil: number, expiryDateStr: string, reminderLabel: string, email: string): string {
  const urgency = daysUntil <= 2;
  const accentColor = urgency ? "#dc2626" : "#008080";
  const dashboardUrl = `${brand.domain}/dashboard/settings`;
  const bodyMessage = daysUntil <= 2
    ? `This is your final reminder. Your ${plan} membership renews on <strong>${expiryDateStr}</strong> and you will be charged <strong>${price}</strong>. If you do not wish to renew, cancel before that date in your account settings.`
    : daysUntil <= 30
    ? `As required by law, we are notifying you that your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong> unless you cancel before that date.`
    : `Your ${plan} membership renews on <strong>${expiryDateStr}</strong>. You will be charged <strong>${price}</strong>. If you want to cancel, you have time to do so in your account settings.`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fcfc;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;"><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a2e2e;">${brand.brandHtml}</span></div>
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
    <a href="${dashboardUrl}" style="display:inline-block;background:#1a2e2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;">Manage Subscription</a>
    <p style="font-size:11px;color:#5a7070;margin-top:24px;line-height:1.6;">To cancel, go to Settings and click Manage Subscription before your renewal date. All sales are final per our <a href="${brand.domain}/legal" style="color:#008080;">Refund Policy</a>.</p>
  </div>
  <p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">${POSTAL_LINE}<br /><a href="mailto:${brand.replyTo}" style="color:#008080;">${brand.replyTo}</a></p>
<p style="font-size:11px;color:#5a7070;text-align:center;margin-top:20px;">This message was sent to ${email}.</p></div></body></html>`;
}

async function sendEmail(brand: Brand, to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: brand.from, to: [to], subject, html, reply_to: brand.replyTo }),
  });
  if (!res.ok) { console.error("Resend error:", await res.text()); return false; }
  return true;
}

Deno.serve(async (req: Request) => {
  if (!(await cronCallerOk(req))) return new Response("forbidden", { status: 403 });
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now = new Date();
  const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });

  const { data: users, error } = await supabase.from("users")
    .select("id, email, full_name, active_sport, base_status, base_stripe_subscription_id, base_expiry, base_cancel_at_period_end, base_canceled_at, grandfathered_at, subscription_tier, subscription_expiry, stripe_subscription_id")
    .eq("base_status", "active").not("base_stripe_subscription_id", "is", null);
  if (error) return json({ success: false, error: error.message });

  const rows: CandidateRow[] = [];
  for (const u of users ?? []) {
    const { data: isTest } = await supabase.rpc("is_test_account", { p_email: u.email });
    const { data: consents } = await supabase.from("billing_consents")
      .select("stripe_subscription_id, trial_end, amounts, offer").eq("user_id", u.id);
    rows.push({ ...u, is_test: isTest === true, consents: consents ?? [] } as CandidateRow);
  }
  const { due, skipped } = planReminders(rows, now);
  const results: Record<string, { sent: number; skipped: number; errors: string[] }> = {};
  const bump = (t: string) => (results[t] ??= { sent: 0, skipped: 0, errors: [] });

  // v6: real sends stay OFF until RENEWAL_BASE_SEND is exactly "on" (not a credential; unset = plan only, no claims, no sends).
  // Reason: the Base reminder wording and brand (v5 reuses the BJJ brand and "All sales are final" line) need Jim and Stacy first.
  const sendOn = sendEnabled(Deno.env.get("RENEWAL_BASE_SEND"));
  if (dryRun || !sendOn) {
    return json({ success: true, dry_run: true, send_enabled: sendOn, date: now.toISOString(), skipped,
      due: due.map((d) => ({ email: maskEmail(d.email), type: d.type, days_until: d.days_until, charge_date: d.charge_date })) });
  }

  for (const d of due) {
    const r = bump(d.type);
    // Claim first: the unique key makes a second run (or a concurrent one) a no op.
    const { data: claim, error: claimErr } = await supabase.from("renewal_reminders")
      .insert({ user_id: d.user_id, reminder_type: d.type, subscription_expiry: d.charge_date }).select("id").maybeSingle();
    if (claimErr || !claim) {
      if (claimErr && claimErr.code !== "23505") r.errors.push(`claim failed: ${maskEmail(d.email)}`);
      r.skipped++;
      continue;
    }
    const brand = brandFor(d.active_sport);
    const price = formatUsdYear(d.amount_cents);
    const expiryFormatted = new Date(d.charge_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
    const firstName = (d.full_name ?? d.email).split(" ")[0];
    const subject = d.days_until <= 2
      ? `Your ${brand.name} membership renews in ${d.label} - last chance to cancel`
      : `Your ${brand.name} membership renews in ${d.label}`;
    // Renewal reminders are required account notices: no unsubscribe link, and marketing_opt_out never blocks them (Grant, 2026-10-04).
    const sent = await sendEmail(brand, d.email, subject, buildEmail(brand, firstName, "ROMRx Base", price, d.days_until, expiryFormatted, d.label, d.email));
    if (sent) r.sent++;
    else {
      await supabase.from("renewal_reminders").delete().eq("id", claim.id); // release so tomorrow retries
      r.errors.push(`send failed: ${maskEmail(d.email)}`);
    }
  }
  return json({ success: true, date: now.toISOString(), skipped, results });
});
