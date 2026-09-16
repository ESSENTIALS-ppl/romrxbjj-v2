// compute-tiers v38 - readiness engine + Phase A1 protocol persist
// v38: persist top-3 joint daily Rx into public.protocols (matches My Protocol / rombot_context)
// v36: also emits per-joint scores into public.joint_scores via the SQL fn
//   public.compute_joint_scores(p_assessment_id). Sport-agnostic, guarded so a
//   failure never blocks tier/eligibility. Single source of truth = the SQL fn. (Jim 2026-07-07)
// v34: techniques with NO threshold on any assessed joint -> GREEN (not skipped).
//
// v33 restores technique readiness scoring that v32 stubbed out.
// RULE (worst-joint driven, agreed w/ Jim 2026-07-06):
//   RED / YELLOW / GREEN from required joint thresholds.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const JOINT_TARGETS: Record<string, number> = {
  hip_er_l: 45, hip_er_r: 45,
  hip_ir_l: 45, hip_ir_r: 45,
  hip_abd_l: 90, hip_abd_r: 90,
  hip_flex_l: 120, hip_flex_r: 120,
  hip_ext_l: 30, hip_ext_r: 30,
  shoulder_er_l: 90, shoulder_er_r: 90,
  shoulder_flex_l: 180, shoulder_flex_r: 180,
  ankle_df_l: 20, ankle_df_r: 20,
  cervical_rot_l: 80, cervical_rot_r: 80,
  cervical_lat_l: 45, cervical_lat_r: 45,
  cervical_flex: 50, cervical_ext: 60,
  thoracic_rot_l: 45, thoracic_rot_r: 45,
  lumbar_flex: 60, lumbar_ext: 25,
  balance_l: 30, balance_r: 30,
};

const YELLOW_BAND = 0.90;

const BILATERAL: Record<string, [string, string]> = {
  hip_er:        ["hip_er_l", "hip_er_r"],
  hip_ir:        ["hip_ir_l", "hip_ir_r"],
  hip_abd:       ["hip_abd_l", "hip_abd_r"],
  hip_flex:      ["hip_flex_l", "hip_flex_r"],
  shoulder_er:   ["shoulder_er_l", "shoulder_er_r"],
  shoulder_flex: ["shoulder_flex_l", "shoulder_flex_r"],
  ankle_df:      ["ankle_df_l", "ankle_df_r"],
  cervical_rot:  ["cervical_rot_l", "cervical_rot_r"],
  cervical_lat:  ["cervical_lat_l", "cervical_lat_r"],
};
const SINGLE: Record<string, string> = {
  lumbar_flex:   "lumbar_flex",
  lumbar_ext:    "lumbar_ext",
  cervical_flex: "cervical_flex",
  cervical_ext:  "cervical_ext",
};
const EVALUABLE = new Set([...Object.keys(BILATERAL), ...Object.keys(SINGLE)]);

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
}

function athleteValue(a: Record<string, unknown>, joint: string): number | null {
  if (joint in BILATERAL) {
    const [l, r] = BILATERAL[joint];
    const vs = [toNum(a[l]), toNum(a[r])].filter((x): x is number => x != null);
    return vs.length ? Math.min(...vs) : null;
  }
  if (joint in SINGLE) return toNum(a[SINGLE[joint]]);
  return null;
}

type LimitingJoint = { joint: string; value: number | null; min: number; ratio?: number; reason?: string };
type TierResult = { tier: "GREEN" | "YELLOW" | "RED"; limiting: LimitingJoint[] };

function classify(a: Record<string, unknown>, technique: Record<string, unknown>): TierResult {
  const required: { joint: string; thresh: number }[] = [];
  for (const [col, val] of Object.entries(technique)) {
    if (!col.endsWith("_min")) continue;
    const thresh = toNum(val);
    if (thresh == null || thresh === 0) continue;
    const joint = col.slice(0, -4);
    if (!EVALUABLE.has(joint)) continue;
    required.push({ joint, thresh });
  }
  if (required.length === 0) return { tier: "GREEN", limiting: [] };

  const limiting: LimitingJoint[] = [];
  const missing: LimitingJoint[] = [];
  let worstRatio: number | null = null;

  for (const { joint, thresh } of required) {
    const av = athleteValue(a, joint);
    if (av == null) {
      missing.push({ joint, value: null, min: thresh, reason: "not_measured" });
      continue;
    }
    const ratio = thresh ? av / thresh : 1.0;
    if (worstRatio == null || ratio < worstRatio) worstRatio = ratio;
    if (ratio < 1.0) limiting.push({ joint, value: av, min: thresh, ratio: Math.round(ratio * 1000) / 1000 });
  }

  if (worstRatio != null && worstRatio < YELLOW_BAND) {
    return { tier: "RED", limiting: limiting.filter(x => (x.ratio ?? 1) < YELLOW_BAND) };
  }
  const band = limiting.filter(x => (x.ratio ?? 1) >= YELLOW_BAND && (x.ratio ?? 1) < 1.0);
  if (band.length || missing.length) {
    return { tier: "YELLOW", limiting: [...band, ...missing] };
  }
  return { tier: "GREEN", limiting: [] };
}

function computeWorstJointKeys(a: Record<string, unknown>, limit = 5): string[] {
  const rows: { key: string; pct: number }[] = [];
  for (const [key, target] of Object.entries(JOINT_TARGETS)) {
    const num = toNum(a[key]);
    if (num == null) continue;
    rows.push({ key, pct: Math.max(0, Math.min(1, num / target)) });
  }
  rows.sort((x, y) => x.pct - y.pct);
  return rows.slice(0, limit).map(r => r.key);
}

function computeRomTotal(a: Record<string, unknown>): number {
  const pcts: number[] = [];
  for (const [key, target] of Object.entries(JOINT_TARGETS)) {
    const num = toNum(a[key]);
    if (num == null) continue;
    pcts.push(Math.max(0, Math.min(1, num / target)) * 100);
  }
  if (pcts.length === 0) return 0;
  return Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const record = (body?.record ?? body) as Record<string, unknown>;
    const assessmentId = record?.id as string | undefined;

    if (!assessmentId) {
      return json({ success: false, error: "missing_assessment_id" }, 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: assessment, error: fetchErr } = await supa
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();
    if (fetchErr || !assessment) {
      return json({ success: false, error: "assessment_not_found", detail: fetchErr?.message }, 404);
    }

    const sport = (assessment.sport as string | undefined) ?? "general";
    const userId = assessment.user_id as string | undefined;
    const athleteId = (assessment.athlete_id as string | undefined) ?? null;

    const worstJoints = computeWorstJointKeys(assessment, 5);
    const romTotal = computeRomTotal(assessment);
    const { error: updErr } = await supa
      .from("assessments")
      .update({ worst_joints: worstJoints, rom_total: romTotal })
      .eq("id", assessmentId);
    if (updErr) {
      return json({ success: false, error: "assessment_update_failed", detail: updErr.message }, 500);
    }

    try {
      const { error: jsErr } = await supa.rpc("compute_joint_scores", { p_assessment_id: assessmentId });
      if (jsErr) console.error("compute_joint_scores failed:", jsErr.message);
    } catch (e) {
      console.error("compute_joint_scores threw:", String(e));
    }

    // Phase A1: persist protocol for ALL sports (including general/Base) so ROMBot
    // and My Protocol share one source of truth via rombot_context.protocol.
    // SQL fn public.persist_protocols_for_assessment mirrors My Protocol ranking + RX pick.
    let protocolPersist: Record<string, unknown> = { written: 0 };
    try {
      const { data: protoData, error: protoErr } = await supa.rpc(
        "persist_protocols_for_assessment",
        { p_assessment_id: assessmentId },
      );
      if (protoErr) {
        console.error("persist_protocols RPC failed:", protoErr.message);
        protocolPersist = { error: protoErr.message };
      } else {
        protocolPersist = (protoData as Record<string, unknown>) ?? { written: 0 };
      }
    } catch (e) {
      console.error("persist_protocols threw:", String(e));
      protocolPersist = { error: String(e) };
    }

    if (sport !== "bjj" && sport !== "bodybuilding") {
      return json({
        success: true, assessment_id: assessmentId, sport,
        worst_joints: worstJoints, rom_total: romTotal,
        protocol: protocolPersist,
        eligibility: "skipped_no_technique_catalog_for_sport",
      });
    }

    const { data: techniques, error: techErr } = await supa
      .from("techniques")
      .select("*")
      .eq("sport", sport);
    if (techErr || !techniques) {
      return json({ success: false, error: "techniques_fetch_failed", detail: techErr?.message }, 500);
    }

    const now = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];
    const counts: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0 };

    for (const t of techniques as Record<string, unknown>[]) {
      const res = classify(assessment, t);
      counts[res.tier]++;
      rows.push({
        user_id: userId,
        athlete_id: athleteId,
        assessment_id: assessmentId,
        technique_id: t.id,
        technique_code: t.code,
        sport,
        tier: res.tier,
        limiting_joints: res.limiting.map(l =>
          l.reason === "not_measured"
            ? `${l.joint}:not_measured(min ${l.min})`
            : `${l.joint}:${l.value} vs min ${l.min}`
        ),
        computed_at: now,
      });
    }

    if (rows.length) {
      const { error: upErr } = await supa
        .from("technique_eligibility")
        .upsert(rows, { onConflict: "user_id,assessment_id,technique_id" });
      if (upErr) {
        return json({ success: false, error: "eligibility_upsert_failed", detail: upErr.message }, 500);
      }
    }

    return json({
      success: true,
      assessment_id: assessmentId,
      sport,
      worst_joints: worstJoints,
      rom_total: romTotal,
      protocol: protocolPersist,
      eligibility: { written: rows.length, ...counts },
    });
  } catch (e) {
    return json({ success: false, error: "unexpected", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
