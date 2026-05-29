import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Day 3 window: 71-73 hours after signup
    const now = new Date();
    const windowStart = new Date(now.getTime() - 73 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 71 * 60 * 60 * 1000).toISOString();

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, full_name, created_at")
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log("No users in Day 3 window");
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Filter out users who have started an assessment
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

    console.log(`Day 3 window — Total: ${users.length}, Assessed: ${assessedIds.size}, Eligible: ${eligibleUsers.length}`);

    let sent = 0;
    const errors: any[] = [];

    for (const user of eligibleUsers) {
      const firstName = (user.full_name ?? "").split(" ")[0] || "there";
      const email = user.email;
        const { data: profile } = await supabase
          .from('profiles')
          .select('marketing_opt_out')
          .eq('email', user.email)
          .single()
        if (profile?.marketing_opt_out) {
          continue
        }

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What happens when Masters athletes skip this step</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">ROMRxBJJ</h1>
              <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">Position Readiness Protocol&trade;</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Hey ${firstName},</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 24px 0;">Here&rsquo;s what the data shows us:</p>

              <!-- Callout box -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f8f8f8;border-left:4px solid #c8102e;padding:20px 24px;border-radius:0 6px 6px 0;">
                    <p style="font-size:15px;color:#222222;line-height:1.7;margin:0;">Masters athletes (30&ndash;45) who train without knowing their ROM profile are essentially <strong>guessing</strong>. They work hard on techniques their body isn&rsquo;t structurally ready to execute &mdash; and wonder why they plateau.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 28px 0;">The <strong>Position Readiness Protocol&trade;</strong> changes that.</p>

              <!-- Testimonial -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#fffbf0;border:1px solid #f0e0a0;padding:20px 24px;border-radius:6px;">
                    <p style="font-size:15px;color:#444444;line-height:1.7;margin:0 0 10px 0;font-style:italic;">&ldquo;I spent two years trying to fix my guard retention. Turns out my hip ER was 11&deg; below threshold. Two weeks of the right protocol and I was hitting sweeps I&rsquo;d never landed.&rdquo;</p>
                    <p style="font-size:13px;color:#888888;margin:0;">— ROMRxBJJ user</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 32px 0;">Your profile is waiting. It&rsquo;ll tell you exactly what&rsquo;s holding your game back &mdash; Masters athlete or not.</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:36px;">
                    <a href="https://romrxbjj.com/onboarding/assessment"
                       style="display:inline-block;background-color:#c8102e;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">
                      &rarr; Find Out What&rsquo;s Limiting Your Game
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 4px 0;">&ndash; Jim</p>
              <p style="font-size:13px;color:#999999;font-style:italic;margin:0;">Evidence-based. BJJ-specific. Built for your body.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">
                ROMRxBJJ &bull; Dublin, Ohio<br />
                You&rsquo;re receiving this because you created a ROMRxBJJ account.<br />
                <a href="mailto:jim@romrxbjj.com" style="color:#999999;">jim@romrxbjj.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
          <tr>
            <td align="center" style="padding:20px 40px 10px;">
              <p style="font-size:11px;color:#999999;text-align:center;margin:0;line-height:1.6;">This message was sent to ${email}. If you don't want to receive these emails from ROMRxBJJ in the future, please <a href="https://romrxbjj.com/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999999;">unsubscribe</a>.</p>
            </td>
          </tr>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Jim Scott <jim@romrxbjj.com>",
          to: [email],
          subject: "What happens when Masters athletes skip this step",
          html: htmlBody,
          headers: {
            "X-Entity-Ref-ID": `s1-3-masters-${user.id}-${Date.now()}`,
          },
          tags: [
            { name: "stage", value: "s1_registered" },
            { name: "email_id", value: "s1_3_masters" },
          ],
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`S1-3 sent to ${email}`);
      } else {
        const errData = await res.json();
        console.error(`Failed for ${email}:`, errData);
        errors.push({ email, error: errData });
      }
    }

    return new Response(JSON.stringify({ sent, errors }), { status: 200 });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
