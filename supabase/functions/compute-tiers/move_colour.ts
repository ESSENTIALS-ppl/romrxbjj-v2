// Move colour rule for technique eligibility (pure, no Deno/Supabase imports so it can be unit tested).
// Jim, closed Oct 3 2026 (ledger L128, L129, L135):
//   L128: move color = WORST measured required joint. Missing joint or no rule = grey "Not rated", NEVER GREEN.
//   L129: YELLOW = within a flat 10 degrees below the minimum (ankle: 2 cm), NOT the 90% ratio.
//   L135: recompute_user_eligibility (SQL) uses this same rule. Mirror: migration 20261020180000_eligibility_colour_flat10_grey.sql.
// Scope: technique eligibility only. Base bands (compute_joint_scores, mobilityBands.ts) are NOT touched here.

export const YELLOW_MARGIN_DEG = 10;
export const YELLOW_MARGIN_ANKLE_CM = 2;
export function yellowMargin(joint: string): number {
  return joint === "ankle_df" ? YELLOW_MARGIN_ANKLE_CM : YELLOW_MARGIN_DEG;
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
const EVALUABLE = new Set([...Object.keys(BILATERAL), ...Object.keys(SINGLE)]);

export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
}

// Worse side for bilateral joints (unchanged from v40).
export function athleteValue(a: Record<string, unknown>, joint: string): number | null {
  if (joint in BILATERAL) {
    const [l, r] = BILATERAL[joint];
    const vs = [toNum(a[l]), toNum(a[r])].filter((x): x is number => x != null);
    return vs.length ? Math.min(...vs) : null;
  }
  if (joint in SINGLE) return toNum(a[SINGLE[joint]]);
  return null;
}

export type Tier = "GREEN" | "YELLOW" | "RED" | "GREY";
export type LimitingJoint = { joint: string; value: number | null; min: number; gap?: number; reason?: string };
export type TierResult = { tier: Tier; limiting: LimitingJoint[] };

// 3 = GREEN, 2 = YELLOW, 1 = RED for one measured joint.
export function jointColour(value: number, min: number, joint: string): 1 | 2 | 3 {
  if (value >= min) return 3;
  return min - value <= yellowMargin(joint) ? 2 : 1;
}

export function classify(a: Record<string, unknown>, technique: Record<string, unknown>): TierResult {
  const required: { joint: string; thresh: number }[] = [];
  for (const [col, val] of Object.entries(technique)) {
    if (!col.endsWith("_min")) continue;
    const thresh = toNum(val);
    if (thresh == null || thresh === 0) continue;
    const joint = col.slice(0, -4);
    if (!EVALUABLE.has(joint)) continue;
    required.push({ joint, thresh });
  }
  // L128: no rule = grey Not rated, never green.
  if (required.length === 0) return { tier: "GREY", limiting: [] };

  const missing: LimitingJoint[] = [];
  const short: (LimitingJoint & { c: 1 | 2 })[] = [];
  let worst: 1 | 2 | 3 = 3;
  for (const { joint, thresh } of required) {
    const av = athleteValue(a, joint);
    if (av == null) {
      missing.push({ joint, value: null, min: thresh, reason: "not_measured" });
      continue;
    }
    const c = jointColour(av, thresh, joint);
    if (c < worst) worst = c;
    if (c < 3) short.push({ joint, value: av, min: thresh, gap: Math.round((thresh - av) * 10) / 10, c: c as 1 | 2 });
  }
  // L128: any required joint not measured = grey Not rated, never green.
  if (missing.length) return { tier: "GREY", limiting: missing };
  const strip = (x: LimitingJoint & { c: number }): LimitingJoint => ({ joint: x.joint, value: x.value, min: x.min, gap: x.gap });
  if (worst === 1) return { tier: "RED", limiting: short.filter(x => x.c === 1).map(strip) };
  if (worst === 2) return { tier: "YELLOW", limiting: short.map(strip) };
  return { tier: "GREEN", limiting: [] };
}
