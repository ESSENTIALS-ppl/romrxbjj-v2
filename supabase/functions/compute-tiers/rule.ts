// Per-joint technique readiness rule (pure, no Deno/Supabase imports so it can be unit tested in node).
//
// Jim's rule (IP):
//   - each required joint is GREEN / YELLOW / RED against THAT move's requirement
//   - the move takes the WORST measured required joint
//   - no rule, or a required joint that is not measured, is GREY and never GREEN
//   - no blended score color; Base / Position Readiness labels are not touched here
//
// Thresholds: only documented ones (rom_thresholds = Jim's White Belt Matrix + White doc). Where the matrix has no
// value for a (move, joint) the legacy techniques.<joint>_min value is kept (flagged as undocumented in the PR).

export type Status = "GREEN" | "YELLOW" | "RED" | "GREY";
export type GreyReason = "no_rule" | "incomplete";

export const YELLOW_BAND = 0.90; // OPEN QUESTION Q1: Jim's sheet says "within 10 degrees"; kept at the current 90% ratio until he decides.

const BILATERAL: Record<string, [string, string]> = {
  hip_er: ["hip_er_l", "hip_er_r"],
  hip_ir: ["hip_ir_l", "hip_ir_r"],
  hip_abd: ["hip_abd_l", "hip_abd_r"],
  hip_flex: ["hip_flex_l", "hip_flex_r"],
  shoulder_er: ["shoulder_er_l", "shoulder_er_r"],
  shoulder_flex: ["shoulder_flex_l", "shoulder_flex_r"],
  ankle_df: ["ankle_df_l", "ankle_df_r"],
  cervical_rot: ["cervical_rot_l", "cervical_rot_r"],
  cervical_lat: ["cervical_lat_l", "cervical_lat_r"],
};
const SINGLE: Record<string, string> = {
  lumbar_flex: "lumbar_flex",
  lumbar_ext: "lumbar_ext",
  cervical_flex: "cervical_flex",
  cervical_ext: "cervical_ext",
};
export const EVALUABLE = new Set([...Object.keys(BILATERAL), ...Object.keys(SINGLE)]);

// rom_thresholds.joint spellings -> app joint keys. Anything not here (for example hip_ext, thoracic) is kept as its
// own key and treated as not measured (the app does not collect it), so it can never produce GREEN.
const JOINT_ALIAS: Record<string, string> = {
  "hip er": "hip_er", "hip_external_rotation": "hip_er",
  "hip ir": "hip_ir", "hip_internal_rotation": "hip_ir",
  "hip abduction": "hip_abd", "hip_abduction": "hip_abd",
  "hip flexion": "hip_flex", "hip_flexion": "hip_flex",
  "hip extension": "hip_ext", "hip_extension": "hip_ext",
  "shoulder er": "shoulder_er", "shoulder_external_rotation": "shoulder_er",
  "shoulder flexion": "shoulder_flex", "shoulder_flexion": "shoulder_flex",
  "ankle df": "ankle_df", "ankle_dorsiflexion": "ankle_df", "ankle_df": "ankle_df",
  "cervical rotation": "cervical_rot", "cervical_rotation": "cervical_rot",
  "cervical lateral flexion": "cervical_lat", "cervical_lateral_flexion": "cervical_lat",
  "cervical flexion": "cervical_flex", "cervical_flexion": "cervical_flex",
  "cervical extension": "cervical_ext", "cervical_extension": "cervical_ext",
  "lumbar flexion": "lumbar_flex", "lumbar_flexion": "lumbar_flex",
  "lumbar extension": "lumbar_ext", "lumbar_extension": "lumbar_ext",
};

export function normalizeJoint(raw: string): string {
  const k = String(raw).trim().toLowerCase();
  return JOINT_ALIAS[k] ?? k.replace(/\s+/g, "_");
}

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
}

// Laterality (Jim's matrix): ANY = better side is enough; everything else uses the worse side.
// OPEN QUESTION Q6: LEAD / HOOK / TRAIL need a dominant-side field; until then the worse side is used.
export function athleteValue(a: Record<string, unknown>, joint: string, laterality?: string | null): number | null {
  if (joint in BILATERAL) {
    const [l, r] = BILATERAL[joint];
    const vs = [toNum(a[l]), toNum(a[r])].filter((x): x is number => x != null);
    if (!vs.length) return null;
    return String(laterality ?? "").toUpperCase() === "ANY" ? Math.max(...vs) : Math.min(...vs);
  }
  if (joint in SINGLE) return toNum(a[SINGLE[joint]]);
  return null;
}

export type Requirement = { joint: string; required: number; laterality?: string | null };

// Build the requirement list for one move. matrixRows come from rom_thresholds (documented). techniqueRow is the
// legacy techniques row, used only for joints the matrix has no number for (kept, not invented).
export function buildRequirements(
  matrixRows: { joint: string; required_value: unknown; laterality_rule?: string | null }[],
  techniqueRow?: Record<string, unknown> | null,
): Requirement[] {
  const byJoint = new Map<string, Requirement>();
  for (const r of matrixRows) {
    const req = toNum(r.required_value);
    if (req == null || req <= 0) continue;
    const joint = normalizeJoint(r.joint);
    const prev = byJoint.get(joint);
    // two documented rows for one joint (for example LEAD and TRAIL): the stricter number applies (flagged Q7).
    if (!prev || req > prev.required) byJoint.set(joint, { joint, required: req, laterality: r.laterality_rule ?? null });
  }
  if (techniqueRow) {
    for (const [col, val] of Object.entries(techniqueRow)) {
      if (!col.endsWith("_min")) continue;
      const req = toNum(val);
      if (req == null || req <= 0) continue;
      const joint = col.slice(0, -4);
      if (!EVALUABLE.has(joint) || byJoint.has(joint)) continue;
      byJoint.set(joint, { joint, required: req, laterality: null });
    }
  }
  return [...byJoint.values()];
}

export type JointStatus = { joint: string; status: Status };
export type MoveResult = {
  tier: Status;
  grey_reason: GreyReason | null;
  joint_status: JointStatus[]; // no thresholds or degrees: names and colors only
  limiting: string[]; // legacy text array, same format as before
};

export function classifyJoint(value: number | null, required: number): Status {
  if (value == null) return "GREY";
  const ratio = value / required;
  if (ratio >= 1) return "GREEN";
  if (ratio >= YELLOW_BAND) return "YELLOW";
  return "RED";
}

export function classifyMove(a: Record<string, unknown>, reqs: Requirement[]): MoveResult {
  if (reqs.length === 0) return { tier: "GREY", grey_reason: "no_rule", joint_status: [], limiting: [] };
  const joint_status: JointStatus[] = [];
  const limiting: string[] = [];
  for (const r of reqs) {
    const v = EVALUABLE.has(r.joint) ? athleteValue(a, r.joint, r.laterality) : null;
    const status = classifyJoint(v, r.required);
    joint_status.push({ joint: r.joint, status });
    if (status === "GREY") limiting.push(`${r.joint}:not_measured(min ${r.required})`);
    else if (status !== "GREEN") limiting.push(`${r.joint}:${v} vs min ${r.required}`);
  }
  const has = (s: Status) => joint_status.some(j => j.status === s);
  if (has("RED")) return { tier: "RED", grey_reason: null, joint_status, limiting };
  if (has("YELLOW")) return { tier: "YELLOW", grey_reason: null, joint_status, limiting };
  if (has("GREY")) return { tier: "GREY", grey_reason: "incomplete", joint_status, limiting };
  return { tier: "GREEN", grey_reason: null, joint_status, limiting: [] };
}
