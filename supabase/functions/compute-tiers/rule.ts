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
// no_reference_range = the move's number for that joint is far above any published healthy average (Legal, STACY-CLEARANCES
// section 10: "no reference range yet" until Quinn answers Q4 / Q5). Shown as GREY, never RED or GREEN.
export type GreyReason = "no_rule" | "incomplete" | "no_reference_range";

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

// LEGAL RULING (Stacy): a matrix bar far above the healthy average must stay GREY with the reason "no reference range yet"
// until Quinn answers Q4 (ankle cm values with a source) and Q5 (hip rotation). Hip external rotation: healthy seated average
// is about 36 degrees, the matrix asks 40-70 (57 BJJ techniques ask 50 or more).
//   NO_REFERENCE_RANGE_SWITCH = true  (DEFAULT, Legal): a hip_er requirement of HIP_ER_NO_REFERENCE_MIN or more is GREY
//                               (no_reference_range). It never produces RED or GREEN for that joint; a real RED on another
//                               joint still wins. The ankle legacy degree path (ANKLE_LEGACY_REQUIREMENTS_ARE_CM = false) uses
//                               the same reason label.
//   NO_REFERENCE_RANGE_SWITCH = false: hip_er bars are graded against the number as before (RED for a healthy 36 degrees).
// SQL mirror: c_no_reference_range / c_hip_er_no_ref_min in recompute_user_eligibility. Change them together.
export const NO_REFERENCE_RANGE_SWITCH = true;
export const HIP_ER_NO_REFERENCE_MIN = 50;
export function isNoReferenceBar(joint: string, required: number): boolean {
  return NO_REFERENCE_RANGE_SWITCH && joint === "hip_er" && required >= HIP_ER_NO_REFERENCE_MIN;
}

// BB UNSOURCED GREY (DRAFT, branch draft/bb-unsourced-grey-20261004; Jim has NOT decided). Quinn's BB peer review (Oct 3): of 499
// Bodybuilding ROM numbers, 442 have no published support and 7 are contradicted by published values. Those numbers are marked in
// public.rom_number_source_status (sport, technique_code, joint, app_value, source_status). A requirement whose joint AND number
// match a mark is GREY with the same reason as above (no_reference_range, "no reference range yet"); a real RED on another joint
// still wins. The mark only applies while the requirement number equals the marked app_value, so a number that is later sourced or
// changed is graded normally again. Names / keys only, no personal data.
//   UNSOURCED_GREY_SWITCH = true  (default): marks are applied.   false: marks are ignored (BB behaves as in PR #74).
//   UNSOURCED_MARK_BEATS_SLR_OVERRIDE = false (default): hip flexion on a move keeps the Base straight-leg color (sourced norm,
//                              HIP_FLEX_MOVES_USE_SLR_COLOR) even if the move's hip flexion number is marked. true: the mark wins
//                              and that joint is GREY. All 7 CONTRADICTS and 99 unsourced numbers are hip flexion, so this matters.
// SQL mirror: c_unsourced_grey / c_unsourced_beats_slr in recompute_user_eligibility (migration 20261004010000). Change together.
export const UNSOURCED_GREY_SWITCH = true;
export const UNSOURCED_MARK_BEATS_SLR_OVERRIDE = false;
export type SourceMark = { joint: string; app_value: unknown; source_status?: "unsourced" | "contradicted" | string };

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
// PENDING JIM (confirm): move with one YELLOW joint and one unmeasured joint. true = GREY "Not rated" (default; RED still wins),
// false = YELLOW (the measured joint is shown). Change ONLY this constant (SQL mirror: c_grey_beats_yellow).
export const GREY_BEATS_YELLOW = true;

// PENDING JIM (confirm): one side of a two-sided test is missing (for example only the right leg was logged).
//   "grey"             = the joint is GREY ("Not rated") unless the move's sheet rule needs only the side that was logged
//                        (LEAD / HOOK / TRAIL with a known dominant side). Never GREEN from a blank side. Default (Quinn's reference).
//   "use_measured_side" = old behavior: grade with the side(s) that exist.
// Change ONLY this constant.
export type OneSidePolicy = "grey" | "use_measured_side";
export const ONE_SIDE_MISSING_POLICY: OneSidePolicy = "grey";
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

// A negative reading is an invalid entry and counts as NOT MEASURED (GREY). Zero is a real value (RED when a bar exists).
// Matches Quinn's reference (negative = invalid). Booleans and empty strings are not readings.
export function toNum(v: unknown): number | null {
  if (v == null || typeof v === "boolean" || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) && n >= 0 ? n : null;
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
export function athleteValue(a: Record<string, unknown>, joint: string, laterality?: string | null, dominant?: Dominant, policy: OneSidePolicy = ONE_SIDE_MISSING_POLICY): number | null {
  if (joint in BILATERAL) {
    const [lk, rk] = BILATERAL[joint];
    const l = toNum(a[lk]), r = toNum(a[rk]);
    const vs = [l, r].filter((x): x is number => x != null);
    if (!vs.length) return null;
    const rule = String(laterality ?? "").toUpperCase();
    const dom = normalizeDominant(dominant);
    const strict = policy === "grey";
    if (rule === "ANY") return strict && vs.length < 2 ? null : Math.max(...vs);
    if ((rule === "LEAD" || rule === "HOOK" || rule === "TRAIL") && dom) {
      const wantDominant = rule === "LEAD";
      const wanted = (dom === "left") === wantDominant ? l : r; // left-dominant + LEAD -> left; left-dominant + HOOK/TRAIL -> right
      if (wanted != null) return wanted;
      return strict ? null : Math.min(...vs);
    }
    return strict && vs.length < 2 ? null : Math.min(...vs);
  }
  if (joint in SINGLE) return toNum(a[SINGLE[joint]]);
  return null;
}

// Same side selection for a joint that is already colored per leg (hip flexion straight-leg raise: Status per leg).
export function pickLegStatus(left: Status, right: Status, laterality?: string | null, dominant?: Dominant, policy: OneSidePolicy = ONE_SIDE_MISSING_POLICY): Status {
  const rank: Record<string, number> = { GREEN: 0, YELLOW: 1, RED: 2 };
  const strict = policy === "grey";
  const rule = String(laterality ?? "").toUpperCase();
  const dom = normalizeDominant(dominant);
  const both = [left, right].filter(x => x !== "GREY");
  if (!both.length) return "GREY";
  if ((rule === "LEAD" || rule === "HOOK" || rule === "TRAIL") && dom) {
    const wanted = (dom === "left") === (rule === "LEAD") ? left : right;
    if (wanted !== "GREY") return wanted;
    return strict ? "GREY" : both.reduce((w, x) => (rank[x] > rank[w] ? x : w), both[0]);
  }
  if (strict && both.length < 2) return "GREY";
  if (rule === "ANY") return both.reduce((b, x) => (rank[x] < rank[b] ? x : b), both[0]);
  return both.reduce((w, x) => (rank[x] > rank[w] ? x : w), both[0]);
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
  no_reference?: boolean; // bar is far above the healthy average (hip_er) or the number is unsourced / contradicted: no reference range yet
  unsourced?: boolean; // the number is marked in rom_number_source_status (Quinn BB peer review); implies no_reference
};

// Build the requirement list for one move. matrixRows come from rom_thresholds (documented). techniqueRow is the
// legacy techniques row, used only for joints the matrix has no number for (kept, not invented).
export function buildRequirements(
  matrixRows: { joint: string; required_value: unknown; laterality_rule?: string | null }[],
  techniqueRow?: Record<string, unknown> | null,
  sourceMarks?: SourceMark[] | null,
  marksEnabled: boolean = UNSOURCED_GREY_SWITCH, // tests flip this per call; production uses the constant
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
  // Legal: a hip rotation bar far above the healthy average has no reference range yet (stricter-row rule already applied).
  for (const q of byJoint.values()) if (isNoReferenceBar(q.joint, q.required)) q.no_reference = true;
  // Quinn BB peer review: a number marked unsourced / contradicted has no reference range yet (only while the number still matches).
  if (marksEnabled && sourceMarks?.length) {
    for (const q of byJoint.values()) {
      const hit = sourceMarks.some(m => normalizeJoint(m.joint) === q.joint && toNum(m.app_value) === q.required);
      if (hit) { q.unsourced = true; q.no_reference = true; }
    }
  }
  return [...byJoint.values()];
}

// basis "slr_norm" marks a joint colored from the Base straight-leg norm table instead of the move's own number (flagged,
// PENDING JIM: HIP_FLEX_MOVES_USE_SLR_COLOR in base_norms.ts). Names and colors only; no degrees.
export type JointStatus = { joint: string; status: Status; basis?: "slr_norm" };
export type JointOverrides = Partial<Record<string, { basis: "slr_norm"; left: Status; right: Status }>>;
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
export function classifyMove(a: Record<string, unknown>, reqs: Requirement[], dominant?: Dominant, overrides?: JointOverrides, markBeatsSlr: boolean = UNSOURCED_MARK_BEATS_SLR_OVERRIDE): MoveResult {
  if (reqs.length === 0) return { tier: "GREY", grey_reason: "no_rule", joint_status: [], limiting: [] };
  const joint_status: JointStatus[] = [];
  const limiting: string[] = [];
  let noRef = false; // some required joint has no reference range yet (hip rotation bar, ankle degree-style bar)
  for (const r of reqs) {
    const ov = overrides?.[r.joint];
    if (ov && !(r.unsourced && markBeatsSlr)) {
      const st = pickLegStatus(ov.left, ov.right, r.laterality, dominant);
      joint_status.push({ joint: r.joint, status: st, basis: ov.basis });
      if (st === "GREY") limiting.push(`${r.joint}:slr_not_rated`);
      else if (st !== "GREEN") limiting.push(`${r.joint}:slr_norm`);
      continue;
    }
    if (r.unit_pending) {
      joint_status.push({ joint: r.joint, status: "GREY" });
      limiting.push(`${r.joint}:cm_requirement_pending`);
      noRef = true;
      continue;
    }
    if (r.no_reference) {
      joint_status.push({ joint: r.joint, status: "GREY" });
      limiting.push(`${r.joint}:no_reference_range`);
      noRef = true;
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
  // Only a RED is conclusive when a joint is unmeasured (a YELLOW could still end up RED once measured, and a move that
  // cannot be fully judged is "Not rated"). GREY_BEATS_YELLOW = Quinn's reference and Jim's "missing joint = GREY".
  // no_reference_range wins over incomplete: such a move cannot be rated even after every joint is measured.
  const greyReason: GreyReason = noRef ? "no_reference_range" : "incomplete";
  if (GREY_BEATS_YELLOW && has("GREY")) return { tier: "GREY", grey_reason: greyReason, joint_status, limiting };
  if (has("YELLOW")) return { tier: "YELLOW", grey_reason: null, joint_status, limiting };
  if (has("GREY")) return { tier: "GREY", grey_reason: greyReason, joint_status, limiting };
  return { tier: "GREEN", grey_reason: null, joint_status, limiting: [] };
}
