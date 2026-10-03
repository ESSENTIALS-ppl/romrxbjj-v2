import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// F-06: ledger key in public.email_sends (primary key user_id + email_id = send once per person).
const EMAIL_ID = "bb_s1_4_stillhere";

const ACCENT = "#1e6fd9";
const DOMAIN = "https://romrxbodybuilding.com";
const FROM = "Jim Scott <jim@romrxbodybuilding.com>";
const BRAND = "ROMRxBodybuilding";

// 2026-09-29 caller auth: only pg_cron (public.cron_call_edge) may trigger sends.
// x-cron-secret is checked against Vault cron_webhook_secret via RPC
// public.verify_webhook_secret (service_role only, returns boolean). Fails closed.
async function cronCallerOk(req: Request): Promise<boolean> {
  const got = (req.headers.get("x-cron-secret") ?? "").trim();
  if (got.length < 32) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_webhook_secret`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "cron_webhook_secret", p_candidate: got }),
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) {
    return false;
  }
}

serve(async (_req) => {
  if (!(await cronCallerOk(_req))) return new Response("forbidden", { status: 403 });
  // F-06: test accounts (jim+romrx-...@romrx.io flagged fixtures) are skipped unless a manual trigger passes {"include_fixtures": true}.
  let includeFixtures = false;
  try { includeFixtures = (await _req.json())?.include_fixtures === true; } catch (_e) { /* cron sends no body */ }
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const windowStart = new Date(now.getTime() - 121 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 119 * 60 * 60 * 1000).toISOString();

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, full_name, created_at, active_sport, marketing_opt_out")
      .eq("active_sport", "bodybuilding")
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log("No bodybuilding users in Day 5 window");
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const { data: assessed, error: assessedError } = await supabase
      .from("assessments")
      .select("user_id")
      .in("user_id", users.map((u: any) => u.id));

    if (assessedError) {
      console.error("Error fetching assessments:", assessedError);
      return new Response(JSON.stringify({ error: assessedError.message }), { status: 500 });
    }

    const assessedIds = new Set((assessed ?? []).map((a: any) => a.user_id));
    const eligibleUsers = users.filter((u: any) => !assessedIds.has(u.id));

    console.log(`BB S1-4 Day 5 — Total: ${users.length}, Assessed: ${assessedIds.size}, Eligible: ${eligibleUsers.length}`);

    let sent = 0;
    const skipped = { opt_out: 0, fixture: 0, already_sent: 0 };
    const errors: any[] = [];

    for (const user of eligibleUsers) {
      const firstName = (user.full_name ?? "").split(" ")[0] || "there";
      const email = user.email;
      // F-06: opt-out comes from users.marketing_opt_out (the old profiles table never existed, so Stop was ignored).
      if (user.marketing_opt_out) { skipped.opt_out++; continue; }
      if (!includeFixtures) {
        const { data: isTest } = await supabase.rpc("is_test_account", { p_email: email });
        if (isTest === true) { skipped.fixture++; continue; }
      }
      // F-06: send-once claim BEFORE Resend. The hourly job sees each user in two consecutive runs of the 2h window.
      const { error: claimErr } = await supabase.from("email_sends").insert({ user_id: user.id, email_id: EMAIL_ID });
      if (claimErr) { skipped.already_sent++; continue; }

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Still here for you, ${firstName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <tr>
            <td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">${BRAND}</h1>
              <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">Range of Motion Readiness Protocol&trade;</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Hey ${firstName},</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 28px 0;">No sales pitch today.</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">I just want to make sure you know what you have access to &mdash; right now, for free:</p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;background-color:#f8fffe;border:1px solid #d4edda;border-radius:8px;">
                <tr>
                  <td style="padding:24px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr><td style="padding:8px 0;font-size:15px;color:#222222;line-height:1.6;"><span style="color:#28a745;font-weight:700;margin-right:10px;">&#10003;</span> Full ROM assessment across every key lifting joint</td></tr>
                      <tr><td style="padding:8px 0;font-size:15px;color:#222222;line-height:1.6;"><span style="color:#28a745;font-weight:700;margin-right:10px;">&#10003;</span> Your Range of Motion Readiness Score</td></tr>
                      <tr><td style="padding:8px 0;font-size:15px;color:#222222;line-height:1.6;"><span style="color:#28a745;font-weight:700;margin-right:10px;">&#10003;</span> Which lifts your body is currently ready to load</td></tr>
                      <tr><td style="padding:8px 0;font-size:15px;color:#222222;line-height:1.6;"><span style="color:#28a745;font-weight:700;margin-right:10px;">&#10003;</span> Where your biggest mobility gaps are costing you size and strength</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 28px 0;">This is the foundation everything else is built on.</p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#fff9f0;border-left:4px solid #f0ad4e;padding:18px 22px;border-radius:0 6px 6px 0;">
                    <p style="font-size:15px;color:#555555;line-height:1.7;margin:0;">If something&rsquo;s blocking you from starting &mdash; technical issues, time, questions &mdash; just reply to this email. I read every response.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 8px 0;">Otherwise:</p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:36px;">
                    <a href="${DOMAIN}/onboarding/assessment"
                       style="display:inline-block;background-color:${ACCENT};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">
                      &rarr; Run My Assessment
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0;">&ndash; Jim</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">
                ${BRAND} &bull; Dublin, Ohio<br />
                You&rsquo;re receiving this because you created a ${BRAND} account.<br />
                <a href="mailto:jim@romrxbodybuilding.com" style="color:#999999;">jim@romrxbodybuilding.com</a>
              </p>
            </td>
          </tr>

        </table>
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:20px 40px 10px;">
              <p style="font-size:11px;color:#999999;text-align:center;margin:0;line-height:1.6;">This message was sent to ${email}. If you don't want to receive these emails from ${BRAND} in the future, please <a href="${DOMAIN}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999999;">unsubscribe</a>.</p>
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
          "Idempotency-Key": `${EMAIL_ID}-${user.id}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `Still here for you, ${firstName}`,
          html: htmlBody,
          headers: { "X-Entity-Ref-ID": `bb-s1-4-stillhere-${user.id}-${Date.now()}` },
          tags: [
            { name: "stage", value: "s1_registered" },
            { name: "email_id", value: "bb_s1_4_stillhere" },
            { name: "sport", value: "bodybuilding" },
          ],
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`BB S1-4 sent to ${email}`);
      } else {
        await supabase.from("email_sends").delete().eq("user_id", user.id).eq("email_id", EMAIL_ID); // release claim so the next run can retry
        const errData = await res.json();
        console.error(`Failed for ${email}:`, errData);
        errors.push({ email, error: errData });
      }
    }

    return new Response(JSON.stringify({ sent, skipped, errors }), { status: 200 });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
