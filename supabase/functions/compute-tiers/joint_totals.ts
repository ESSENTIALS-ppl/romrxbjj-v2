// Base joint totals for compute-tiers (pure, no Deno/Supabase imports so it can be unit tested in node).
// rom_total (the /100 average stored on the assessment) and worst_joints (the weak spots ROMBot and the protocol read).
//
// HIP_FLEX_UNSCORED (Jim closed this, Oct 3 2026): hip flexion (straight-leg raise) is NEVER judged against 120 (unreachable,
// the average man is about 68). While true it is stored and shown per leg but left out of rom_total and worst_joints.
// Set to false to restore the old behavior. Retired when the sex-specific norm engine (romrxbjj-v2 #74) ships.
// Mirrors: romrx-io-web mobilityBands.ts HIP_FLEX_UNSCORED_FALLBACK, SQL c_hip_flex_unscored (compute_joint_scores) and
// cfg.hip_flex_unscored (protocol_joint_ranking), submit-lead-assessment/email.ts HIP_FLEX_UNSCORED.
export const HIP_FLEX_UNSCORED = true;

/** True for hip_flex, hip_flex_l and hip_flex_r while HIP_FLEX_UNSCORED. */
export function isUnscoredJoint(key: string): boolean {
  return HIP_FLEX_UNSCORED && key.replace(/_(l|r)$/, "") === "hip_flex";
}

type ToNum = (v: unknown) => number | null;

// T1 (Jim, Oct 21 2026 10:53 AM ET, "T1: A plus C"; Quinn narrow-bands-options.md).
// A: narrow joints get a buffer E below each cutoff; a reading inside the buffer gets the better color.
//   Steady if worse + E >= target, Building if worse + E >= 0.9 x target, else Needs focus. Values are stored as entered.
// C: Protocol order (worst_joints) weights a narrow-joint gap 0.5 until this assessment and the previous one show the
//   same band for that joint, then 1. No user step, no copy, never a retest hint (ledger L655).
// Mirrors romrx-io-web mobilityBands.ts NARROW_BAND_BUFFER / bandScoreForJoint / weightedJointGap and SQL
// public.t1_joint_band() / public.t1_gap_weight() (migration 20261021150000_t1_narrow_bands.sql).
export const NARROW_BAND_BUFFER: Readonly<Record<string, number>> = {
  cervical_rot: 5, cervical_lat: 5, cervical_flex: 5, cervical_ext: 5,
  hip_er: 5, hip_ir: 5, hip_abd: 5, shoulder_er: 5, ankle_df: 1,
};
export const NARROW_GAP_WEIGHT = 0.5;

export function narrowBuffer(key: string): number {
  return NARROW_BAND_BUFFER[key.replace(/_(l|r)$/, "")] ?? 0;
}

const fx = (n: number) => Math.round(n * 1e6);

/** Base band 1 | 2 | 3 for one value, T1 option A. E = 0 keeps the old ratio rule exactly. */
export function bandForJoint(key: string, worse: number, target: number): 1 | 2 | 3 {
  if (!(target > 0) || !Number.isFinite(worse)) return 1;
  const e = narrowBuffer(key);
  if (e === 0) {
    const r = worse / target;
    return r >= 1.0 ? 3 : r >= 0.9 ? 2 : 1;
  }
  const adj = fx(worse + e);
  if (adj >= fx(target)) return 3;
  if (adj * 10 >= fx(target) * 9) return 2;
  return 1;
}

/** T1 option C weighted gap: 0 when Steady, else (1 - min(1, worse/target)) x weight. */
export function weightedGap(key: string, worse: number, target: number, prevWorse?: number | null): number {
  const band = bandForJoint(key, worse, target);
  if (band === 3) return 0;
  const gap = 1 - Math.min(1, Math.max(0, worse / target));
  if (narrowBuffer(key) === 0) return gap;
  const prevBand = prevWorse == null || !Number.isFinite(prevWorse) ? null : bandForJoint(key, prevWorse, target);
  return gap * (prevBand != null && prevBand === band ? 1 : NARROW_GAP_WEIGHT);
}

/** Weak spots, worst first by T1 weighted gap. `prev` = the user's previous assessment (null = first one). */
export function worstJointKeys(
  a: Record<string, unknown>,
  targets: Record<string, number>,
  toNum: ToNum,
  limit = 5,
  prev: Record<string, unknown> | null = null,
): string[] {
  const rows: { key: string; gap: number }[] = [];
  for (const [key, target] of Object.entries(targets)) {
    if (isUnscoredJoint(key)) continue;
    const num = toNum(a[key]);
    if (num == null) continue;
    rows.push({ key, gap: weightedGap(key, num, target, prev ? toNum(prev[key]) : null) });
  }
  rows.sort((x, y) => y.gap - x.gap);
  return rows.slice(0, limit).map(r => r.key);
}

export function romTotal(a: Record<string, unknown>, targets: Record<string, number>, toNum: ToNum): number {
  const pcts: number[] = [];
  for (const [key, target] of Object.entries(targets)) {
    if (isUnscoredJoint(key)) continue;
    const num = toNum(a[key]);
    if (num == null) continue;
    pcts.push(Math.max(0, Math.min(1, num / target)) * 100);
  }
  if (pcts.length === 0) return 0;
  return Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
}
