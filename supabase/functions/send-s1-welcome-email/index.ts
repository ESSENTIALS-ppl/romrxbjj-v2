// send-s1-welcome-email v22 (2026-09-21): restore full branded HTML from PR #28 + keep email_sends (redeploy after v21 stub).
// - v17: Base/general = Kai A1 Personalized Readiness Profile (not Position; not Personal).
//   Beta Dec 31 2026 / Jan 1 2027. BJJ keeps Position Readiness. 2026-09-08.
// - v16: only the auth.users INSERT trigger (service-role bearer) may call this function.
// - v17: caller verification (service-role proof), product_events, std serve removed.
// - v19/#28: claim public.email_sends(user_id, email_id=s1_1_welcome) before Resend; release on failure;
//        Resend Idempotency-Key / X-Entity-Ref-ID = s1_1_welcome-{userId} (stable, like drip v11).
// - v20: recovery after PLACEHOLDER mishap kept claim + stable key but compact interim HTML.
// - v21: brief stub mishap (superseded).
// - v22: full branded Kai A1 / PRP / sport templates restored; logging + Idempotency-Key unchanged.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logEvent } from "../_shared/events.ts";
const serve = (h: (req: Request) => Promise<Response>) => Deno.serve(h);

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const EMAIL_ID = "s1_1_welcome";

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
  } catch {
    return false;
  }
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const BASE_ASSESSMENT = "https://romrx.io/app/onboarding/assessment";

interface Brand {
  brandName: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  city: string;
  accent: string;
  protocol: string;
  markerCount: string;
  contextLine: string;
  introLine: string;
  durationLine: string;
  baseNote: string;
  ctaLabel: string;
  subject: string;
  alertTo: string;
  psLine: string;
  betaLine: string;
  closeLine: string;
}

const BRANDS: Record<string, Brand> = {
  bjj: {
    brandName: "ROMRxBJJ",
    fromName: "Jim Scott",
    fromEmail: "jim@romrxbjj.com",
    domain: "https://romrxbjj.com",
    city: "Dublin, Ohio",
    accent: "#c8102e",
    protocol: "Position Readiness Protocol&trade;",
    markerCount: "8 key ROM markers",
    contextLine: "which positions your body is ready for (and which ones are costing you on the mat)",
    introLine: "Most people who get real results with ROMRxBJJ do one thing first: complete the <strong>Position Readiness Protocol&trade; assessment</strong>.",
    durationLine: "It takes about 15 minutes. You'll measure 8 key ROM markers, and immediately see which positions your body is ready for (and which ones are costing you on the mat).",
    baseNote: "This is the diagnostic that changes how you train.",
    ctaLabel: "&rarr; Start My Assessment Now",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
    psLine: "P.S. The assessment is free. No expensive equipment needed. Just your body and a little floor space.",
    betaLine: "",
    closeLine: "This is my personal email. If you ever have any questions about ROMRxBJJ or run into any difficulty, please save it. I'd be happy to help however I can.",
  },
  bodybuilding: {
    brandName: "ROMRxBodybuilding",
    fromName: "Jim Scott",
    fromEmail: "jim@romrxbodybuilding.com",
    domain: "https://romrxbodybuilding.com",
    city: "Dublin, Ohio",
    accent: "#1e6fd9",
    protocol: "Range of Motion Readiness Protocol&trade;",
    markerCount: "key ROM markers",
    contextLine: "which lifts your body is ready to load (and which ranges are leaking strength and risking injury)",
    introLine: "Most people who get real results with ROMRxBodybuilding do one thing first: complete the <strong>Range of Motion Readiness Protocol&trade; assessment</strong>.",
    durationLine: "It takes about 15 minutes. You'll measure key ROM markers, and immediately see which lifts your body is ready to load (and which ranges are leaking strength and risking injury).",
    baseNote: "This is the diagnostic that changes how you train.",
    ctaLabel: "&rarr; Start My ROM Assessment",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
    psLine: "P.S. The assessment is free. No expensive equipment needed. Just your body and a little floor space.",
    betaLine: "",
    closeLine: "This is my personal email. If you ever have any questions about ROMRxBodybuilding or run into any difficulty, please save it. I'd be happy to help however I can.",
  },
  general: {
    brandName: "ROMRx",
    fromName: "Jim Scott",
    fromEmail: "jim@romrx.io",
    domain: "https://romrx.io",
    city: "Dublin, Ohio",
    accent: "#1e6fd9",
    protocol: "Personalized Readiness Profile&trade;",
    markerCount: "key ROM markers",
    contextLine: "your Top 3 Priority Joints and a clear next step for longevity, self-care, and mobility",
    introLine: "Most people who get real results with ROMRx do one thing first: complete the assessment that builds your <strong>Personalized Readiness Profile&trade;</strong>.",
    durationLine: "It takes about 10 minutes on your phone. You'll see your Top 3 Priority Joints and a clear next step for longevity, self-care, and mobility.",
    baseNote: "You don't need to train a sport. Base is for taking care of your body for the long run.",
    ctaLabel: "&rarr; Start My Assessment",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
    psLine: "P.S. The assessment is free. No special gear. Just your phone and a little floor space.",
    betaLine: "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.",
    closeLine: "This is my personal email. Save it. If anything's confusing, reply and I'll help.",
  },
};

serve(async (req) => {
  try {
    if (!(await callerIsTrusted(req))) {
      console.warn("send-s1-welcome-email: rejected untrusted caller");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const payload = await req.json();

    const record = payload?.record ?? payload;
    const email = record?.email ?? record?.new?.email;
    const meta = record?.raw_user_meta_data ?? record?.new?.raw_user_meta_data ?? {};
    const rawName = meta?.full_name ?? "";
    const firstName = rawName.split(" ")[0] || "there";

    const rawSport = String(meta?.active_sport ?? "").toLowerCase();
    const sport = rawSport === "bjj"
      ? "bjj"
      : rawSport === "bodybuilding"
      ? "bodybuilding"
      : "general";
    const b = BRANDS[sport];

    const addRaw = sport !== "general"
      ? sport
      : String(meta?.add_sport ?? "").toLowerCase();
    const ctaAdd = addRaw === "bjj" || addRaw === "bodybuilding" ? addRaw : "";
    const assessmentUrl = `${BASE_ASSESSMENT}${ctaAdd ? `?add=${ctaAdd}` : ""}`;

    const userId = String(record?.id ?? record?.new?.id ?? "").trim();
    const source = String(meta?.signup_source ?? "").trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "No user id found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send-once claim BEFORE Resend — durable proof in public.email_sends (same pattern as drip v11).
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: claimErr } = await supabase.from("email_sends").insert({
      user_id: userId,
      email_id: EMAIL_ID,
    });
    if (claimErr) {
      console.log(`S1-1 welcome already claimed for ${userId}:`, claimErr.message);
      return new Response(JSON.stringify({ success: true, already_sent: true, email_id: EMAIL_ID }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const idempotencyKey = `${EMAIL_ID}-${userId}`;

    const betaBlock = b.betaLine
      ? `<p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 16px 0;">${b.betaLine}</p>`
      : "";

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ROMRx account is ready.</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">${b.brandName}</h1>
              <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">${b.protocol}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Hey ${esc(firstName)},</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">You're in.</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${b.introLine}</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${b.durationLine}</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 32px 0;">${b.baseNote}</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${assessmentUrl}"
                       style="display:inline-block;background-color:${b.accent};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">
                      ${b.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Talk soon,</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 4px 0;"><strong>${b.fromName}</strong></p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px 0;">Founder, ${b.brandName}</p>

              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px 0;" />

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 16px 0;"><em>${b.psLine}</em></p>

              ${betaBlock}

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0;">${b.closeLine}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">
                ${b.brandName} &bull; ${b.city}<br />
                You're receiving this because you created a ${b.brandName} account.<br />
                <a href="mailto:${b.fromEmail}" style="color:#999999;">${b.fromEmail}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: `${b.fromName} <${b.fromEmail}>`,
        to: [email],
        subject: b.subject,
        html: htmlBody,
        headers: {
          "X-Entity-Ref-ID": idempotencyKey,
        },
        tags: [
          { name: "stage", value: "s1_registered" },
          { name: "email_id", value: EMAIL_ID },
          { name: "sport", value: sport },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Release claim so a later retry can recover from transient Resend failure.
      await supabase.from("email_sends").delete().eq("user_id", userId).eq("email_id", EMAIL_ID);
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`S1-1 welcome (${sport}) sent to:`, email, "| Resend ID:", data.id, "| claim:", EMAIL_ID);
    await logEvent("email_sent", { userId, sport, props: { email_id: EMAIL_ID, stage: "s1_registered", sport_intent: ctaAdd || null, source: source || null } });

    // Internal signup alert (sport-routed). Best-effort: never fail the customer welcome.
    try {
      const signupTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const alertHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.6;">
          <h2 style="margin:0 0 12px;color:${b.accent};">🎉 New ${b.brandName} signup</h2>
          <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
            <tr><td style="font-weight:bold;">Name</td><td>${esc(firstName)} ${esc(rawName.split(" ").slice(1).join(" "))}</td></tr>
            <tr><td style="font-weight:bold;">Email</td><td>${esc(email)}</td></tr>
            <tr><td style="font-weight:bold;">Sport</td><td>${esc(sport)}</td></tr>
            <tr><td style="font-weight:bold;">Sport intent</td><td>${esc(ctaAdd || "(none)")}</td></tr>
            <tr><td style="font-weight:bold;">Source</td><td>${esc(source || "(unknown)")}</td></tr>
            <tr><td style="font-weight:bold;">User ID</td><td>${esc(userId)}</td></tr>
            <tr><td style="font-weight:bold;">Signed up</td><td>${esc(signupTime)} ET</td></tr>
          </table>
          <p style="margin-top:16px;font-size:13px;color:#777;">Welcome email delivered (Resend ID: ${data.id}).</p>
        </div>`;

      const alertRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${b.brandName} Signups <${b.fromEmail}>`,
          to: [b.alertTo],
          reply_to: b.fromEmail,
          subject: `New ${b.brandName} signup: ${email}`,
          html: alertHtml,
          tags: [
            { name: "type", value: "internal_signup_alert" },
            { name: "sport", value: sport },
          ],
        }),
      });
      if (alertRes.ok) {
        console.log(`Signup alert (${sport}) sent to ${b.alertTo}`);
      } else {
        console.error("Signup alert failed:", await alertRes.text());
      }
    } catch (alertErr) {
      console.error("Signup alert error (non-blocking):", alertErr);
    }

    return new Response(JSON.stringify({ success: true, id: data.id, sport, email_id: EMAIL_ID }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
