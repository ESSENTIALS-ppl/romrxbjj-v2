// get-coach-roster v4
// Fixed: technique_eligibility uses user_id not athlete_id
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: userRow } = await admin.from("users").select("portal_role").eq("id", user.id).maybeSingle();
  if (!userRow || userRow.portal_role !== "coach") return json({ error: "Coach access required" }, 403);

  const { data: coachRow, error: coachErr } = await admin.from("coaches").select("id").eq("user_id", user.id).maybeSingle();
  if (coachErr || !coachRow) return json({ error: "Coach profile not found. Contact admin." }, 404);

  const { data: athletes, error: athErr } = await admin.from("athletes")
    .select("id, user_id, email, full_name, belt, is_active, gym_name")
    .eq("coach_id", coachRow.id)
    .eq("is_active", true);

  if (athErr) return json({ error: athErr.message }, 500);
  if (!athletes || athletes.length === 0) return json({ success: true, athletes: [], coach: coachRow });

  const athleteUserIds = athletes.map(a => a.user_id).filter(Boolean);

  // technique_eligibility uses user_id (not athlete_id)
  // Get latest assessment per athlete via user_id
  const { data: assessments } = await admin.from("assessments")
    .select("id, user_id, assessed_at, hip_er_l, hip_er_r, hip_ir_l, hip_ir_r, hip_abd_l, hip_abd_r, shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r, ankle_df_l, ankle_df_r, cervical_rot_l, cervical_rot_r, thoracic_rot, lumbar_flex, lumbar_ext")
    .in("user_id", athleteUserIds)
    .order("assessed_at", { ascending: false });

  // Latest assessment per user_id
  const latestAssessment: Record<string, (typeof assessments)[0]> = {};
  for (const a of (assessments ?? [])) {
    if (!latestAssessment[a.user_id]) latestAssessment[a.user_id] = a;
  }

  // Technique tiers keyed by user_id
  const assessmentIds = Object.values(latestAssessment).map(a => a?.id).filter(Boolean);
  const { data: tiers } = assessmentIds.length > 0
    ? await admin.from("technique_eligibility").select("user_id, tier, flag").in("assessment_id", assessmentIds)
    : { data: [] };

  const tierCounts: Record<string, { green: number; yellow: number; red: number; total: number }> = {};
  for (const t of (tiers ?? [])) {
    const key = t.user_id;
    if (!tierCounts[key]) tierCounts[key] = { green: 0, yellow: 0, red: 0, total: 0 };
    const tier = t.flag === "DELAY_TECHNIQUE" ? "red" : (t.tier ?? "").toLowerCase();
    if (tier === "green") tierCounts[key].green++;
    else if (tier === "yellow") tierCounts[key].yellow++;
    else if (tier === "red") tierCounts[key].red++;
    tierCounts[key].total++;
  }

  const BILATERAL_JOINTS = [
    { label: "Shoulder Flexion", l: "shoulder_flex_l", r: "shoulder_flex_r" },
    { label: "Shoulder ER",     l: "shoulder_er_l",  r: "shoulder_er_r" },
    { label: "Hip ER",          l: "hip_er_l",       r: "hip_er_r" },
    { label: "Hip IR",          l: "hip_ir_l",       r: "hip_ir_r" },
    { label: "Hip Abduction",   l: "hip_abd_l",      r: "hip_abd_r" },
    { label: "Ankle DF",        l: "ankle_df_l",     r: "ankle_df_r" },
    { label: "Cervical Rotation", l: "cervical_rot_l", r: "cervical_rot_r" },
  ];

  const roster = athletes.map(athlete => {
    const userId = athlete.user_id;
    const assessment = userId ? latestAssessment[userId] : undefined;
    const priorityJoints: Array<{ joint: string; gap: number; left: number; right: number }> = [];

    if (assessment) {
      const asmt = assessment as Record<string, number | null>;
      BILATERAL_JOINTS.forEach(j => {
        const l = asmt[j.l]; const r = asmt[j.r];
        if (l != null && r != null) priorityJoints.push({ joint: j.label, gap: Math.abs(l - r), left: l, right: r });
      });
      priorityJoints.sort((a, b) => b.gap - a.gap);
      priorityJoints.splice(3);
    }

    return {
      id: athlete.id,
      user_id: userId,
      email: athlete.email,
      name: athlete.full_name,
      belt: athlete.belt,
      gym: athlete.gym_name,
      lastAssessmentDate: assessment?.assessed_at ?? null,
      techniques: tierCounts[userId ?? ""] ?? { green: 0, yellow: 0, red: 0, total: 0 },
      priorityJoints,
    };
  });

  return json({ success: true, coach: coachRow, athletes: roster, total: roster.length });
});
