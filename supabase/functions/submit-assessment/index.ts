// submit-assessment v31 (ROMRx Base audit 2026-09-15)
// - v31: marketing opt-out now read from public.users (the `profiles` table never existed, so the
//        opt-out was silently ignored). Removed the v1 BJJ-flavored users upsert (platforms ['bjj'],
//        subscription_status 'pending' which the check constraint rejects). Logs product_events.
// - v30: Base HQ great-job email via this function.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { logEvent } from "../_shared/events.ts";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NUMERIC_FIELDS = [
  "hip_er_l","hip_er_r","hip_ir_l","hip_ir_r",
  "hip_abd_l","hip_abd_r","hip_flex_l","hip_flex_r",
  "hip_ext_l","hip_ext_r",
  "shoulder_er_l","shoulder_er_r","shoulder_flex_l","shoulder_flex_r",
  "ankle_df_l","ankle_df_r",
  "cervical_lat_l","cervical_lat_r","cervical_flex","cervical_ext",
  "thoracic_rot_l","thoracic_rot_r",
  "cervical_rot_l","cervical_rot_r",
  "lumbar_flex","lumbar_ext","thoracic_rot",
  "balance_l","balance_r",
];
/** Normalize DB/meta sport to a brand key. Base HQ stamps general or base. */
function brandSportKey(raw: string | null | undefined): "bjj" | "bodybuilding" | "general" {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "bodybuilding" || s === "bb") return "bodybuilding";
  if (s === "bjj") return "bjj";
  return "general";
}
function greatJobConfig(sport: string) {
  const key = brandSportKey(sport);
  if (key === "bodybuilding") {
    return {
      brandKey: "bodybuilding",
      brand: "ROMRxBodybuilding",
      from: "Jim Scott <jim@romrxbodybuilding.com>",
      replyTo: "jim@romrxbodybuilding.com",
      domain: "https://romrxbodybuilding.com",
      unsubDomain: "https://romrxbodybuilding.com",
      accent: "#1e6fd9",
      protocol: "Range of Motion Readiness Protocol&trade;",
      subject: "You just did what most lifters never do",
      lede: "You just completed your Range of Motion Readiness Protocol&trade; assessment, and that already puts you ahead of most lifters who train on guesswork.",
      what: "Here&rsquo;s what just happened: you mapped your key ROM markers and now have a real, lifting-specific picture of what your body can load safely, and where you&rsquo;re leaking strength and size to limited range.",
      live: "See your scores, the lifts you&rsquo;re built to load right now, and the ranges holding back your gains.",
      good: "This is where it gets good. Your profile shows you exactly what to train next. No more guessing why a lift stalls.",
      cta: "&rarr; See My Readiness Profile",
      ctaPath: "/dashboard/my-body",
      proud: "Proud of you for taking the first real step. If anything looks confusing, just reply. I read every email.",
      betaLine: "",
    };
  }
  if (key === "bjj") {
    return {
      brandKey: "bjj",
      brand: "ROMRxBJJ",
      from: "Jim Scott <jim@romrxbjj.com>",
      replyTo: "jim@romrxbjj.com",
      domain: "https://romrxbjj.com",
      unsubDomain: "https://romrxbjj.com",
      accent: "#c8102e",
      protocol: "Position Readiness Protocol&trade;",
      subject: "You just did what most people never do",
      lede: "You just completed your Position Readiness Protocol&trade; assessment, and that already puts you ahead of most people who train on guesswork.",
      what: "Here&rsquo;s what just happened: you mapped 8 key ROM markers and now have a real, BJJ-specific picture of what your body is ready for, and where the hidden brakes are on your game.",
      live: "Take a look at your scores, see which positions you&rsquo;re built for right now, and find the gaps that have been quietly costing you on the mat.",
      good: "This is the part where it gets good. Your profile shows you exactly what to work on next. No more spinning your wheels.",
      cta: "&rarr; See My Readiness Profile",
      ctaPath: "/dashboard/my-body",
      proud: "Proud of you for taking the first real step. If anything looks confusing, just reply. I read every email.",
      betaLine: "",
    };
  }
  return {
    brandKey: "general",
    brand: "ROMRx",
    from: "Jim Scott <jim@romrx.io>",
    replyTo: "jim@romrx.io",
    domain: "https://romrx.io",
    unsubDomain: "https://romrx.io/app",
    accent: "#0047AB",
    protocol: "Personalized Readiness Profile&trade;",
    subject: "You just did what most people never do",
    lede: "You finished your assessment. Your Personalized Readiness Profile&trade; is live. That already puts you ahead of most people who guess about their mobility.",
    what: "Here&rsquo;s what you have now: scores for your joints, your Top 3 Priority Joints, and a clear picture of what to work on for longevity, self-care, and usable mobility.",
    live: "Open your dashboard to see your Personalized Readiness Profile and your next step.",
    good: "Proud of you for taking the first real step. If anything looks confusing, reply. I read every email.",
    cta: "&rarr; See My Personalized Readiness Profile",
    ctaPath: "/app/dashboard",
    proud: "",
    betaLine: "ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027.",
  };
}
async function sendGreatJob(sport: string, email: string, firstName: string) {
  if (!RESEND_API_KEY) return;
  const c = greatJobConfig(sport);
  const profileUrl = `${c.domain}${c.ctaPath}`;
  const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Great job</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
      <tr><td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">${c.brand}</h1>
        <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">${c.protocol}</p>
      </td></tr>
      <tr><td style="padding:40px 40px 32px 40px;">
        <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Hey ${firstName},</p>
        <p style="font-size:20px;color:#111111;font-weight:700;line-height:1.5;margin:0 0 16px 0;">You did it. 🔥</p>
        <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${c.lede}</p>
        <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">${c.what}</p>
        <p style="font-size:16px;color:#111111;font-weight:600;line-height:1.6;margin:0 0 8px 0;">Your profile is live.</p>
        <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 28px 0;">${c.live}</p>
        <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding-bottom:28px;">
          <a href="${profileUrl}" style="display:inline-block;background-color:${c.accent};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">${c.cta}</a>
        </td></tr></table>
        <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 24px 0;">${c.good}</p>
        ${c.proud ? `<p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 4px 0;">${c.proud}</p>` : ""}
        ${c.betaLine ? `<p style="font-size:14px;color:#555555;line-height:1.6;margin:16px 0 4px 0;">${c.betaLine}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;" />
        <p style="font-size:14px;color:#555555;line-height:1.6;margin:0;"><strong>Jim Scott</strong><br/>Founder, ROMRx LLC<br/><a href="mailto:${c.replyTo}" style="color:${c.accent};">${c.replyTo}</a></p>
      </td></tr>
      <tr><td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
        <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">${c.brand} &bull; Dublin, Ohio<br/>You&rsquo;re receiving this because you completed a ${c.brand} assessment.<br/><a href="${c.unsubDomain}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999999;">unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: c.from, to: [email], reply_to: c.replyTo, subject: c.subject, html,
      headers: { "X-Entity-Ref-ID": `assessment-complete-${Date.now()}` },
      tags: [
        { name: "stage", value: "assessment_complete" },
        { name: "email_id", value: "great_job" },
        { name: "sport", value: c.brandKey },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Great-job Resend failed (${c.brandKey}):`, res.status, errBody);
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  {
    const limited = await enforceRateLimit(req, "submit-assessment", { corsHeaders: CORS });
    if (limited) return limited;
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  {
    const limited = await enforceRateLimit(req, "submit-assessment", {
      userId: user.id,
      corsHeaders: CORS,
    });
    if (limited) return limited;
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const meta = user.user_metadata ?? {};
  // handle_new_user() creates the users row at signup. This is a safety net only: valid Base defaults,
  // never overwrites an existing row.
  await admin.from("users").upsert({
    id: user.id,
    email: user.email!,
    full_name: meta.full_name ?? meta.name ?? user.email!.split("@")[0],
    portal_role: "athlete",
    subscription_status: "inactive",
    subscription_tier: "free",
    base_status: "inactive",
    platforms: ["general"],
    sports_enabled: ["general"],
  }, { onConflict: "id", ignoreDuplicates: true });
  const { data: profile } = await admin
    .from("users")
    .select("active_sport, marketing_opt_out, full_name")
    .eq("id", user.id)
    .single();
  const activeSport: string = (profile?.active_sport as string) ?? "general";
  let athleteId: string;
  const { data: athlete } = await admin
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (athlete) {
    athleteId = athlete.id;
  } else {
    const { data: newAthlete, error: athleteErr } = await admin
      .from("athletes")
      .upsert({
        user_id: user.id,
        email: user.email!,
        full_name: meta.full_name ?? meta.name ?? user.email!.split("@")[0],
        belt: meta.belt ?? "white",
        dominant_side: "right",
        injury_flags: [],
        onboarding_status: "active",
        is_active: true,
      }, { onConflict: "user_id" })
      .select("id")
      .single();
    if (athleteErr || !newAthlete) {
      return json({ error: "Could not resolve athlete record: " + (athleteErr?.message ?? "unknown") }, 500);
    }
    athleteId = newAthlete.id;
  }
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const row: Record<string, unknown> = {
    user_id: user.id,
    athlete_id: athleteId,
    assessed_at: new Date().toISOString(),
    sport: activeSport || "general",
  };
  for (const f of NUMERIC_FIELDS) {
    const v = body[f];
    if (v === undefined || v === null || v === "") { row[f] = null; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 360) {
      return json({ error: `Invalid value for ${f}: must be 0-360 degrees` }, 400);
    }
    row[f] = n;
  }
  const hasAny = NUMERIC_FIELDS.some((f) => row[f] !== null);
  if (!hasAny) return json({ error: "At least one ROM measurement is required" }, 400);
  const { data: inserted, error } = await admin
    .from("assessments")
    .insert(row)
    .select("id, assessed_at, sport")
    .single();
  if (error) return json({ error: error.message }, 400);
  // Great-job email honors users.marketing_opt_out (v31 fix).
  try {
    if (!profile?.marketing_opt_out) {
      const fullName = (meta.full_name ?? meta.name ?? profile?.full_name ?? "") as string;
      const firstName = fullName.split(" ")[0] || "there";
      await sendGreatJob(activeSport, user.email!, firstName);
      console.log(`Great-job email (${brandSportKey(activeSport)}) sent to ${user.email}`);
      await logEvent("email_sent", { userId: user.id, sport: brandSportKey(activeSport), props: { email_id: "great_job", stage: "assessment_complete" } });
    } else {
      console.log(`Great-job email skipped (opted out): ${user.email}`);
    }
  } catch (mailErr) {
    console.error("Great-job email error (non-blocking):", mailErr);
  }
  return json({ ok: true, assessment_id: inserted.id, assessed_at: inserted.assessed_at, sport: inserted.sport }, 200);
});
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
