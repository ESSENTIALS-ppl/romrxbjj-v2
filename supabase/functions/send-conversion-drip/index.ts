// send-conversion-drip v11 (issue #16 — 2026-09-21)
// - v2/v10: SPORT USERS ONLY. Skips active_sport not in (bjj, bodybuilding), skips active entitlement,
//          reads marketing_opt_out from users (profiles table was historically missing). jsr supabase-js.
// - v11: fixture/opt-out email pattern skip; email_sends send-once claim; stable Resend Idempotency-Key
//        (no Date.now()). Keep drip ON for real unpaid assessed BJJ/BB users.
// Assessed -> Paid conversion drip. One function, both sports, all 3 emails.
// Runs hourly. For each email stage it selects users whose MOST RECENT assessment
// falls in the stage's time window, who are NOT yet active subscribers, and who
// have not opted out. Anchored on assessed_at (not signup).
//   C1: 23-25h after assessment  (Day 1) - value -> outcome
//   C2: 71-73h after assessment  (Day 3) - objection + social proof
//   C3: 143-145h after assessment (Day 6) - loss aversion / final nudge
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logEvent } from "../_shared/events.ts";
const serve = (h: (req: Request) => Promise<Response>) => Deno.serve(h);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Sep 8 Field plus-alias fixtures land in jim@romrx.io — never drip them. */
function isAuditFixtureEmail(email: string): boolean {
  const e = email.toLowerCase();
  return (
    e.includes("+romrx-audit") ||
    e.includes("+romrx-goa") ||
    e.includes("+romrx-onboard") ||
    e.startsWith("jim+romrx-")
  );
}

interface Brand { sport: string; name: string; from: string; replyTo: string; domain: string; accent: string; protocol: string; }
const BRANDS: Brand[] = [
  { sport: "bjj", name: "ROMRxBJJ", from: "Jim Scott <jim@romrxbjj.com>", replyTo: "jim@romrxbjj.com", domain: "https://romrxbjj.com", accent: "#c8102e", protocol: "Position Readiness Protocol&trade;" },
  { sport: "bodybuilding", name: "ROMRxBodybuilding", from: "Jim Scott <jim@romrxbodybuilding.com>", replyTo: "jim@romrxbodybuilding.com", domain: "https://romrxbodybuilding.com", accent: "#1e6fd9", protocol: "Range of Motion Readiness Protocol&trade;" },
];

interface Stage { id: string; minH: number; maxH: number; subject: (b: Brand, n: string) => string; body: (b: Brand, n: string, email: string) => string; }

function shell(b: Brand, email: string, inner: string): string {
  return `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
      <tr><td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">${b.name}</h1>
        <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">${b.protocol}</p>
      </td></tr>
      <tr><td style="padding:40px 40px 32px 40px;">${inner}
        <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;" />
        <p style="font-size:14px;color:#555555;line-height:1.6;margin:0;"><strong>Jim Scott</strong><br/>Founder, ROMRx LLC<br/><a href="mailto:${b.replyTo}" style="color:${b.accent};">${b.replyTo}</a></p>
      </td></tr>
      <tr><td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
        <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">${b.name} &bull; Dublin, Ohio<br/>You completed a ${b.name} assessment but haven&rsquo;t started your membership yet.<br/><a href="${b.domain}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999999;">unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function cta(b: Brand, label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 28px 0;">
    <a href="${href}" style="display:inline-block;background-color:${b.accent};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">${label}</a>
  </td></tr></table>`;
}

const STAGES: Stage[] = [
  {
    id: "c1_value", minH: 23, maxH: 25,
    subject: () => "You found the gaps. Here's how to close them.",
    body: (b, n, email) => {
      const game = b.sport === "bodybuilding" ? "lifts" : "game";
      const li = b.sport === "bodybuilding" ? "The lifts you can load heavier, safely" : "The techniques your body can unlock next";
      const inner = `
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Hey ${n},</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Your assessment showed you something most athletes never see: exactly where your body is holding your ${game} back.</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Knowing is step one. <strong>Fixing it is where the results live.</strong></p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 8px;">Your membership turns that profile into a plan:</p>
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
          <tr><td style="padding:6px 0 6px 4px;font-size:15px;color:#333;line-height:1.6;">&#10003;&nbsp; A personalized protocol built around <em>your</em> gaps</td></tr>
          <tr><td style="padding:6px 0 6px 4px;font-size:15px;color:#333;line-height:1.6;">&#10003;&nbsp; ${li}</td></tr>
          <tr><td style="padding:6px 0 6px 4px;font-size:15px;color:#333;line-height:1.6;">&#10003;&nbsp; ROMBot to coach you through every session</td></tr>
        </table>
        ${cta(b, "&rarr; Unlock My Protocol", b.domain + "/signup")}
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0;">You&rsquo;ve already done the hard part &mdash; the honest assessment. Let&rsquo;s turn it into progress.</p>`;
      return shell(b, email, inner);
    },
  },
  {
    id: "c2_proof", minH: 71, maxH: 73,
    subject: () => '"Is it actually worth it?" \u2014 a fair question',
    body: (b, n, email) => {
      const who = b.sport === "bodybuilding" ? "lifters" : "grapplers";
      const lessons = b.sport === "bodybuilding" ? "coaching" : "private lessons";
      const quote = b.sport === "bodybuilding" ? "My bench stalled for a year. My shoulder ER was way under threshold &mdash; once I fixed it, the weight finally moved again." : "I spent two years fighting my guard retention. Turned out my hip ER was 11&deg; under threshold. Two weeks of the right work and I was hitting sweeps I&rsquo;d never landed.";
      const inner = `
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Hey ${n},</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Totally fair to wonder if a ROM program is worth it. So here&rsquo;s the honest math.</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 20px;">Most ${who} spend months &mdash; sometimes years &mdash; drilling things their body isn&rsquo;t structurally ready for, then wonder why they stall. The protocol skips that.</p>
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;"><tr><td style="padding:16px 20px;background:#f7f7f7;border-left:3px solid ${b.accent};font-size:15px;color:#444;line-height:1.7;font-style:italic;">&ldquo;${quote}&rdquo;<br/><span style="font-style:normal;color:#888;font-size:13px;">&mdash; ${b.name} member</span></td></tr></table>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 8px;">Less than the cost of a month of ${lessons}, for a full year of training that actually fits your body.</p>
        ${cta(b, "&rarr; Start My Protocol", b.domain + "/signup")}
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0;">Questions or doubts? Just reply. I&rsquo;ll give it to you straight.</p>`;
      return shell(b, email, inner);
    },
  },
  {
    id: "c3_loss", minH: 143, maxH: 145,
    subject: (_b, n) => `Don't let your profile go to waste, ${n}`,
    body: (b, n, email) => {
      const outcome = b.sport === "bodybuilding" ? "turns stalled lifts into PRs" : "makes the techniques you&rsquo;ve been forcing finally click";
      const inner = `
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Hey ${n},</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Your readiness profile is still sitting there, fully mapped &mdash; and right now it&rsquo;s just information.</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Here&rsquo;s what it <em>could</em> be: a week-by-week plan that closes your biggest gaps and ${outcome}.</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 8px;">Every week you wait is another week training around the problem instead of fixing it.</p>
        ${cta(b, "&rarr; Turn My Profile Into a Plan", b.domain + "/signup")}
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 8px;">No pressure &mdash; but I&rsquo;d hate for you to leave this on the table. You did the assessment for a reason.</p>
        <p style="font-size:16px;color:#333;line-height:1.6;margin:0;">Last one from me on this. Whenever you&rsquo;re ready, I&rsquo;m here.</p>`;
      return shell(b, email, inner);
    },
  },
];

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = Date.now();
  const results: Record<string, number> = {};
  const skipped: Record<string, number> = { fixture: 0, already_sent: 0, opt_out: 0, paid: 0 };
  const errors: unknown[] = [];

  for (const stage of STAGES) {
    const windowStart = new Date(now - stage.maxH * 3600000).toISOString();
    const windowEnd = new Date(now - stage.minH * 3600000).toISOString();

    const { data: assessments, error: aErr } = await supabase
      .from("assessments").select("user_id, assessed_at, sport")
      .gte("assessed_at", windowStart).lte("assessed_at", windowEnd);
    if (aErr) { errors.push({ stage: stage.id, aErr }); continue; }
    if (!assessments || assessments.length === 0) { results[stage.id] = 0; continue; }

    const userIds = [...new Set(assessments.map((a: { user_id: string }) => a.user_id))];

    const { data: users, error: uErr } = await supabase
      .from("users").select("id, email, full_name, active_sport, subscription_status, marketing_opt_out, platforms")
      .in("id", userIds)
      .in("active_sport", ["bjj", "bodybuilding"]);   // v2/v10: Base (general) users are never in this drip
    if (uErr) { errors.push({ stage: stage.id, uErr }); continue; }

    const { data: ents } = await supabase
      .from("sport_entitlements").select("user_id, sport, status")
      .in("user_id", (users ?? []).map((u: { id: string }) => u.id)).eq("status", "active");
    const activeEnt = new Set((ents ?? []).map((e: { user_id: string; sport: string }) => `${e.user_id}:${e.sport}`));

    let sent = 0;
    for (const u of (users ?? []) as Array<Record<string, unknown>>) {
      if (u.subscription_status === "active") { skipped.paid++; continue; }
      if (u.marketing_opt_out) { skipped.opt_out++; continue; }
      const email = u.email as string;
      if (!email) continue;
      if (isAuditFixtureEmail(email)) { skipped.fixture++; continue; }

      const sport = (u.active_sport as string) === "bodybuilding" ? "bodybuilding" : "bjj";
      if (activeEnt.has(`${u.id}:${sport}`)) { skipped.paid++; continue; }
      if ((u.platforms as string[] | null)?.includes(sport)) { skipped.paid++; continue; }

      // Send-once claim BEFORE Resend — blocks hour-apart duplicates across the 2h window.
      const { error: claimErr } = await supabase.from("email_sends").insert({
        user_id: u.id,
        email_id: stage.id,
      });
      if (claimErr) {
        // unique_violation (23505) or race = already claimed/sent
        skipped.already_sent++;
        continue;
      }

      const brand = BRANDS.find((b) => b.sport === sport)!;
      const firstName = String(u.full_name ?? "").split(" ")[0] || "there";
      const idempotencyKey = `${stage.id}-${u.id}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: brand.from, to: [email], reply_to: brand.replyTo,
          subject: stage.subject(brand, firstName), html: stage.body(brand, firstName, email),
          headers: { "X-Entity-Ref-ID": idempotencyKey },
          tags: [ { name: "stage", value: "conversion_drip" }, { name: "email_id", value: stage.id }, { name: "sport", value: sport } ],
        }),
      });
      if (res.ok) {
        sent++;
        await logEvent("email_sent", { userId: u.id as string, sport, props: { email_id: stage.id, stage: "conversion_drip" } });
      } else {
        // Release claim so a later cron can retry a transient Resend failure.
        await supabase.from("email_sends").delete().eq("user_id", u.id as string).eq("email_id", stage.id);
        errors.push({ stage: stage.id, email, err: await res.text() });
      }
    }
    results[stage.id] = sent;
  }

  return new Response(JSON.stringify({ results, skipped, errors }), { status: 200, headers: { "Content-Type": "application/json" } });
});
