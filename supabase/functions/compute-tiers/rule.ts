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

// F-17 (ankle unit mix). Base measures ankle ONE way: knee-to-wall, in CENTIMETERS (Jim closed this 2026-10-03). The
// ankle numbers already in rom_thresholds (10/15/20, matrix) and techniques.ankle_df_min (10-20 BJJ, 12-20 BB) were
// authored as degrees-style numbers with no unit and were being compared straight against cm. A cm value is never
// compared to those numbers any more: such a requirement is GREY (never GREEN, never a false RED) until a cm
// requirement exists. cm requirements are rom_thresholds rows whose joint is "Ankle DF (cm)" / "ankle_df_cm", or a
// techniques.ankle_df_cm_min column. PENDING JIM / Quinn: set this to true ONLY if the legacy numbers are confirmed to
// be centimeters (then they are used as cm exactly as before).
export const ANKLE_LEGACY_REQUIREMENTS_ARE_CM = false;

// Decision #4 (Jim, closed): YELLOW is a FLAT distance below the requirement, not a 90% ratio.
// A reading within 10 degrees below the requirement is YELLOW (10 degrees exactly is still YELLOW, "within 10"),
// and the ankle (centimeters) uses 2 cm. Anything further below is RED. At or above the requirement is GREEN.
export const YELLOW_TOLERANCE_DEG = 10;
export const YELLOW_TOLERANCE_ANKLE_CM = 2;
export function yellowTolerance(joint: string): number {
  return joint === "ankle_df" ? YELLOW_TOLERANCE_ANKLE_CM : YELLOW_TOLERANCE_DEG;
}

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
  "ankle df (cm)": "ankle_df_cm", "ankle_df_cm": "ankle_df_cm", "ankle dorsiflexion (cm)": "ankle_df_cm",
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

// Laterality (Decision #6, Jim closed: follow the sheet's rule per move; the sheet's dominant-side field decides):
//   BOTH / MIDLINE / blank / N/A = worse side (MIDLINE joints have one value)
//   ANY                          = better side
//   LEAD                         = the DOMINANT side
//   HOOK, TRAIL                  = the OTHER (non-dominant) side
// If the athlete has no dominant side on file the worse side is used (never looser than the sheet) and, if the named
// side was not measured, the side that was measured is used. Side gaps are a NOTE only (see sideGapNote); the
// sheet's 15% / 25% asymmetry downgrade of the color is DROPPED and never applied here.
export type Dominant = "left" | "right" | null | undefined;
export function normalizeDominant(raw: unknown): "left" | "right" | null {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "left" || s === "l" ? "left" : s === "right" || s === "r" ? "right" : null;
}
export function athleteValue(a: Record<string, unknown>, joint: string, laterality?: string | null, dominant?: Dominant): number | null {
  if (joint in BILATERAL) {
    const [lk, rk] = BILATERAL[joint];
    const l = toNum(a[lk]), r = toNum(a[rk]);
    const vs = [l, r].filter((x): x is number => x != null);
    if (!vs.length) return null;
    const rule = String(laterality ?? "").toUpperCase();
    const dom = normalizeDominant(dominant);
    if (rule === "ANY") return Math.max(...vs);
    if ((rule === "LEAD" || rule === "HOOK" || rule === "TRAIL") && dom) {
      const wantDominant = rule === "LEAD";
      const wanted = (dom === "left") === wantDominant ? l : r; // left-dominant + LEAD -> left; left-dominant + HOOK/TRAIL -> right
      return wanted ?? Math.min(...vs);
    }
    return Math.min(...vs);
  }
  if (joint in SINGLE) return toNum(a[SINGLE[joint]]);
  return null;
}

// Side gap in degrees (centimeters for the ankle) for the UI note. Never changes a color.
export function sideGapNote(a: Record<string, unknown>, joint: string): { left: number; right: number; gap: number } | null {
  if (!(joint in BILATERAL)) return null;
  const [lk, rk] = BILATERAL[joint];
  const l = toNum(a[lk]), r = toNum(a[rk]);
  if (l == null || r == null) return null;
  return { left: l, right: r, gap: Math.round(Math.abs(l - r) * 10) / 10 };
}

export type Requirement = {
  joint: string;
  required: number;
  laterality?: string | null;
  unit_pending?: boolean; // ankle only: requirement has no cm number yet, so it cannot be compared to a cm reading
};

// Build the requirement list for one move. matrixRows come from rom_thresholds (documented). techniqueRow is the
// legacy techniques row, used only for joints the matrix has no number for (kept, not invented).
export function buildRequirements(
  matrixRows: { joint: string; required_value: unknown; laterality_rule?: string | null }[],
  techniqueRow?: Record<string, unknown> | null,
): Requirement[] {
  const byJoint = new Map<string, Requirement>();
  const ankleCm = new Set<string>(); // joints (only "ankle_df") whose requirement is an explicit cm number
  for (const r of matrixRows) {
    const req = toNum(r.required_value);
    if (req == null || req <= 0) continue;
    let joint = normalizeJoint(r.joint);
    const isCm = joint === "ankle_df_cm";
    if (isCm) joint = "ankle_df";
    // an explicit cm row always replaces a legacy unit-less ankle row (no stricter-number rule across units)
    if (isCm && !ankleCm.has(joint)) { byJoint.delete(joint); ankleCm.add(joint); }
    else if (!isCm && ankleCm.has(joint)) continue;
    const cur = byJoint.get(joint);
    // two documented rows for one joint (for example LEAD and TRAIL): the stricter number applies (flagged Q7).
    if (!cur || req > cur.required) byJoint.set(joint, { joint, required: req, laterality: r.laterality_rule ?? null });
  }
  if (techniqueRow) {
    const cmMin = toNum(techniqueRow["ankle_df_cm_min"]);
    if (cmMin != null && cmMin > 0 && !ankleCm.has("ankle_df")) {
      byJoint.set("ankle_df", { joint: "ankle_df", required: cmMin, laterality: null });
      ankleCm.add("ankle_df");
    }
    for (const [col, val] of Object.entries(techniqueRow)) {
      if (!col.endsWith("_min")) continue;
      const req = toNum(val);
      if (req == null || req <= 0) continue;
      const joint = col.slice(0, -4);
      if (!EVALUABLE.has(joint) || byJoint.has(joint)) continue;
      byJoint.set(joint, { joint, required: req, laterality: null });
    }
  }
  // F-17: a unit-less ankle requirement is never compared to a cm reading.
  const ankle = byJoint.get("ankle_df");
  if (ankle && !ankleCm.has("ankle_df") && !ANKLE_LEGACY_REQUIREMENTS_ARE_CM) ankle.unit_pending = true;
  return [...byJoint.values()];
}

// basis "slr_norm" marks a joint colored from the Base straight-leg norm table instead of the move's own number (flagged,
// PENDING JIM: HIP_FLEX_MOVES_USE_SLR_COLOR in base_norms.ts). Names and colors only; no degrees.
export type JointStatus = { joint: string; status: Status; basis?: "slr_norm" };
export type JointOverrides = Partial<Record<string, { status: Status; basis: "slr_norm" }>>;
export type MoveResult = {
  tier: Status;
  grey_reason: GreyReason | null;
  joint_status: JointStatus[]; // no thresholds or degrees: names and colors only
  limiting: string[]; // legacy text array, same format as before
};

export function classifyJoint(value: number | null, required: number, joint = ""): Status {
  if (value == null) return "GREY";
  if (value >= required) return "GREEN";
  if (value >= required - yellowTolerance(joint)) return "YELLOW";
  return "RED";
}

// Move color (Decision #3): the WORST measured REQUIRED joint wins. A required joint that is not measured, or a move
// with no rule, is GREY ("Not rated"), never GREEN. A real RED / YELLOW on another joint still beats GREY.
export function classifyMove(a: Record<string, unknown>, reqs: Requirement[], dominant?: Dominant, overrides?: JointOverrides): MoveResult {
  if (reqs.length === 0) return { tier: "GREY", grey_reason: "no_rule", joint_status: [], limiting: [] };
  const joint_status: JointStatus[] = [];
  const limiting: string[] = [];
  for (const r of reqs) {
    const ov = overrides?.[r.joint];
    if (ov) {
      joint_status.push({ joint: r.joint, status: ov.status, basis: ov.basis });
      if (ov.status === "GREY") limiting.push(`${r.joint}:slr_not_rated`);
      else if (ov.status !== "GREEN") limiting.push(`${r.joint}:slr_norm`);
      continue;
    }
    if (r.unit_pending) {
      joint_status.push({ joint: r.joint, status: "GREY" });
      limiting.push(`${r.joint}:cm_requirement_pending`);
      continue;
    }
    const v = EVALUABLE.has(r.joint) ? athleteValue(a, r.joint, r.laterality, dominant) : null;
    const status = classifyJoint(v, r.required, r.joint);
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
