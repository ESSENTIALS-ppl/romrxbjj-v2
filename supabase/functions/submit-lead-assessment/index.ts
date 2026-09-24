// submit-lead-assessment v18 (2026-09-24, Fix A, Jim LOCK via Grant 5:32 PM ET): the /100 now uses the ONE Base
//        formula from email.ts mobilityScore() (floor of mean min(1, worse/target)*100 over the banded joints,
//        clamped into the overall band), identical to romrx-io-web app/src/lib/mobilityBands.ts
//        mobilityScoreForAssessment(). KEEP IN SYNC with that file. The old average of % of target over every
//        whitelisted field (computePRS) is gone. dry_run also returns per-joint % + band (joints).
// - v17 (2026-09-24): Needs focus email copy de-duplicated (see email.ts). Logic unchanged.
// - v16 (2026-09-24, Jim LOCK via Grant)
// - v16: Base lead results email uses the Base bands (Needs focus / Building / Steady) and
//        "top three problem areas"; score + band shown as "NN/100 · Band". No ELITE/STRONG/AT RISK in
//        customer copy (this function is Base-only, sport=general; sport-pack emails are separate and
//        untouched). Render lives in ./email.ts. Adds a side-effect-free render path:
//        POST { dry_run: true, assessment_data } returns { subject, html } with NO lead insert and NO email.
//        The /100 number formula is unchanged (decision pending with Jim). leads.tier keeps the legacy
//        internal value (not customer-facing).
// - v15 (ROMRx Base audit 2026-09-15): rate limited (the limiter config existed but was never wired); joint fields whitelisted so client
//        payloads can no longer override user_id/sport/rom_total; rom_percentile no longer written
//        (percentiles are deferred until cohort volume is real); at-least-one-measurement check on the
//        authenticated path (this is what created the empty audit assessments); joint targets aligned with
//        compute-tiers so the lead email score matches the dashboard; jsr supabase-js; product_events.
// - v12: Kai C lead results copy; no ambassador offer. v10: beta locks Dec 31 2026 / Jan 1 2027.
// Two paths:
//   1. Authenticated caller (Bearer JWT): writes to `assessments`, returns { ok, user_id, tier, prs_score }.
//   2. Anonymous lead: writes to `leads` with an unlock_token, sends the results email via Resend.
// PRS score is computed server-side. Client-sent prs_score is ignored.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { logEvent } from "../_shared/events.ts";
import { BAND_LABEL, jointPercents, mobilityScore, overallBandScore, renderEmail, renderSubject } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const RESULTS_FROM = Deno.env.get("RESULTS_FROM_EMAIL") ?? "ROMRx <hello@romrx.io>";
const PUBLIC_ORIGIN = Deno.env.get("PUBLIC_ORIGIN") ?? "https://romrx.io";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

type JointMap = Record<string, number | null | undefined>;

// Whitelist of accepted joint fields (stored as-is). The /100 + band only score the 13 banded joints in
// email.ts BAND_JOINTS (targets = app JOINT_SCORE_TARGETS / public.compute_joint_scores()).
const JOINT_TARGETS: Record<string, number> = {
  hip_er_l: 45, hip_er_r: 45, hip_ir_l: 45, hip_ir_r: 45,
  hip_abd_l: 90, hip_abd_r: 90, hip_flex_l: 120, hip_flex_r: 120,
  hip_ext_l: 30, hip_ext_r: 30,
  shoulder_er_l: 90, shoulder_er_r: 90, shoulder_flex_l: 180, shoulder_flex_r: 180,
  ankle_df_l: 20, ankle_df_r: 20,
  cervical_rot_l: 80, cervical_rot_r: 80, cervical_lat_l: 45, cervical_lat_r: 45,
  cervical_flex: 50, cervical_ext: 60,
  thoracic_rot_l: 45, thoracic_rot_r: 45, thoracic_rot: 45,
  lumbar_flex: 60, lumbar_ext: 25,
  balance_l: 30, balance_r: 30,
};
const ALLOWED_FIELDS = new Set(Object.keys(JOINT_TARGETS));

/** Keep only known joint fields with finite 0-360 values. Everything else is dropped. */
function sanitize(input: unknown): { data: JointMap; count: number } {
  const out: JointMap = {};
  let count = 0;
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      if (v === null || v === undefined || v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 360) continue;
      out[k] = n;
      count++;
    }
  }
  return { data: out, count };
}

/** THE Base /100 (see email.ts mobilityScore). 0 only when no banded joint is measured. */
function computePRS(data: JointMap): number {
  return mobilityScore(data) ?? 0;
}

// Legacy internal tier: still written to leads.tier / returned to the app (never shown in customer copy).
function scoreToTier(score: number): "ELITE"|"STRONG"|"DEVELOPING"|"RESTRICTED"|"AT_RISK" {
  if (score >= 85) return "ELITE";
  if (score >= 70) return "STRONG";
  if (score >= 55) return "DEVELOPING";
  if (score >= 40) return "RESTRICTED";
  return "AT_RISK";
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email to", to);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESULTS_FROM, to, subject, html,
      tags: [{ name: "stage", value: "lead_results" }, { name: "email_id", value: "lead_rom_score" }, { name: "sport", value: "general" }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Resend error", res.status, txt);
    return { error: txt };
  }
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")     return json(405, { error: "Method not allowed" });

  {
    const limited = await enforceRateLimit(req, "submit-lead-assessment", { corsHeaders: CORS });
    if (limited) return limited;
  }

  let body: {
    email?: string;
    full_name?: string;
    assessment_data?: JointMap;
    source?: string;
    dry_run?: boolean;
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const { data, count } = sanitize(body.assessment_data);
  const score = computePRS(data);
  const tier  = scoreToTier(score);
  const band  = overallBandScore(data);

  // Render-only path: no auth, no DB write, no email. Returns exactly what the lead would receive.
  if (body.dry_run === true) {
    if (count === 0) return json(400, { error: "At least one ROM measurement is required" });
    return json(200, {
      ok: true,
      dry_run: true,
      prs_score: score,
      band: band == null ? null : BAND_LABEL[band],
      joints: Object.fromEntries(
        Object.entries(jointPercents(data)).map(([k, v]) => [k, { pct: v.pct, band: BAND_LABEL[v.band] }]),
      ),
      subject: renderSubject(score, band),
      html: renderEmail(score, band, "DRYRUN", "preview@romrx.io", PUBLIC_ORIGIN),
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const authHeader = req.headers.get("Authorization") ?? "";
  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const { data: u } = await admin.auth.getUser(jwt);
    userId = u.user?.id ?? null;
  }

  if (userId) {
    if (count === 0) return json(400, { error: "At least one ROM measurement is required" });
    const { error } = await admin.from("assessments").insert({
      ...data,                 // whitelisted joint fields only
      user_id: userId,         // server-controlled, cannot be overridden by the client
      sport: "general",
      rom_total: score,        // compute-tiers recomputes this on insert with the same targets
      assessed_at: new Date().toISOString(),
    });
    if (error) {
      console.error("assessments insert error", error);
      return json(500, { error: "Could not save assessment" });
    }
    return json(200, { ok: true, user_id: userId, prs_score: score, tier });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return json(400, { error: "Valid email required for lead submission" });
  if (count === 0) return json(400, { error: "At least one ROM measurement is required" });

  const unlockToken = crypto.randomUUID().replace(/-/g, "");
  const source = String(body.source ?? "romrx.io").slice(0, 64);

  const { error: leadErr } = await admin.from("leads").insert({
    email,
    full_name: body.full_name ? String(body.full_name).slice(0, 120) : null,
    assessment_data: data,
    prs_score: score,
    tier,
    unlock_token: unlockToken,
    source,
  });
  if (leadErr) {
    console.error("leads insert error", leadErr);
    return json(500, { error: "Could not save lead" });
  }

  const subject = renderSubject(score, band);
  const html = renderEmail(score, band, unlockToken, email, PUBLIC_ORIGIN);
  const mailResult = await sendEmail(email, subject, html);
  if (!mailResult.error && !mailResult.skipped) {
    await logEvent("email_sent", { sport: "general", props: { email_id: "lead_rom_score", stage: "lead_results", source, band: band == null ? null : BAND_LABEL[band] } });
  }

  return json(200, {
    ok: true,
    sent: !mailResult.error && !mailResult.skipped,
    prs_score: score,
    tier,
    unlock_token: unlockToken,
  });
});
