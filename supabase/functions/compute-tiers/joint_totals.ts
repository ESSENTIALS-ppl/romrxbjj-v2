// Base joint totals for compute-tiers (pure, no Deno/Supabase imports so it can be unit tested in node).
// rom_total (the /100 average stored on the assessment) and worst_joints (the weak spots ROMBot and the protocol read).
//
// FG-36 (Nov 2 2026): the HIP_FLEX_UNSCORED constant is REMOVED. Hip flexion is scored (all 10 Base joints) for assessments created at
// or after the DB cutover public.scoring_cutovers['hip_flex_scored']. index.ts reads the cutover and passes opts.hipFlexScored per
// assessment; older assessments (and any failure to read the cutover) are left exactly as stored, so past rom_total / worst_joints
// never change and recompute never writes hip flexion onto a pre-cutover assessment.
//
// ONE swappable config for the target: hipFlexTarget(). Jim 5:56 PM CT Nov 2 2026: 120 ("what this app is for IDENTIFYING WHAT NEEDS
// FOCUS"). To adopt the Oct 3 sex-specific table later, change ONLY this function (sex = users.gender, null = unknown). Mirrors:
// SQL public.hip_flex_target(), Base app hipFlexTarget() in mobilityBands.ts.
export const HIP_FLEX_TARGET_DEFAULT = 120;
export function hipFlexTarget(_sex: string | null = null): number {
  return HIP_FLEX_TARGET_DEFAULT;
}
export interface ScoreOpts { hipFlexScored?: boolean; sex?: string | null }

/** Targets for one assessment: hip_flex_l/r use hipFlexTarget() when this assessment is scored. */
export function targetsFor(base: Record<string, number>, opts: ScoreOpts = {}): Record<string, number> {
  if (!opts.hipFlexScored) return base;
  const t = { ...base };
  for (const k of ["hip_flex_l", "hip_flex_r"]) if (k in t) t[k] = hipFlexTarget(opts.sex ?? null);
  return t;
}

/** True for hip_flex, hip_flex_l and hip_flex_r on a PRE-cutover assessment only (left out so the past is unchanged). */
export function isUnscoredJoint(key: string, opts: ScoreOpts = {}): boolean {
  if (opts.hipFlexScored) return false;
  return key.replace(/_(l|r)$/, "") === "hip_flex";
}

type ToNum = (v: unknown) => number | null;

// T1 narrow bands (A buffer + C weighting): the per-joint config and rules live in ../_shared/t1_narrow_bands.ts.
import { weightedGap } from "../_shared/t1_narrow_bands.ts";
export { bandForJoint, isNarrowJoint, NARROW_BAND_CONFIG, NARROW_GAP_WEIGHT, narrowBuffers, weightedGap } from "../_shared/t1_narrow_bands.ts";

/** Lumbar (low back) step removed from Base; saved values are never ranked as weak spots. Mirrors romrx-io-web lumbarFlag.ts. */
export function isLumbarKey(key: string): boolean {
  return key === "lumbar_flex" || key === "lumbar_ext";
}

/** Weak spots, worst first by T1 weighted gap. `prev` = the user's previous assessment (null = first one). */
export function worstJointKeys(
  a: Record<string, unknown>,
  targets: Record<string, number>,
  toNum: ToNum,
  limit = 5,
  prev: Record<string, unknown> | null = null,
  opts: ScoreOpts = {},
): string[] {
  targets = targetsFor(targets, opts);
  const rows: { key: string; gap: number }[] = [];
  for (const [key, target] of Object.entries(targets)) {
    if (isUnscoredJoint(key, opts)) continue;
    if (isLumbarKey(key)) continue; // Grant Oct 21 2026 7:10 PM: low back never ranked (saved values kept; romTotal unchanged)
    const num = toNum(a[key]);
    if (num == null) continue;
    rows.push({ key, gap: weightedGap(key, num, target, prev ? toNum(prev[key]) : null) });
  }
  rows.sort((x, y) => y.gap - x.gap);
  return rows.slice(0, limit).map(r => r.key);
}

export function romTotal(a: Record<string, unknown>, targets: Record<string, number>, toNum: ToNum, opts: ScoreOpts = {}): number {
  targets = targetsFor(targets, opts);
  const pcts: number[] = [];
  for (const [key, target] of Object.entries(targets)) {
    if (isUnscoredJoint(key, opts)) continue;
    if (isLumbarKey(key)) continue; // Grant Oct 21 2026 7:20 PM: lumbar out of the overall (rom_total)
    const num = toNum(a[key]);
    if (num == null) continue;
    pcts.push(Math.max(0, Math.min(1, num / target)) * 100);
  }
  if (pcts.length === 0) return 0;
  return Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
}
