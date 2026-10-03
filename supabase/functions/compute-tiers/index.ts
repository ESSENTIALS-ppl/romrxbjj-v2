// v43 (DRAFT, not deployed) additions: ./base_norms.ts = Base hip flexion (straight-leg raise, per leg, sex-specific,
//   Youdas 2005, asymmetry flag) and ankle (knee-to-wall, cm) grades, returned as base_grades (response only, nothing
//   persisted, no schema change). F-17: ankle cm is never compared to unit-less 10/15/20 requirements (GREY until cm
//   requirements exist) and the old literal ankle target 20 is now ANKLE_DF_CM_TARGET.
// v43 (DRAFT, not deployed): per-joint rule in ./rule.ts. Worst measured required joint wins; no rule or an
//   unmeasured required joint is tier GREY (never GREEN). Thresholds come from rom_thresholds (documented matrix),
//   legacy techniques.*_min only fills gaps. Needs migration 20261003010000 (GREY tier, joint_status, status_reason).
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
import { buildRequirements, classifyMove, toNum } from "./rule.ts";
import { ANKLE_DF_CM_TARGET, gradeBaseJoints } from "./base_norms.ts";

const JOINT_TARGETS: Record<string, number> = {
  hip_er_l: 45, hip_er_r: 45,
  hip_ir_l: 45, hip_ir_r: 45,
  hip_abd_l: 90, hip_abd_r: 90,
  hip_flex_l: 120, hip_flex_r: 120,
  hip_ext_l: 30, hip_ext_r: 30,
  shoulder_er_l: 90, shoulder_er_r: 90,
  shoulder_flex_l: 180, shoulder_flex_r: 180,
  ankle_df_l: ANKLE_DF_CM_TARGET, ankle_df_r: ANKLE_DF_CM_TARGET, // F-17: cm target, was the literal 20 (PROPOSED value, see base_norms.ts)
  cervical_rot_l: 80, cervical_rot_r: 80,
  cervical_lat_l: 45, cervical_lat_r: 45,
  cervical_flex: 50, cervical_ext: 60,
  thoracic_rot_l: 45, thoracic_rot_r: 45,
  lumbar_flex: 60, lumbar_ext: 25,
  balance_l: 30, balance_r: 30,
};

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

// CORS (Reid E2E): the browser preflight (OPTIONS) used to fall through to req.json() and answer 400
// missing_assessment_id, so the belt-change call from romrx.io failed in browsers. Same header set the other
// browser-called functions use. No auth change here (verify_jwt stays false: the assessments DB webhook posts without a header, F-08).
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
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

    // Base grades (hip flexion per leg by sex, ankle cm). Read-only lookup of users.gender; never blocks the run.
    let baseGrades: Record<string, unknown> | null = null;
    try {
      let gender: unknown = null;
      if (userId) {
        const { data: u } = await supa.from("users").select("gender").eq("id", userId).maybeSingle();
        gender = (u as Record<string, unknown> | null)?.gender ?? null;
      }
      baseGrades = gradeBaseJoints(gender, assessment);
    } catch (e) {
      console.error("base grades failed:", String(e));
    }

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
        base_grades: baseGrades,
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

    // Documented thresholds (Jim's matrix + White doc) live in rom_thresholds; legacy techniques.*_min fills gaps only.
    const { data: matrix, error: matErr } = await supa
      .from("rom_thresholds")
      .select("technique_code,joint,required_value,laterality_rule")
      .eq("sport", sport)
      .range(0, 4999);
    if (matErr) {
      return json({ success: false, error: "rom_thresholds_fetch_failed", detail: matErr.message }, 500);
    }
    const matrixByCode = new Map<string, { joint: string; required_value: unknown; laterality_rule?: string | null }[]>();
    for (const m of (matrix ?? []) as Record<string, unknown>[]) {
      const code = String(m.technique_code ?? "");
      if (!code) continue;
      const list = matrixByCode.get(code) ?? [];
      list.push({ joint: String(m.joint), required_value: m.required_value, laterality_rule: (m.laterality_rule as string | null) ?? null });
      matrixByCode.set(code, list);
    }

    const now = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];
    const counts: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0, GREY: 0 };

    for (const t of techniques as Record<string, unknown>[]) {
      const res = classifyMove(assessment, buildRequirements(matrixByCode.get(String(t.code)) ?? [], t));
      counts[res.tier]++;
      rows.push({
        user_id: userId,
        athlete_id: athleteId,
        assessment_id: assessmentId,
        technique_id: t.id,
        technique_code: t.code,
        sport,
        tier: res.tier,
        limiting_joints: res.limiting,
        joint_status: res.joint_status,
        status_reason: res.grey_reason,
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
      base_grades: baseGrades,
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
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
