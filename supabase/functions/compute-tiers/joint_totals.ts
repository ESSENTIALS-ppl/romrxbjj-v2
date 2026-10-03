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

export function worstJointKeys(a: Record<string, unknown>, targets: Record<string, number>, toNum: ToNum, limit = 5): string[] {
  const rows: { key: string; pct: number }[] = [];
  for (const [key, target] of Object.entries(targets)) {
    if (isUnscoredJoint(key)) continue;
    const num = toNum(a[key]);
    if (num == null) continue;
    rows.push({ key, pct: Math.max(0, Math.min(1, num / target)) });
  }
  rows.sort((x, y) => x.pct - y.pct);
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
