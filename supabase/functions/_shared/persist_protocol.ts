// Persist daily/full protocol rows to public.protocols so rombot_context.protocol
// matches My Protocol (romrx-io-web): top-3 joints x (resistance, stretch, foam).
// Mirrors app/src/pages/MyProtocol.tsx scoring + exercise grouping.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

type JointDef = {
  key: string;
  leftKey?: string;
  rightKey?: string;
  singleKey?: string;
  normalMin: number;
  riskBelow: number;
};

const JOINTS: JointDef[] = [
  { key: "hip_er", leftKey: "hip_er_l", rightKey: "hip_er_r", normalMin: 40, riskBelow: 40 },
  { key: "hip_ir", leftKey: "hip_ir_l", rightKey: "hip_ir_r", normalMin: 30, riskBelow: 30 },
  { key: "hip_abd", leftKey: "hip_abd_l", rightKey: "hip_abd_r", normalMin: 40, riskBelow: 30 },
  { key: "hip_flex", leftKey: "hip_flex_l", rightKey: "hip_flex_r", normalMin: 100, riskBelow: 100 },
  { key: "shoulder_er", leftKey: "shoulder_er_l", rightKey: "shoulder_er_r", normalMin: 60, riskBelow: 60 },
  { key: "shoulder_flex", leftKey: "shoulder_flex_l", rightKey: "shoulder_flex_r", normalMin: 140, riskBelow: 120 },
  { key: "ankle_df", leftKey: "ankle_df_l", rightKey: "ankle_df_r", normalMin: 10, riskBelow: 10 },
  { key: "lumbar_flex", singleKey: "lumbar_flex", normalMin: 40, riskBelow: 40 },
  { key: "lumbar_ext", singleKey: "lumbar_ext", normalMin: 20, riskBelow: 15 },
  { key: "cervical_rot", leftKey: "cervical_rot_l", rightKey: "cervical_rot_r", normalMin: 70, riskBelow: 60 },
];

const JOINT_KEY_ALIASES: Record<string, string[]> = {
  hip_er: ["hip_er"],
  hip_ir: ["hip_ir"],
  hip_abd: ["hip_abd", "hip_abduction"],
  hip_flex: ["hip_flex", "hip_flexion"],
  shoulder_er: ["shoulder_er"],
  shoulder_flex: ["shoulder_flex", "shoulder_flexion"],
  ankle_df: ["ankle_df"],
  lumbar_flex: ["lumbar_flex", "lumbar_flexion"],
  lumbar_ext: ["lumbar_ext", "lumbar_extension"],
  cervical_rot: ["cervical_rot", "cervical_rotation"],
};

// Prefer Field-verified / My Protocol daily primary names when present in DB.
const PREFERRED: Record<string, { resistance?: string; stretch?: string; foam_roll?: string }> = {
  ankle_df: {
    resistance: "Knee-to-Wall Mobilization",
    stretch: "Standing Gastrocnemius Stretch (Straight Knee)",
    foam_roll: "Calf Foam Roll",
  },
  hip_er: {
    resistance: "Clamshell with Band",
    stretch: "Supine Figure-4 Stretch (Piriformis)",
    foam_roll: "Piriformis/Glute Foam Roll",
  },
  hip_ir: {
    resistance: "Seated Banded Hip Internal Rotation",
    stretch: "90/90 Internal Rotation Stretch",
    foam_roll: "TFL/Lateral Hip Foam Roll",
  },
  hip_abd: {
    resistance: "Side-Lying Hip Abduction with Band",
    stretch: "Frog Stretch",
    foam_roll: "Adductor/Inner Thigh Foam Roll",
  },
};

type DbExercise = {
  id: string;
  joint_key: string;
  exercise_type: string;
  name: string;
  sets: number | null;
  reps: string | null;
  coaching_cue: string | null;
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function scoreJoints(a: Record<string, unknown>) {
  return JOINTS.map((def) => {
    const left = def.leftKey ? toNum(a[def.leftKey]) : null;
    const right = def.rightKey ? toNum(a[def.rightKey]) : null;
    const single = def.singleKey ? toNum(a[def.singleKey]) : null;
    let asymmetry = 0;
    let severity = 0;
    if (left !== null && right !== null) {
      asymmetry = Math.abs(left - right);
      const worst = Math.min(left, right);
      severity = Math.max(0, def.normalMin - worst);
    } else if (single !== null) {
      severity = Math.max(0, def.normalMin - single);
    }
    return { key: def.key, left, right, single, asymmetry, severity };
  });
}

function richness(e: DbExercise): number {
  return (e.sets ? 2 : 0) + (e.reps?.length ?? 0) + (e.coaching_cue?.length ?? 0);
}

function dedupe(scoped: DbExercise[]): DbExercise[] {
  const byKey = new Map<string, DbExercise>();
  for (const row of scoped) {
    const k = `${row.name.trim().toLowerCase()}|${row.exercise_type}`;
    const existing = byKey.get(k);
    if (!existing || richness(row) > richness(existing)) byKey.set(k, row);
  }
  return Array.from(byKey.values());
}

function pick(
  scoped: DbExercise[],
  type: string,
  preferredName?: string,
): DbExercise | null {
  const typed = scoped.filter((r) => r.exercise_type === type);
  if (!typed.length) return null;
  if (preferredName) {
    const hit = typed.find((r) => r.name === preferredName);
    if (hit) return hit;
    // fuzzy: starts-with / includes for slight name drift
    const fuzzy = typed.find((r) =>
      r.name.toLowerCase().includes(preferredName.toLowerCase().slice(0, 18))
    );
    if (fuzzy) return fuzzy;
  }
  return [...typed].sort((a, b) =>
    richness(b) !== richness(a) ? richness(b) - richness(a) : a.name.localeCompare(b.name)
  )[0]!;
}

export async function persistProtocolsForAssessment(
  admin: SupabaseClient,
  assessment: Record<string, unknown>,
): Promise<{ written: number; joints: string[] }> {
  const assessmentId = assessment.id as string;
  const userId = assessment.user_id as string;
  if (!assessmentId || !userId) return { written: 0, joints: [] };

  const ranked = scoreJoints(assessment)
    .filter((s) => s.left !== null || s.right !== null || s.single !== null)
    .sort((a, b) =>
      b.asymmetry !== a.asymmetry ? b.asymmetry - a.asymmetry : b.severity - a.severity
    )
    .slice(0, 3);

  if (ranked.length === 0) {
    await admin.from("protocols").delete().eq("assessment_id", assessmentId);
    return { written: 0, joints: [] };
  }

  const aliases = ranked.flatMap((r) => JOINT_KEY_ALIASES[r.key] ?? [r.key]);
  const { data: rows, error } = await admin
    .from("exercises")
    .select("id, joint_key, exercise_type, name, sets, reps, coaching_cue, sports")
    .in("joint_key", aliases)
    .contains("sports", ["general"]);
  if (error) throw new Error(`exercises_fetch_failed: ${error.message}`);

  const inserts: {
    assessment_id: string;
    user_id: string;
    exercise_id: string;
    joint_key: string;
    priority_rank: number;
  }[] = [];

  for (let i = 0; i < ranked.length; i++) {
    const joint = ranked[i]!;
    const rank = (i + 1) as 1 | 2 | 3;
    const aliasSet = new Set(JOINT_KEY_ALIASES[joint.key] ?? [joint.key]);
    const scoped = dedupe((rows ?? []).filter((r) => aliasSet.has(r.joint_key)));
    const pref = PREFERRED[joint.key] ?? {};
    for (const type of ["resistance", "stretch", "foam_roll"] as const) {
      const ex = pick(scoped, type, pref[type]);
      if (!ex) continue;
      inserts.push({
        assessment_id: assessmentId,
        user_id: userId,
        exercise_id: ex.id,
        joint_key: joint.key,
        priority_rank: rank,
      });
    }
  }

  const { error: delErr } = await admin.from("protocols").delete().eq("assessment_id", assessmentId);
  if (delErr) throw new Error(`protocols_delete_failed: ${delErr.message}`);

  if (inserts.length) {
    const { error: insErr } = await admin.from("protocols").insert(inserts);
    if (insErr) throw new Error(`protocols_insert_failed: ${insErr.message}`);
  }

  return { written: inserts.length, joints: ranked.map((r) => r.key) };
}
