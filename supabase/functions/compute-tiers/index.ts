// ============================================================
// ROMRx compute-tiers — Supabase Edge Function
// Fires via DB webhook on assessments INSERT
// Resolves laterality + age/injury modifiers, bulk-inserts
// technique_eligibility rows (44 white or 124 white+blue)
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const assessment = payload.record ?? payload;
    const userId = assessment.user_id;
    const assessmentId = assessment.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get athlete info (belt, DOB for age modifier, injury flags)
    const { data: athlete } = await supabase
      .from("users")
      .select("belt, portal_role")
      .eq("id", userId)
      .single();

    const belt = athlete?.belt ?? "white";

    // Get ROM values from assessment row
    const romValues: Record<string, number> = {
      hip_er_l:       assessment.hip_er_l ?? 0,
      hip_er_r:       assessment.hip_er_r ?? 0,
      hip_ir_l:       assessment.hip_ir_l ?? 0,
      hip_ir_r:       assessment.hip_ir_r ?? 0,
      hip_abd_l:      assessment.hip_abd_l ?? 0,
      hip_abd_r:      assessment.hip_abd_r ?? 0,
      hip_flex_l:     assessment.hip_flex_l ?? 0,
      hip_flex_r:     assessment.hip_flex_r ?? 0,
      shoulder_er_l:  assessment.shoulder_er_l ?? 0,
      shoulder_er_r:  assessment.shoulder_er_r ?? 0,
      shoulder_flex_l:assessment.shoulder_flex_l ?? 0,
      shoulder_flex_r:assessment.shoulder_flex_r ?? 0,
      ankle_df_l:     assessment.ankle_df_l ?? 0,
      ankle_df_r:     assessment.ankle_df_r ?? 0,
      lumbar_flex:    assessment.lumbar_flex ?? 0,
      thoracic_rot:   assessment.thoracic_rot ?? 0,
    };

    // Age modifier (40+ = 5%, 50+ = 8% reduction to thresholds)
    const ageMod = 1.0; // Will apply when DOB is tracked on users

    // Fetch techniques for this belt
    const beltFilter = belt === "white" ? ["white"] : ["white", "blue"];
    const { data: techniques } = await supabase
      .from("techniques")
      .select("id, name, belt, category, hip_er_min, hip_ir_min, hip_abd_min, hip_flex_min, shoulder_er_min, ankle_df_min, lumbar_flex_min, thoracic_rot_min")
      .in("belt", beltFilter);

    if (!techniques?.length) {
      return new Response(JSON.stringify({ success: false, error: "No techniques found — seed data pending" }));
    }

    // Compute tier for each technique
    const eligibilityRows = techniques.map((tech) => {
      const thresholds: Array<{ key: string; min: number | null }> = [
        { key: "hip_er",       min: tech.hip_er_min },
        { key: "hip_ir",       min: tech.hip_ir_min },
        { key: "hip_abd",      min: tech.hip_abd_min },
        { key: "hip_flex",     min: tech.hip_flex_min },
        { key: "shoulder_er",  min: tech.shoulder_er_min },
        { key: "ankle_df",     min: tech.ankle_df_min },
        { key: "lumbar_flex",  min: tech.lumbar_flex_min },
        { key: "thoracic_rot", min: tech.thoracic_rot_min },
      ].filter((t) => t.min != null);

      const limitingJoints: string[] = [];
      let worstRatio = 1.0;

      for (const threshold of thresholds) {
        const required = threshold.min! * ageMod;
        // Use better side (bilateral joints: take max of L/R)
        const leftKey = threshold.key + "_l";
        const rightKey = threshold.key + "_r";
        const bilateral = leftKey in romValues;
        const actual = bilateral
          ? Math.max(romValues[leftKey] ?? 0, romValues[rightKey] ?? 0)
          : (romValues[threshold.key] ?? 0);

        const ratio = required > 0 ? actual / required : 1.0;
        if (ratio < 1.0) limitingJoints.push(threshold.key);
        if (ratio < worstRatio) worstRatio = ratio;
      }

      const tier = worstRatio >= 1.0 ? "GREEN" : worstRatio >= 0.75 ? "YELLOW" : "RED";

      return {
        user_id:       userId,
        assessment_id: assessmentId,
        technique_id:  tech.id,
        tier,
        limiting_joints: limitingJoints,
      };
    });

    // Delete old eligibility for this assessment (idempotent re-runs)
    await supabase.from("technique_eligibility").delete().eq("assessment_id", assessmentId);

    // Bulk insert
    const { error: insertErr } = await supabase.from("technique_eligibility").insert(eligibilityRows);
    if (insertErr) throw insertErr;

    const counts = { green: 0, yellow: 0, red: 0 };
    eligibilityRows.forEach((r) => { counts[r.tier.toLowerCase() as keyof typeof counts]++; });

    return new Response(
      JSON.stringify({ success: true, computed: eligibilityRows.length, belt, assessmentId, counts }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  }
});
