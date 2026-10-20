// compute-tiers v41 - readiness engine + Phase A1 protocol persist
// v41 (Jim ledger L128, L129, L135; Oct 3 2026): move colour = worst measured required joint; no rule or a missing joint =
//   GREY "Not rated" (never GREEN); YELLOW = within a flat 10 deg (ankle 2 cm) of the minimum, not 90%. Rule in move_colour.ts.
//   Needs migration 20261020180000 (allows tier GREY) applied FIRST. Base bands are unchanged.
// v40 (Oct 6 2026, 8:19 PM; Jim-approved, Quinn spec): shoulder_er 40 -> 85, the STANDING goal-post test (arm out to the side,
//   elbow at shoulder height, bent like a goal post). Only that target changes. Mirrors mobilityBands.ts / compute_joint_scores().
// v39 (Jim decisions, Oct 6 2026): Steady targets hip_er 29, hip_ir 26 (Simoneau et al. 1998, Quinn option B1; were 45),
//   hip_abd 40 (was 90), shoulder_flex 140 (Gill et al. 2020; was 180), ankle_df 6 cm (Konor 2012 / McBride 2026; was 20),
//   cervical_rot 70 (was 80) and cervical_lat 38 (was 45) (Swinkels & Swinkels-Meewisse 2014, Spine, PMID 24573069),
//   shoulder_er 40 (was 90): tucked-elbow test lying on your back, typical range 40-75 (Gill et al. 2020, PMID 33046038).
//   Feeds worst_joints + rom_total only. Technique minimums (techniques.*_min) are rescaled to these targets by
//   migration 20261012220000_pack_minimums_rescale.sql (Jim YES Oct 6 12:10 PM; data only, classify() is unchanged; Quinn calls 12:22 PM: SLR 60/120,
//   shoulder_er 85/90, 4 ankle overrides).
//   Mirrors romrx-io-web mobilityBands.ts JOINT_SCORE_TARGETS and public.compute_joint_scores().
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
  hip_er_l: 29, hip_er_r: 29,   // Oct 6 2026: was 45
  hip_ir_l: 26, hip_ir_r: 26,   // Oct 6 2026: was 45
  hip_abd_l: 40, hip_abd_r: 40, // Oct 6 2026: was 90
  hip_flex_l: 120, hip_flex_r: 120,
  hip_ext_l: 30, hip_ext_r: 30,
  shoulder_er_l: 85, shoulder_er_r: 85,       // Oct 6 2026 8:19 PM: standing goal-post (was 40 tucked elbow; 90 before)
  shoulder_flex_l: 140, shoulder_flex_r: 140, // Oct 6 2026: was 180
  ankle_df_l: 6, ankle_df_r: 6,               // Oct 6 2026: was 20 (cm)
  cervical_rot_l: 70, cervical_rot_r: 70,     // Oct 6 2026: was 80 (Swinkels 2014)
  cervical_lat_l: 38, cervical_lat_r: 38,     // Oct 6 2026: was 45 (Swinkels 2014)
  cervical_flex: 50, cervical_ext: 60,
  thoracic_rot_l: 45, thoracic_rot_r: 45,
  lumbar_flex: 60, lumbar_ext: 25,
  balance_l: 30, balance_r: 30,
};

import { classify, toNum } from "./move_colour.ts";

function computeWorstJointKeys(a: Record<string, unknown>, limit = 5): string[] {
  // body in ./joint_totals.ts (pure, unit tested); HIP_FLEX_UNSCORED there keeps hip flexion out of weak spots and the /100
  return worstJointKeys(a, JOINT_TARGETS, toNum, limit);
}

function computeRomTotal(a: Record<string, unknown>): number {
  return romTotal(a, JOINT_TARGETS, toNum);
}
import { romTotal, worstJointKeys } from "./joint_totals.ts";

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
    const counts: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0, GREY: 0 };

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
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
