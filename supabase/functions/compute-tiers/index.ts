// ROMRx compute-tiers v20 — sport-aware (PR #5)
// - Filters techniques by user's active_sport (was sport-agnostic)
// - Stamps technique_eligibility rows with sport
// - All prior v19 features preserved: PRS scoring, worst_joints, PRP email
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

// PRS scoring (mirrors frontend ResultsPreview.tsx)
const BILATERAL = [
  { l: "hip_er_l",        r: "hip_er_r",        riskBelow: 40,  normalMin: 40  },
  { l: "hip_ir_l",        r: "hip_ir_r",        riskBelow: 30,  normalMin: 30  },
  { l: "hip_abd_l",       r: "hip_abd_r",       riskBelow: 30,  normalMin: 40  },
  { l: "hip_flex_l",      r: "hip_flex_r",      riskBelow: 100, normalMin: 100 },
  { l: "shoulder_er_l",   r: "shoulder_er_r",   riskBelow: 60,  normalMin: 60  },
  { l: "shoulder_flex_l", r: "shoulder_flex_r", riskBelow: 120, normalMin: 140 },
  { l: "ankle_df_l",      r: "ankle_df_r",      riskBelow: 10,  normalMin: 10  },
  { l: "cervical_rot_l",  r: "cervical_rot_r",  riskBelow: 60,  normalMin: 70  },
];
const UNILATERAL = [
  { key: "lumbar_flex",  riskBelow: 40, normalMin: 40 },
  { key: "lumbar_ext",   riskBelow: 15, normalMin: 20 },
  { key: "thoracic_rot", riskBelow: 30, normalMin: 40 },
];

// deno-lint-ignore no-explicit-any
function computePRS(a: Record<string, any>): number {
  let score = 100;
  for (const j of BILATERAL) {
    const l = a[j.l], r = a[j.r];
    if (l != null && r != null) {
      const minVal = Math.min(l, r), gap = Math.abs(l - r);
      if (minVal < j.riskBelow) score -= 8;
      else if (minVal < j.normalMin) score -= 4;
      if (gap >= 15) score -= 6;
      else if (gap >= 8) score -= 3;
    }
  }
  for (const j of UNILATERAL) {
    const v = a[j.key];
    if (v != null) { if (v < j.riskBelow) score -= 6; else if (v < j.normalMin) score -= 3; }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function prsLabel(s: number): string {
  if (s >= 85) return "ELITE";
  if (s >= 70) return "STRONG";
  if (s >= 55) return "DEVELOPING";
  if (s >= 40) return "RESTRICTED";
  return "AT RISK";
}
function prsColor(s: number): string {
  if (s >= 70) return "#4ade80";
  if (s >= 40) return "#facc15";
  return "#f87171";
}

// deno-lint-ignore no-explicit-any
function computeWorstJoints(a: Record<string, any>): string[] {
  const issues: Array<{ text: string; sev: number }> = [];
  const bilatDefs = [
    { name: "Shoulder Flexion",   l: "shoulder_flex_l", r: "shoulder_flex_r", riskBelow: 120 },
    { name: "Shoulder ER",        l: "shoulder_er_l",   r: "shoulder_er_r",   riskBelow: 60  },
    { name: "Hip IR",             l: "hip_ir_l",        r: "hip_ir_r",        riskBelow: 30  },
    { name: "Hip ER",             l: "hip_er_l",        r: "hip_er_r",        riskBelow: 40  },
    { name: "Hip Abduction",      l: "hip_abd_l",       r: "hip_abd_r",       riskBelow: 30  },
    { name: "Hip Flexion",        l: "hip_flex_l",      r: "hip_flex_r",      riskBelow: 100 },
    { name: "Ankle Dorsiflexion", l: "ankle_df_l",      r: "ankle_df_r",      riskBelow: 10  },
    { name: "Cervical Rotation",  l: "cervical_rot_l",  r: "cervical_rot_r",  riskBelow: 60  },
  ];
  for (const j of bilatDefs) {
    const l = a[j.l], r = a[j.r];
    if (l == null || r == null) continue;
    const gap = Math.abs(l - r), minVal = Math.min(l, r);
    const lowSide = l < r ? "left" : r < l ? "right" : null;
    if (gap >= 15) {
      const sideNote = lowSide ? `, ${lowSide} LOW` : "";
      issues.push({ text: `${j.name}: L ${l}deg vs R ${r}deg (${gap}deg asymmetry gap${sideNote})`, sev: gap + (minVal < j.riskBelow ? 20 : 0) });
    } else if (gap >= 8) {
      issues.push({ text: `${j.name}: L ${l}deg vs R ${r}deg (${gap}deg asymmetry gap)`, sev: gap });
    } else if (minVal < j.riskBelow) {
      issues.push({ text: `${j.name}: L ${l}deg vs R ${r}deg (${gap}deg gap, ${lowSide ?? "both"} AT RISK)`, sev: (j.riskBelow - minVal) + 10 });
    }
  }
  const uniDefs = [
    { name: "Thoracic Rotation", key: "thoracic_rot", normalMin: 40 },
    { name: "Lumbar Flexion",    key: "lumbar_flex",  normalMin: 40 },
    { name: "Lumbar Extension",  key: "lumbar_ext",   normalMin: 20 },
  ];
  for (const j of uniDefs) {
    const v = a[j.key];
    if (v != null && v < j.normalMin) {
      issues.push({ text: `${j.name}: ${v}deg (LOW, below ${j.normalMin}deg normal min)`, sev: j.normalMin - v });
    }
  }
  issues.sort((x, y) => y.sev - x.sev);
  return issues.slice(0, 5).map(i => i.text);
}

function buildStatusMap(wj: string[]): Record<string, { status: string; color: string; bg: string }> {
  const R = "#f87171", Y = "#facc15";
  const yBg = "rgba(234,179,8,0.05)", rBg = "rgba(239,68,68,0.07)";
  const map: Record<string, { status: string; color: string; bg: string }> = {};
  for (const txt of wj) {
    const name = txt.split(":")[0].trim();
    const lower = txt.toLowerCase();
    const gm = txt.match(/(\d+)deg asymmetry/);
    const gap = gm ? parseInt(gm[1]) : 0;
    let status = "ELEVATED", color = Y, bg = yBg;
    if (lower.includes("at risk")) {
      status = lower.includes("left") ? "LEFT AT RISK" : lower.includes("right") ? "RIGHT AT RISK" : "AT RISK";
      color = R; bg = rBg;
    } else if (gap >= 15) { status = "CRITICAL"; color = R; bg = rBg; }
    else if (gap >= 8)    { status = "ELEVATED";  color = Y; bg = yBg; }
    else if (lower.includes("low")) { status = "LOW"; color = Y; bg = yBg; }
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    map[key] = { status, color, bg };
  }
  return map;
}

function buildPRPEmail(p: {
  firstName: string; belt: string; date: string; prs: number;
  green: number; yellow: number; red: number;
  // deno-lint-ignore no-explicit-any
  assessment: Record<string, any>; worstJoints: string[];
}): string {
  const sc = prsColor(p.prs), sl = prsLabel(p.prs);
  const sm = buildStatusMap(p.worstJoints);
  const ROWS: Array<[string, string, string | null]> = [
    ["Shoulder Flexion",   "shoulder_flex_l", "shoulder_flex_r"],
    ["Shoulder ER",        "shoulder_er_l",   "shoulder_er_r"],
    ["Hip IR",             "hip_ir_l",        "hip_ir_r"],
    ["Hip ER",             "hip_er_l",        "hip_er_r"],
    ["Hip Flexion",        "hip_flex_l",      "hip_flex_r"],
    ["Hip Abduction",      "hip_abd_l",       "hip_abd_r"],
    ["Ankle Dorsiflexion", "ankle_df_l",      "ankle_df_r"],
    ["Cervical Rotation",  "cervical_rot_l",  "cervical_rot_r"],
    ["Lumbar Flexion",     "lumbar_flex",     null],
    ["Thoracic Rotation",  "thoracic_rot",    null],
  ];
  const rowsHtml = ROWS.map(([label, lk, rk]) => {
    const lv = p.assessment[lk], rv = rk ? p.assessment[rk] : null;
    if (lv == null) return "";
    const sk = label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const st = sm[sk] ?? { status: "OK", color: "#4ade80", bg: "transparent" };
    const flagL  = st.color !== "#4ade80" && rv !== null && Number(lv) <= Number(rv);
    const flagR  = st.color !== "#4ade80" && rv !== null && Number(rv) <  Number(lv);
    const flagU  = st.color !== "#4ade80" && rv === null;
    const lS = flagL ? `color:${st.color};font-weight:700` : "";
    const rS = flagR ? `color:${st.color};font-weight:700` : "";
    const uS = flagU ? `color:${st.color};font-weight:700` : "";
    const cells = rv !== null
      ? `<td style="padding:9px 0;font-size:13px;font-weight:600">${label}</td><td style="text-align:center;font-size:13px;${lS}">${lv}</td><td style="text-align:center;font-size:13px;${rS}">${rv}</td>`
      : `<td style="padding:9px 0;font-size:13px;font-weight:600">${label}</td><td colspan="2" style="text-align:center;font-size:13px;${uS}">${lv}</td>`;
    return `<tr style="background:${st.bg};border-bottom:1px solid rgba(255,255,255,0.04)">${cells}<td style="text-align:right;font-size:11px;font-weight:700;color:${st.color}">${st.status}</td></tr>`;
  }).join("");
  const top3 = p.worstJoints.slice(0, 3).map((txt, i) => {
    const name = txt.split(":")[0].trim();
    const sk = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const st = sm[sk] ?? { status: "ELEVATED", color: "#facc15", bg: "" };
    return `<div style="display:flex;align-items:center;margin-bottom:10px"><span style="min-width:20px;height:20px;background:${st.color};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#1c2a32;margin-right:10px">${i + 1}</span><span style="font-size:13px;font-weight:700">${name} <span style="color:${st.color};font-size:11px">${st.status}</span></span></div>`;
  }).join("");
  const capBelt = p.belt.charAt(0).toUpperCase() + p.belt.slice(1);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0f0ec;font-family:Arial,sans-serif"><div style="max-width:580px;margin:28px auto;background:#1c2a32;border-radius:14px;overflow:hidden;color:#FAF9F6"><div style="background:#2a363d;padding:22px 28px;border-bottom:2px solid rgba(0,128,128,0.35)"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#008080">ROMRxBJJ</p><h1 style="margin:5px 0 4px;font-size:20px;font-weight:800;color:#FAF9F6">Position Readiness Profile</h1><p style="margin:0;font-size:12px;color:rgba(250,249,246,0.45)">${p.firstName} &bull; ${capBelt} Belt &bull; ${p.date}</p></div><div style="padding:24px 28px;text-align:center;border-bottom:1px solid rgba(0,128,128,0.2)"><p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(250,249,246,0.4)">Overall Readiness Score</p><p style="margin:0;font-size:52px;font-weight:800;color:${sc};line-height:1">${p.prs}</p><p style="margin:6px 0 14px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${sc}">${sl}</p><div style="display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center"><span style="background:rgba(34,197,94,0.18);color:#4ade80;border:1px solid rgba(34,197,94,0.35);padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700">GREEN ${p.green}</span><span style="background:rgba(234,179,8,0.18);color:#facc15;border:1px solid rgba(234,179,8,0.35);padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700">YELLOW ${p.yellow}</span><span style="background:rgba(239,68,68,0.18);color:#f87171;border:1px solid rgba(239,68,68,0.35);padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700">RED ${p.red}</span></div><p style="margin:10px 0 0;font-size:11px;color:rgba(250,249,246,0.35)">132 techniques rated</p></div><div style="padding:22px 28px;border-bottom:1px solid rgba(0,128,128,0.2)"><p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#008080">ROM Measurements</p><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1)"><th style="text-align:left;padding:7px 0;font-size:10px;color:rgba(250,249,246,0.4);text-transform:uppercase">Joint</th><th style="text-align:center;padding:7px 0;font-size:10px;color:rgba(250,249,246,0.4);text-transform:uppercase">Left</th><th style="text-align:center;padding:7px 0;font-size:10px;color:rgba(250,249,246,0.4);text-transform:uppercase">Right</th><th style="text-align:right;padding:7px 0;font-size:10px;color:rgba(250,249,246,0.4);text-transform:uppercase">Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div style="padding:22px 28px;border-bottom:1px solid rgba(0,128,128,0.2)"><p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#008080">Your Top 3 Priority Areas</p>${top3}</div><div style="padding:24px 28px;text-align:center"><p style="margin:0 0 18px;font-size:14px;color:rgba(250,249,246,0.75);line-height:1.6">Your personalized protocol targets all 3 priority areas with specific exercises, stretches, and foam rolling prescriptions. Unlock your full dashboard to get started.</p><a href="https://romrxbjj.com/onboarding/results" style="display:inline-block;background:#FFB347;color:#2a363d;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">Unlock My Full Dashboard</a><p style="margin:16px 0 0;font-size:11px;color:rgba(250,249,246,0.3)">Improving these 3 areas will move techniques from RED to YELLOW and YELLOW to GREEN.</p></div><div style="padding:14px 28px;background:#1a2530;border-top:1px solid rgba(0,128,128,0.15)"><p style="margin:0;font-size:10px;color:rgba(250,249,246,0.25)">ROMRxBJJ &bull; romrxbjj.com &bull; A product of ROMRx LLC</p></div></div></body></html>`;
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const assessment = payload.record ?? payload;
    const userId = assessment.user_id;
    const assessmentId = assessment.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve user's active_sport (defaults to bjj). The assessment row itself
    // also has a sport column post-PR #2; prefer that if present.
    const { data: athlete } = await supabase
      .from("users")
      .select("belt, active_sport")
      .eq("id", userId)
      .single();
    const belt = athlete?.belt ?? "white";
    const sport: string = (assessment.sport as string | null) ?? athlete?.active_sport ?? "bjj";

    // deno-lint-ignore no-explicit-any
    const rom: Record<string, any> = {
      hip_er_l:        assessment.hip_er_l        ?? 0,
      hip_er_r:        assessment.hip_er_r        ?? 0,
      hip_ir_l:        assessment.hip_ir_l        ?? 0,
      hip_ir_r:        assessment.hip_ir_r        ?? 0,
      hip_abd_l:       assessment.hip_abd_l       ?? 0,
      hip_abd_r:       assessment.hip_abd_r       ?? 0,
      hip_flex_l:      assessment.hip_flex_l      ?? 0,
      hip_flex_r:      assessment.hip_flex_r      ?? 0,
      shoulder_er_l:   assessment.shoulder_er_l   ?? 0,
      shoulder_er_r:   assessment.shoulder_er_r   ?? 0,
      shoulder_flex_l: assessment.shoulder_flex_l ?? 0,
      shoulder_flex_r: assessment.shoulder_flex_r ?? 0,
      ankle_df_l:      assessment.ankle_df_l      ?? 0,
      ankle_df_r:      assessment.ankle_df_r      ?? 0,
      lumbar_flex:     assessment.lumbar_flex     ?? 0,
      lumbar_ext:      assessment.lumbar_ext      ?? 0,
      thoracic_rot:    assessment.thoracic_rot    ?? 0,
      cervical_rot_l:  assessment.cervical_rot_l  ?? 0,
      cervical_rot_r:  assessment.cervical_rot_r  ?? 0,
      cervical_ext:    0,
    };

    const ageMod = 1.0;
    const beltFilter = belt === "white" ? ["white"] : ["white", "blue"];

    // Sport-aware techniques fetch: PR #2 added techniques.sport FK column.
    // Filter to the user's active sport so a Bodybuilding user never gets
    // BJJ technique eligibility computed against them.
    const { data: techniques } = await supabase
      .from("techniques")
      .select("id, code, name, belt, sport, hip_er_min, hip_ir_min, hip_abd_min, hip_flex_min, shoulder_er_min, ankle_df_min, lumbar_flex_min, thoracic_rot_min, shoulder_flex_min, lumbar_ext_min, cervical_rot_min, cervical_ext_min")
      .eq("sport", sport)
      .in("belt", beltFilter);

    if (!techniques?.length) {
      return new Response(JSON.stringify({ success: false, error: `No techniques found for sport=${sport} belt=${beltFilter.join(",")}` }));
    }

    function getBestSide(key: string): number {
      return Math.max(rom[`${key}_l`] ?? 0, rom[`${key}_r`] ?? 0);
    }

    const eligibilityRows = techniques.map((tech) => {
      const thresholds: Array<{ joint: string; required: number; actual: number; isCervicalExt?: boolean }> = [];
      const push = (key: string, min: number | null, bilateral: boolean, isCervicalExt = false) => {
        if (min == null) return;
        thresholds.push({ joint: key, required: min * ageMod, actual: bilateral ? getBestSide(key) : (rom[key] ?? 0), isCervicalExt });
      };
      push("hip_er",        tech.hip_er_min,       true);
      push("hip_ir",        tech.hip_ir_min,       true);
      push("hip_abd",       tech.hip_abd_min,      true);
      push("hip_flex",      tech.hip_flex_min,     true);
      push("shoulder_er",   tech.shoulder_er_min,  true);
      push("ankle_df",      tech.ankle_df_min,     true);
      push("lumbar_flex",   tech.lumbar_flex_min,  false);
      push("thoracic_rot",  tech.thoracic_rot_min, false);
      push("shoulder_flex", tech.shoulder_flex_min, true);
      push("lumbar_ext",    tech.lumbar_ext_min,   false);
      push("cervical_rot",  tech.cervical_rot_min,  true);
      push("cervical_ext",  tech.cervical_ext_min,  false, true);

      const limitingJoints: string[] = [];
      let worstRatio = 1.0, flagReason: string | null = null;
      for (const t of thresholds) {
        if (t.isCervicalExt) { flagReason = "DELAY_TECHNIQUE"; limitingJoints.push(t.joint); continue; }
        const ratio = t.required > 0 ? t.actual / t.required : 1.0;
        if (ratio < 1.0) limitingJoints.push(t.joint);
        if (ratio < worstRatio) worstRatio = ratio;
      }
      if (tech.code === "WD5" && (rom["lumbar_ext"] ?? 0) < 20) flagReason = "DELAY_TECHNIQUE";
      const tier = worstRatio >= 1.0 ? "GREEN" : worstRatio >= 0.75 ? "YELLOW" : "RED";
      return {
        user_id: userId,
        assessment_id: assessmentId,
        technique_id: tech.id,
        technique_code: tech.code,
        sport,
        tier,
        limiting_joints: limitingJoints,
        flag: flagReason,
      };
    });

    await supabase.from("technique_eligibility").delete().eq("assessment_id", assessmentId);
    const { error: insertErr } = await supabase.from("technique_eligibility").insert(eligibilityRows);
    if (insertErr) throw insertErr;

    const counts = { green: 0, yellow: 0, red: 0, delay: 0 };
    eligibilityRows.forEach((r) => {
      if (r.flag === "DELAY_TECHNIQUE") counts.delay++;
      else counts[r.tier.toLowerCase() as keyof typeof counts]++;
    });

    const worstJoints = computeWorstJoints(assessment);

    await supabase
      .from("assessments")
      .update({ worst_joints: worstJoints })
      .eq("id", assessmentId);

    // Send PRP email (BJJ branded for now; PR #7 will template per sport)
    if (RESEND_API_KEY && sport === "bjj") {
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const email = authData?.user?.email;
        const fullName = authData?.user?.user_metadata?.full_name ?? "";
        const firstName = fullName.split(" ")[0] || "Athlete";
        if (email) {
          const prs = computePRS(assessment);
          const dateStr = new Date(assessment.assessed_at ?? assessment.created_at ?? Date.now())
            .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
          const html = buildPRPEmail({ firstName, belt, date: dateStr, prs, green: counts.green, yellow: counts.yellow, red: counts.red, assessment, worstJoints });
          const er = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: "Jim Scott <jim@romrxbjj.com>", to: [email], subject: `${firstName}, your Position Readiness Profile is ready`, html, tags: [{ name: "stage", value: "prp_delivered" }] }),
          });
          const ed = await er.json();
          if (!er.ok) { console.error("PRP Resend error:", ed); }
          else { console.log("PRP email sent:", email, "PRS:", prs, prsLabel(prs), "worst_joints:", worstJoints.length); }
        }
      } catch (e) { console.error("PRP email error (tiers OK):", e); }
    }

    return new Response(
      JSON.stringify({ success: true, computed: eligibilityRows.length, belt, sport, assessmentId, counts, worstJointsCount: worstJoints.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  }
});
